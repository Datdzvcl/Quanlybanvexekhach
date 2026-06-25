using BaseCore.APIService.Controllers;
using BaseCore.Common;
using BaseCore.Repository;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.APIService.Services
{
    public class TripMonitorService : BackgroundService
    {
        private readonly IServiceProvider _services;
        private readonly ILogger<TripMonitorService> _logger;

        // Ngưỡng thời gian
        private static readonly TimeSpan WarnAfter       = TimeSpan.FromMinutes(30);  // gửi cảnh báo sau 30 phút trễ
        private static readonly TimeSpan CancelScheduled = TimeSpan.FromHours(3);     // hủy Scheduled sau 3 giờ không phản hồi
        private static readonly TimeSpan CancelDelayed   = TimeSpan.FromHours(2);     // hủy Delayed sau 2 giờ quá giờ mới

        public TripMonitorService(IServiceProvider services, ILogger<TripMonitorService> logger)
        {
            _services = services;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RunCheckAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "TripMonitorService error");
                }
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
        }

        private async Task RunCheckAsync()
        {
            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MySqlDbContext>();
            var now = DateTime.Now;

            // ── 1. Scheduled quá 30 phút → gửi cảnh báo (1 lần, chưa hủy) ───────────
            var warnThreshold   = now - WarnAfter;
            var cancelThreshold = now - CancelScheduled;

            var lateScheduled = await db.Trips
                .Include(t => t.Bus)
                .Where(t => t.Status == TripStatusConstant.Scheduled
                         && t.DepartureTime <= warnThreshold)
                .ToListAsync();

            foreach (var trip in lateScheduled)
            {
                var overMin = (int)(now - trip.DepartureTime).TotalMinutes;

                if (trip.DepartureTime <= cancelThreshold)
                {
                    // Quá 3 giờ không ai phản hồi → Auto Cancelled
                    await CancelTripAsync(db, trip, now, "Chuyến xe bị hủy do không khởi hành sau 3 giờ chờ.");
                    _logger.LogInformation("Auto-cancelled trip {TripID} (scheduled, {Over}h overdue)", trip.TripID, overMin / 60);
                }
                else
                {
                    // 30 phút – 3 giờ → chỉ gửi cảnh báo (không đổi status)
                    var alreadyWarned = await db.Notifications
                        .AnyAsync(n => n.Link == "/driver"
                                    && n.Title == "Chuyến xe chưa khởi hành"
                                    && n.Message!.Contains($"#{trip.TripID}")
                                    && n.CreatedAt >= now.AddHours(-3));
                    if (!alreadyWarned)
                    {
                        await SendWarningAsync(db, trip, overMin);
                        _logger.LogInformation("Sent late warning for trip {TripID} ({Over}min overdue)", trip.TripID, overMin);
                    }
                }
            }

            // ── 2. Delayed quá giờ mới 2 giờ → Auto Cancelled ───────────────────────
            var lateDelayed = await db.Trips
                .Include(t => t.Bus)
                .Where(t => t.Status == TripStatusConstant.Delayed
                         && t.DelayedDepartureTime != null
                         && t.DelayedDepartureTime <= now - CancelDelayed)
                .ToListAsync();

            foreach (var trip in lateDelayed)
            {
                await CancelTripAsync(db, trip, now, "Chuyến xe bị hủy do không khởi hành sau 2 giờ kể từ giờ dự kiến mới.");
                _logger.LogInformation("Auto-cancelled delayed trip {TripID}", trip.TripID);
            }

            await db.SaveChangesAsync();
        }

        private static async Task SendWarningAsync(MySqlDbContext db, Entities.Trip trip, int overMin)
        {
            // Cảnh báo tài xế
            if (trip.DriverID.HasValue)
            {
                NotificationsController.AddNotification(db, trip.DriverID.Value,
                    "Chuyến xe chưa khởi hành",
                    $"[#{trip.TripID}] Chuyến {trip.DepartureLocation}→{trip.ArrivalLocation} đã trễ {overMin} phút. Vui lòng bắt đầu chuyến hoặc báo trễ.",
                    2, "/driver");
            }

            // Cảnh báo nhà xe
            if (trip.Bus?.OperatorID != null)
            {
                var opUser = await db.Users
                    .Where(u => u.OperatorID == trip.Bus.OperatorID && u.Role == RoleConstant.Operator)
                    .Select(u => new { u.UserID })
                    .FirstOrDefaultAsync();
                if (opUser != null)
                {
                    NotificationsController.AddNotification(db, opUser.UserID,
                        "Chuyến xe chưa khởi hành",
                        $"Chuyến #{trip.TripID} ({trip.DepartureLocation}→{trip.ArrivalLocation}) đã trễ {overMin} phút.",
                        2, "/operator/trips");
                }
            }
        }

        private static async Task CancelTripAsync(MySqlDbContext db, Entities.Trip trip, DateTime now, string reason)
        {
            trip.Status = TripStatusConstant.Cancelled;

            var bookings = await db.Bookings
                .Where(b => b.TripID == trip.TripID
                         && b.BookingStatus != BookingStatusConstant.Cancelled
                         && b.BookingStatus != BookingStatusConstant.Completed
                         && b.PaymentStatus  != PaymentStatusConstant.Refunded)
                .ToListAsync();

            int pendingRefundCount = 0;
            foreach (var b in bookings)
            {
                b.BookingStatus = BookingStatusConstant.Cancelled;
                if (b.PaymentStatus == PaymentStatusConstant.Paid)
                {
                    b.PaymentStatus = PaymentStatusConstant.PendingRefund;
                    pendingRefundCount++;
                    NotificationsController.AddNotification(db, b.UserID,
                        "Chuyến xe bị hủy tự động — chờ hoàn tiền",
                        $"Đơn #{b.BookingID}: {reason} Yêu cầu hoàn tiền đang chờ Admin xử lý.",
                        4, $"/my-tickets/{b.BookingID}");
                }
                else
                {
                    NotificationsController.AddNotification(db, b.UserID,
                        "Chuyến xe bị hủy tự động",
                        $"Đơn #{b.BookingID}: {reason}",
                        4, $"/my-tickets/{b.BookingID}");
                }
            }

            // Thông báo tài xế
            if (trip.DriverID.HasValue)
                NotificationsController.AddNotification(db, trip.DriverID.Value,
                    "Chuyến xe đã bị hủy tự động",
                    $"Chuyến {trip.DepartureLocation}→{trip.ArrivalLocation} ngày {trip.DepartureTime:dd/MM/yyyy} đã bị hủy do quá giờ.",
                    3, null);

            // Thông báo nhà xe
            if (trip.Bus?.OperatorID != null)
            {
                var opUser = await db.Users
                    .Where(u => u.OperatorID == trip.Bus.OperatorID && u.Role == RoleConstant.Operator)
                    .Select(u => new { u.UserID })
                    .FirstOrDefaultAsync();
                if (opUser != null)
                    NotificationsController.AddNotification(db, opUser.UserID,
                        "Chuyến xe bị hủy tự động",
                        $"Chuyến #{trip.TripID} ({trip.DepartureLocation}→{trip.ArrivalLocation}) đã bị hủy tự động. {pendingRefundCount} vé đang chờ Admin duyệt hoàn tiền.",
                        3, "/operator/trips");
            }

            // Thông báo admin
            if (pendingRefundCount > 0)
            {
                var adminUsers = await db.Users
                    .Where(u => u.Role == RoleConstant.Admin)
                    .Select(u => new { u.UserID })
                    .ToListAsync();
                foreach (var admin in adminUsers)
                    NotificationsController.AddNotification(db, admin.UserID,
                        "Cần duyệt hoàn tiền",
                        $"Chuyến #{trip.TripID} bị hủy tự động. {pendingRefundCount} vé cần Admin duyệt hoàn tiền.",
                        3, "/admin/bookings");
            }
        }
    }
}
