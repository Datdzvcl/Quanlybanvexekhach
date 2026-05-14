using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Repository;
using BaseCore.Entities;
using System.Data;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [Route("api/seats")]
    [ApiController]
    public class SeatsController : ControllerBase
    {
        private readonly MySqlDbContext _context;

        public SeatsController(MySqlDbContext context)
        {
            _context = context;
        }

        [HttpGet("trip/{tripId:int}")]
        public async Task<IActionResult> GetTripSeats(int tripId, [FromQuery] string? sessionId = null)
        {
            var trip = await _context.Trips
                .AsNoTracking()
                .Include(x => x.Bus)
                .Where(x => x.TripID == tripId)
                .Select(x => new
                {
                    x.TripID,
                    Capacity = x.Bus != null ? x.Bus.Capacity : 0
                })
                .FirstOrDefaultAsync();

            if (trip == null)
                return NotFound(new { message = "Không tìm thấy chuyến xe" });

            var capacity = Math.Max(trip.Capacity, 0);
            var seatLabels = GenerateSeatLabels(capacity);
            var currentUserId = GetCurrentUserId();
            var now = DateTime.Now;

            var bookedSeats = await _context.TicketSeats
                .AsNoTracking()
                .Include(x => x.Booking)
                .Where(x =>
                    x.Booking != null &&
                    x.Booking.TripID == tripId &&
                    (x.Booking.PaymentStatus == null || x.Booking.PaymentStatus != "Cancelled"))
                .Select(x => x.SeatLabel)
                .ToListAsync();

            var bookedSeatSet = bookedSeats
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim().ToUpperInvariant())
                .ToHashSet();

            var activeHolds = await _context.SeatHolds
                .AsNoTracking()
                .Where(x =>
                    x.TripID == tripId &&
                    x.Status == "Holding" &&
                    x.HoldExpiresAt > now)
                .Select(x => new
                {
                    x.SeatLabel,
                    x.UserID,
                    x.SessionId,
                    x.HoldExpiresAt
                })
                .ToListAsync();

            var holdBySeat = activeHolds
                .Where(x => !string.IsNullOrWhiteSpace(x.SeatLabel))
                .GroupBy(x => x.SeatLabel.Trim().ToUpperInvariant())
                .ToDictionary(
                    x => x.Key,
                    x => x.OrderByDescending(h => h.HoldExpiresAt).First());

            var seats = seatLabels.Select(label =>
            {
                var normalizedLabel = label.ToUpperInvariant();
                var status = "Available";

                if (bookedSeatSet.Contains(normalizedLabel))
                {
                    status = "Booked";
                }
                else if (holdBySeat.TryGetValue(normalizedLabel, out var hold))
                {
                    status = IsOwnedByCurrent(hold.UserID, hold.SessionId, currentUserId, sessionId)
                        ? "HoldingByMe"
                        : "HoldingByOther";
                }

                return new
                {
                    seatLabel = label,
                    status
                };
            }).ToList();

            return Ok(new
            {
                tripID = trip.TripID,
                capacity,
                seats
            });
        }

        [HttpPost("hold")]
        public async Task<IActionResult> HoldSeats([FromBody] SeatHoldRequest request)
        {
            var currentUserId = GetCurrentUserId();
            var sessionId = NormalizeSessionId(request.SessionId);
            if (!currentUserId.HasValue && string.IsNullOrWhiteSpace(sessionId))
                return BadRequest(new { message = "Cần sessionId nếu chưa đăng nhập" });

            var requestedSeats = NormalizeSeatLabels(request.SeatLabels);
            if (request.TripId <= 0 || requestedSeats.Count == 0)
                return BadRequest(new { message = "TripId và danh sách ghế là bắt buộc" });

            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                var trip = await _context.Trips
                    .Include(x => x.Bus)
                    .FirstOrDefaultAsync(x => x.TripID == request.TripId);

                if (trip == null)
                    return NotFound(new { message = "Không tìm thấy chuyến xe" });

                var validSeats = GenerateSeatLabels(Math.Max(trip.Bus?.Capacity ?? 0, 0))
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);
                var invalidSeats = requestedSeats.Where(x => !validSeats.Contains(x)).ToList();
                if (invalidSeats.Count > 0)
                    return BadRequest(new { message = $"Ghế không tồn tại: {string.Join(", ", invalidSeats)}" });

                var now = DateTime.Now;
                var holdExpiresAt = now.AddMinutes(20);

                await ExpireOldHolds(request.TripId, requestedSeats, now);

                var bookedSeats = await _context.TicketSeats
                    .Include(x => x.Booking)
                    .Where(x =>
                        x.Booking != null &&
                        x.Booking.TripID == request.TripId &&
                        (x.Booking.PaymentStatus == null || x.Booking.PaymentStatus != "Cancelled") &&
                        requestedSeats.Contains(x.SeatLabel))
                    .Select(x => x.SeatLabel)
                    .ToListAsync();

                var bookedSeatSet = bookedSeats.Select(NormalizeSeatLabel).ToHashSet();
                if (bookedSeatSet.Count > 0)
                    return Conflict(new { message = $"Ghế đã được đặt: {string.Join(", ", bookedSeatSet)}" });

                var activeHolds = await _context.SeatHolds
                    .Where(x =>
                        x.TripID == request.TripId &&
                        x.Status == "Holding" &&
                        x.HoldExpiresAt > now &&
                        requestedSeats.Contains(x.SeatLabel))
                    .ToListAsync();

                var conflictSeats = activeHolds
                    .Where(x => !IsOwnedByCurrent(x.UserID, x.SessionId, currentUserId, sessionId))
                    .Select(x => NormalizeSeatLabel(x.SeatLabel))
                    .Distinct()
                    .ToList();

                if (conflictSeats.Count > 0)
                    return Conflict(new { message = $"Ghế đang được người khác giữ: {string.Join(", ", conflictSeats)}" });

                foreach (var seatLabel in requestedSeats)
                {
                    var currentHold = activeHolds.FirstOrDefault(x =>
                        NormalizeSeatLabel(x.SeatLabel) == seatLabel &&
                        IsOwnedByCurrent(x.UserID, x.SessionId, currentUserId, sessionId));

                    if (currentHold != null)
                    {
                        currentHold.HoldExpiresAt = holdExpiresAt;
                        currentHold.Status = "Holding";
                        continue;
                    }

                    _context.SeatHolds.Add(new SeatHold
                    {
                        TripID = request.TripId,
                        SeatLabel = seatLabel,
                        UserID = currentUserId,
                        SessionId = sessionId,
                        Status = "Holding",
                        HoldExpiresAt = holdExpiresAt,
                        CreatedAt = now
                    });
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    heldSeats = requestedSeats,
                    holdExpiresAt,
                    message = "Giữ ghế thành công"
                });
            }
            catch (DbUpdateException)
            {
                await transaction.RollbackAsync();
                return Conflict(new { message = "Ghế vừa được người khác giữ. Vui lòng tải lại trạng thái ghế." });
            }
        }

        [HttpPost("release")]
        public async Task<IActionResult> ReleaseSeats([FromBody] SeatHoldRequest request)
        {
            var currentUserId = GetCurrentUserId();
            var sessionId = NormalizeSessionId(request.SessionId);
            if (!currentUserId.HasValue && string.IsNullOrWhiteSpace(sessionId))
                return BadRequest(new { message = "Cần sessionId nếu chưa đăng nhập" });

            var requestedSeats = NormalizeSeatLabels(request.SeatLabels);
            if (request.TripId <= 0 || requestedSeats.Count == 0)
                return BadRequest(new { message = "TripId và danh sách ghế là bắt buộc" });

            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var now = DateTime.Now;

            var ownedHolds = await _context.SeatHolds
                .Where(x =>
                    x.TripID == request.TripId &&
                    x.Status == "Holding" &&
                    x.HoldExpiresAt > now &&
                    requestedSeats.Contains(x.SeatLabel))
                .ToListAsync();

            var releasableHolds = ownedHolds
                .Where(x => IsOwnedByCurrent(x.UserID, x.SessionId, currentUserId, sessionId))
                .ToList();

            foreach (var hold in releasableHolds)
            {
                hold.Status = "Released";
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            var releasedSeats = releasableHolds
                .Select(x => NormalizeSeatLabel(x.SeatLabel))
                .Distinct()
                .ToList();

            return Ok(new
            {
                releasedSeats,
                message = releasedSeats.Count > 0 ? "Nhả ghế thành công" : "Không có ghế nào thuộc phiên hiện tại để nhả"
            });
        }

        private async Task ExpireOldHolds(int tripId, List<string> seatLabels, DateTime now)
        {
            var expiredHolds = await _context.SeatHolds
                .Where(x =>
                    x.TripID == tripId &&
                    x.Status == "Holding" &&
                    x.HoldExpiresAt <= now &&
                    seatLabels.Contains(x.SeatLabel))
                .ToListAsync();

            foreach (var hold in expiredHolds)
            {
                hold.Status = "Expired";
            }

            if (expiredHolds.Count > 0)
                await _context.SaveChangesAsync();
        }

        private int? GetCurrentUserId()
        {
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(claimValue, out var userId) ? userId : null;
        }

        private static bool IsOwnedByCurrent(int? holdUserId, string? holdSessionId, int? currentUserId, string? sessionId)
        {
            if (currentUserId.HasValue)
                return holdUserId.HasValue && holdUserId.Value == currentUserId.Value;

            return !string.IsNullOrWhiteSpace(sessionId) &&
                   string.Equals(holdSessionId, sessionId, StringComparison.OrdinalIgnoreCase);
        }

        private static List<string> NormalizeSeatLabels(List<string>? seatLabels)
        {
            return (seatLabels ?? new List<string>())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(NormalizeSeatLabel)
                .Distinct()
                .ToList();
        }

        private static string NormalizeSeatLabel(string seatLabel)
        {
            return seatLabel.Trim().ToUpperInvariant();
        }

        private static string? NormalizeSessionId(string? sessionId)
        {
            return string.IsNullOrWhiteSpace(sessionId) ? null : sessionId.Trim();
        }

        private static List<string> GenerateSeatLabels(int capacity)
        {
            var labels = new List<string>();
            const int seatsPerRow = 4;

            for (var index = 0; index < capacity; index++)
            {
                var rowIndex = index / seatsPerRow;
                var seatNumber = index % seatsPerRow + 1;
                labels.Add($"{GetRowLabel(rowIndex)}{seatNumber}");
            }

            return labels;
        }

        private static string GetRowLabel(int rowIndex)
        {
            var label = string.Empty;
            var current = rowIndex;

            do
            {
                label = (char)('A' + current % 26) + label;
                current = current / 26 - 1;
            }
            while (current >= 0);

            return label;
        }
    }

    public class SeatHoldRequest
    {
        public int TripId { get; set; }
        public List<string>? SeatLabels { get; set; }
        public string? SessionId { get; set; }
    }
}
