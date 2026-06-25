using BaseCore.Repository;
using Microsoft.EntityFrameworkCore;
using BaseCore.Common;
namespace BaseCore.APIService.Services
{
    /// <summary>
    /// Background job chạy mỗi 2 phút, tìm và xóa các booking Pending
    /// đã quá 10 phút kể từ BookingDate (tương ứng thời gian giữ chỗ frontend).
    /// Khi xóa: hoàn lại AvailableSeats cho Trip, xóa TicketSeats liên quan.
    /// </summary>
    public class ExpiredBookingCleanupService : BackgroundService
    {
        // Bao lâu chạy 1 lần
        private static readonly TimeSpan RunInterval  = TimeSpan.FromMinutes(2);

        // Booking Pending quá bao lâu thì bị xóa (khớp với HOLD_DURATION ở frontend)
        private static readonly TimeSpan HoldDuration = TimeSpan.FromMinutes(20);

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<ExpiredBookingCleanupService> _logger;

        public ExpiredBookingCleanupService(
            IServiceScopeFactory scopeFactory,
            ILogger<ExpiredBookingCleanupService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger       = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("ExpiredBookingCleanupService đã khởi động.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CleanupAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Lỗi khi dọn booking hết hạn.");
                }

                // Chờ đến chu kỳ tiếp theo
                await Task.Delay(RunInterval, stoppingToken);
            }
        }

        // private async Task CleanupAsync(CancellationToken ct)
        // {
        //     // Mỗi lần chạy tạo scope mới để lấy DbContext (vì DbContext là Scoped)
        //     using var scope   = _scopeFactory.CreateScope();
        //     var context       = scope.ServiceProvider.GetRequiredService<MySqlDbContext>();

        //     var cutoff        = DateTime.Now - HoldDuration;

        //     // Lấy tất cả booking Pending quá hạn
        //     var expired = await context.Bookings
        //         .Include(b => b.TicketSeats)
        //         .Where(b =>
        //             b.BookingStatus == BookingStatusConstant.Pending && 
        //             b.BookingDate.HasValue &&
        //             b.BookingDate.Value < cutoff)
        //         .ToListAsync(ct);

        //     if (!expired.Any())
        //     {
        //         _logger.LogDebug("Không có booking hết hạn.");
        //         return;
        //     }

        //     _logger.LogInformation("Tìm thấy {Count} booking hết hạn, đang xóa...", expired.Count);

        //     foreach (var booking in expired)
        //     {
        //         // Hoàn lại ghế cho chuyến xe
        //         var trip = await context.Trips.FindAsync(new object[] { booking.TripID }, ct);
        //         if (trip != null)
        //             trip.AvailableSeats += booking.TotalSeats;

        //         // Xóa TicketSeats (cascade nên có thể tự xóa, nhưng explicit cho chắc)
        //         if (booking.TicketSeats != null && booking.TicketSeats.Any())
        //             context.TicketSeats.RemoveRange(booking.TicketSeats);

        //         context.Bookings.Remove(booking);

        //         _logger.LogInformation(
        //             "Đã xóa BookingID={Id}, TripID={TripId}, Ghế trả lại={Seats}",
        //             booking.BookingID, booking.TripID, booking.TotalSeats);
        //     }

        //     await context.SaveChangesAsync(ct);
        //     _logger.LogInformation("Hoàn tất dọn {Count} booking.", expired.Count);
        // }
        // private async Task CleanupAsync(CancellationToken ct)
        // {
        //     using var scope   = _scopeFactory.CreateScope();
        //     var context       = scope.ServiceProvider.GetRequiredService<MySqlDbContext>();

        //     var cutoff        = DateTime.Now - HoldDuration;

        //     var expired = await context.Bookings
        //         .Include(b => b.TicketSeats)
        //         .Where(b =>
        //             b.BookingStatus == BookingStatusConstant.Pending && 
        //             b.BookingDate.HasValue &&
        //             b.BookingDate.Value < cutoff)
        //         .ToListAsync(ct);

        //     if (!expired.Any())
        //     {
        //         _logger.LogDebug("Không có booking hết hạn.");
        //         return;
        //     }

        //     _logger.LogInformation("Tìm thấy {Count} booking hết hạn, đang xóa...", expired.Count);

        //     // Xóa Reviews liên quan trước
        //     var expiredIds = expired.Select(b => b.BookingID).ToList();
        //     var reviews = await context.Reviews
        //         .Where(r => expiredIds.Contains(r.BookingID))
        //         .ToListAsync(ct);
        //     if (reviews.Any())
        //         context.Reviews.RemoveRange(reviews);

        //     foreach (var booking in expired)
        //     {
        //         var trip = await context.Trips.FindAsync(new object[] { booking.TripID }, ct);
        //         if (trip != null)
        //             trip.AvailableSeats += booking.TotalSeats;

        //         if (booking.TicketSeats != null && booking.TicketSeats.Any())
        //             context.TicketSeats.RemoveRange(booking.TicketSeats);

        //         context.Bookings.Remove(booking);

        //         _logger.LogInformation(
        //             "Đã xóa BookingID={Id}, TripID={TripId}, Ghế trả lại={Seats}",
        //             booking.BookingID, booking.TripID, booking.TotalSeats);
        //     }

        //     await context.SaveChangesAsync(ct);
        //     _logger.LogInformation("Hoàn tất dọn {Count} booking.", expired.Count);
        // }
        private async Task CleanupAsync(CancellationToken ct)
        {
            using var scope   = _scopeFactory.CreateScope();
            var context       = scope.ServiceProvider.GetRequiredService<MySqlDbContext>();

            var cutoff        = DateTime.Now - HoldDuration;

            var expired = await context.Bookings
                .Include(b => b.TicketSeats)
                .Where(b =>
                    b.BookingStatus == BookingStatusConstant.Pending &&
                    b.PaymentMethod != "Cash" &&   // Cash booking giữ đến khi thu tiền trực tiếp
                    b.BookingDate.HasValue &&
                    b.BookingDate.Value < cutoff)
                .ToListAsync(ct);

            if (!expired.Any())
            {
                _logger.LogDebug("Không có booking hết hạn.");
                return;
            }

            _logger.LogInformation("Tìm thấy {Count} booking hết hạn, đang xóa...", expired.Count);

            var expiredIds = expired.Select(b => b.BookingID).ToList();

            // 1. Xóa Reviews trước
            var reviews = await context.Reviews
                .Where(r => expiredIds.Contains(r.BookingID))
                .ToListAsync(ct);
            if (reviews.Any())
                context.Reviews.RemoveRange(reviews);

            // 2. Null hóa BookingID trong SeatHolds
            var seatHolds = await context.SeatHolds
                .Where(s => s.BookingID.HasValue && expiredIds.Contains(s.BookingID.Value))
                .ToListAsync(ct);
            foreach (var sh in seatHolds)
                sh.BookingID = null;

            foreach (var booking in expired)
            {
                var trip = await context.Trips.FindAsync(new object[] { booking.TripID }, ct);
                if (trip != null)
                    trip.AvailableSeats += booking.TotalSeats;

                // 3. Xóa TicketSeats
                if (booking.TicketSeats != null && booking.TicketSeats.Any())
                    context.TicketSeats.RemoveRange(booking.TicketSeats);

                // 4. Xóa Booking
                context.Bookings.Remove(booking);

                _logger.LogInformation(
                    "Đã xóa BookingID={Id}, TripID={TripId}, Ghế trả lại={Seats}",
                    booking.BookingID, booking.TripID, booking.TotalSeats);
            }

            await context.SaveChangesAsync(ct);
            _logger.LogInformation("Hoàn tất dọn {Count} booking.", expired.Count);
        }
    }
}
