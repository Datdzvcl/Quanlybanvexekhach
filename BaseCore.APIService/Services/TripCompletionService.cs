// BaseCore.APIService/Services/TripCompletionService.cs
using Microsoft.EntityFrameworkCore;
using BaseCore.Repository;
using BaseCore.Common;

namespace BaseCore.APIService.Services
{
    public class TripCompletionService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<TripCompletionService> _logger;

        public TripCompletionService(
            IServiceScopeFactory scopeFactory,
            ILogger<TripCompletionService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("TripCompletionService started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await DoWork();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "TripCompletionService error.");
                }

                // Chạy mỗi 5 phút
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
        }

        private async Task DoWork()
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MySqlDbContext>();
            var now = DateTime.Now;

            // ── BƯỚC 1: Trip Ongoing đã qua ArrivalTime → Completed ──
            var tripsToComplete = await db.Trips
                .Where(t => t.Status == TripStatusConstant.Ongoing
                         && t.ArrivalTime <= now)
                .ToListAsync();

            foreach (var trip in tripsToComplete)
                trip.Status = TripStatusConstant.Completed;

            if (tripsToComplete.Count > 0)
            {
                _logger.LogInformation(
                    "TripCompletionService: {Count} trip(s) marked Completed.", tripsToComplete.Count);
            }

            // ── BƯỚC 2: Trip Scheduled (chưa ai chuyển sang Ongoing) đã qua ArrivalTime → Completed ──
            // Trường hợp operator không bấm "Ongoing" — vẫn tự hoàn thành
            var tripsScheduledDone = await db.Trips
                .Where(t => t.Status == TripStatusConstant.Scheduled
                         && t.ArrivalTime <= now)
                .ToListAsync();

            foreach (var trip in tripsScheduledDone)
                trip.Status = TripStatusConstant.Completed;

            if (tripsScheduledDone.Count > 0)
            {
                _logger.LogInformation(
                    "TripCompletionService: {Count} scheduled trip(s) auto-completed.", tripsScheduledDone.Count);
            }

            // ── BƯỚC 3: Booking Confirmed thuộc trip Completed → Booking Completed ──
            var bookingsToComplete = await db.Bookings
                .Include(b => b.Trip)
                .Where(b => b.BookingStatus == BookingStatusConstant.Confirmed
                         && b.Trip != null
                         && b.Trip.ArrivalTime <= now
                         && (b.Trip.Status == TripStatusConstant.Completed
                          || b.Trip.Status == TripStatusConstant.Ongoing))
                .ToListAsync();

            foreach (var booking in bookingsToComplete)
                booking.BookingStatus = BookingStatusConstant.Completed;

            if (bookingsToComplete.Count > 0)
            {
                _logger.LogInformation(
                    "TripCompletionService: {Count} booking(s) marked Completed.", bookingsToComplete.Count);
            }

            if (tripsToComplete.Count > 0
             || tripsScheduledDone.Count > 0
             || bookingsToComplete.Count > 0)
            {
                await db.SaveChangesAsync();
            }
        }
    }
}