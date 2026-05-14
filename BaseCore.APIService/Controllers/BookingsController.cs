using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using System.Data;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BookingsController : ControllerBase
    {
        private readonly MySqlDbContext _context;

        public BookingsController(MySqlDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll(
            int? bookingId,
            string? customerName,
            string? customerPhone,
            int? operatorId,
            string? routeKeyword,
            string? paymentStatus,
            string? bookingStatus,
            DateTime? fromDate,
            DateTime? toDate,
            int page = 1,
            int pageSize = 10)
        {
            page = page <= 0 ? 1 : page;
            pageSize = pageSize <= 0 ? 10 : Math.Min(pageSize, 100);

            var query = _context.Bookings
                .AsNoTracking()
                .Include(x => x.Trip).ThenInclude(x => x.Bus).ThenInclude(x => x.Operator)
                .Include(x => x.TicketSeats)
                .AsQueryable();

            if (bookingId.HasValue)
                query = query.Where(x => x.BookingID == bookingId.Value);

            if (!string.IsNullOrWhiteSpace(customerName))
            {
                var keyword = customerName.Trim();
                query = query.Where(x => x.CustomerName != null && x.CustomerName.Contains(keyword));
            }

            if (!string.IsNullOrWhiteSpace(customerPhone))
            {
                var keyword = customerPhone.Trim();
                query = query.Where(x => x.CustomerPhone != null && x.CustomerPhone.Contains(keyword));
            }

            if (operatorId.HasValue)
                query = query.Where(x => x.Trip != null && x.Trip.Bus != null && x.Trip.Bus.OperatorID == operatorId.Value);

            if (!string.IsNullOrWhiteSpace(routeKeyword))
            {
                var keyword = routeKeyword.Trim();
                query = query.Where(x =>
                    x.Trip != null &&
                    ((x.Trip.DepartureLocation != null && x.Trip.DepartureLocation.Contains(keyword)) ||
                     (x.Trip.ArrivalLocation != null && x.Trip.ArrivalLocation.Contains(keyword))));
            }

            if (!string.IsNullOrWhiteSpace(paymentStatus))
            {
                var status = paymentStatus.Trim();
                query = query.Where(x => x.PaymentStatus == status);
            }

            if (!string.IsNullOrWhiteSpace(bookingStatus))
            {
                var status = bookingStatus.Trim();
                query = query.Where(x => x.BookingStatus == status || (x.BookingStatus == null && status == "PendingConfirm"));
            }

            if (fromDate.HasValue)
            {
                var start = fromDate.Value.Date;
                query = query.Where(x => x.BookingDate >= start);
            }

            if (toDate.HasValue)
            {
                var end = toDate.Value.Date.AddDays(1);
                query = query.Where(x => x.BookingDate < end);
            }

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

            var items = await query
                .OrderByDescending(x => x.BookingDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new
                {
                    bookingID = x.BookingID,
                    operatorID = x.Trip == null || x.Trip.Bus == null ? (int?)null : x.Trip.Bus.OperatorID,
                    operatorName = x.Trip != null && x.Trip.Bus != null && x.Trip.Bus.Operator != null
                        ? x.Trip.Bus.Operator.Name
                        : null,
                    departureLocation = x.Trip == null ? null : x.Trip.DepartureLocation,
                    arrivalLocation = x.Trip == null ? null : x.Trip.ArrivalLocation,
                    departureTime = x.Trip == null ? (DateTime?)null : x.Trip.DepartureTime,
                    arrivalTime = x.Trip == null ? (DateTime?)null : x.Trip.ArrivalTime,
                    customerName = x.CustomerName,
                    customerPhone = x.CustomerPhone,
                    customerEmail = x.CustomerEmail,
                    totalSeats = x.TotalSeats,
                    totalPrice = x.TotalPrice,
                    paymentMethod = x.PaymentMethod,
                    paymentStatus = x.PaymentStatus,
                    bookingStatus = x.BookingStatus ?? "PendingConfirm",
                    bookingDate = x.BookingDate,
                    cancelledAt = x.CancelledAt,
                    refundAmount = x.RefundAmount,
                    seatLabels = x.TicketSeats == null
                        ? new List<string>()
                        : x.TicketSeats.Select(s => s.SeatLabel).ToList()
                })
                .ToListAsync();

            return Ok(new
            {
                items,
                totalCount,
                page,
                pageSize,
                totalPages
            });
        }

        [HttpGet("my")]
        [Authorize]
        public async Task<IActionResult> GetMyBookings()
        {
            var currentUserId = GetCurrentUserId();
            if (!currentUserId.HasValue)
                return Unauthorized(new { message = "Token không hợp lệ" });

            var bookings = await _context.Bookings
                .AsNoTracking()
                .Include(x => x.Trip).ThenInclude(x => x.Bus).ThenInclude(x => x.Operator)
                .Include(x => x.TicketSeats)
                .Where(x => x.UserID == currentUserId.Value)
                .OrderByDescending(x => x.BookingDate)
                .Select(x => new
                {
                    bookingID = x.BookingID,
                    operatorName = x.Trip != null && x.Trip.Bus != null && x.Trip.Bus.Operator != null
                        ? x.Trip.Bus.Operator.Name
                        : null,
                    route = x.Trip == null ? null : $"{x.Trip.DepartureLocation} - {x.Trip.ArrivalLocation}",
                    departureLocation = x.Trip == null ? null : x.Trip.DepartureLocation,
                    arrivalLocation = x.Trip == null ? null : x.Trip.ArrivalLocation,
                    departureTime = x.Trip == null ? (DateTime?)null : x.Trip.DepartureTime,
                    seatLabels = x.TicketSeats == null
                        ? new List<string>()
                        : x.TicketSeats.Select(s => s.SeatLabel).ToList(),
                    totalPrice = x.TotalPrice,
                    paymentStatus = x.PaymentStatus,
                    bookingStatus = x.BookingStatus ?? "PendingConfirm",
                    pickupStop = _context.StopPoints
                        .Where(s => s.StopPointID == x.PickupStopID)
                        .Select(s => new { s.StopPointID, s.StopName, s.StopAddress, s.StopType })
                        .FirstOrDefault(),
                    dropoffStop = _context.StopPoints
                        .Where(s => s.StopPointID == x.DropoffStopID)
                        .Select(s => new { s.StopPointID, s.StopName, s.StopAddress, s.StopType })
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(bookings);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetById(int id)
        {
            var booking = await _context.Bookings
                .AsNoTracking()
                .Include(x => x.Trip).ThenInclude(x => x.Bus).ThenInclude(x => x.Operator)
                .Include(x => x.TicketSeats)
                .Where(x => x.BookingID == id)
                .Select(x => new
                {
                    bookingID = x.BookingID,
                    tripID = x.TripID,
                    userID = x.UserID,
                    customerName = x.CustomerName,
                    customerPhone = x.CustomerPhone,
                    customerEmail = x.CustomerEmail,
                    totalSeats = x.TotalSeats,
                    totalPrice = x.TotalPrice,
                    paymentMethod = x.PaymentMethod,
                    paymentStatus = x.PaymentStatus,
                    bookingStatus = x.BookingStatus ?? "PendingConfirm",
                    bookingDate = x.BookingDate,
                    pickupStopID = x.PickupStopID,
                    dropoffStopID = x.DropoffStopID,
                    cancelReason = x.CancelReason,
                    cancelledAt = x.CancelledAt,
                    refundAmount = x.RefundAmount,
                    operatorName = x.Trip != null && x.Trip.Bus != null && x.Trip.Bus.Operator != null
                        ? x.Trip.Bus.Operator.Name
                        : null,
                    departureLocation = x.Trip == null ? null : x.Trip.DepartureLocation,
                    arrivalLocation = x.Trip == null ? null : x.Trip.ArrivalLocation,
                    departureTime = x.Trip == null ? (DateTime?)null : x.Trip.DepartureTime,
                    arrivalTime = x.Trip == null ? (DateTime?)null : x.Trip.ArrivalTime,
                    trip = x.Trip == null ? null : new
                    {
                        x.Trip.TripID,
                        x.Trip.DepartureLocation,
                        x.Trip.ArrivalLocation,
                        x.Trip.DepartureTime,
                        x.Trip.ArrivalTime,
                        x.Trip.Price,
                        x.Trip.Status
                    },
                    bus = x.Trip == null || x.Trip.Bus == null ? null : new
                    {
                        x.Trip.Bus.BusID,
                        x.Trip.Bus.LicensePlate,
                        x.Trip.Bus.Capacity,
                        x.Trip.Bus.BusType
                    },
                    operatorInfo = x.Trip == null || x.Trip.Bus == null || x.Trip.Bus.Operator == null ? null : new
                    {
                        x.Trip.Bus.Operator.OperatorID,
                        x.Trip.Bus.Operator.Name,
                        x.Trip.Bus.Operator.ContactPhone,
                        x.Trip.Bus.Operator.Email
                    },
                    seatLabels = x.TicketSeats == null
                        ? new List<string>()
                        : x.TicketSeats.Select(s => s.SeatLabel).ToList(),
                    ticketSeats = x.TicketSeats == null
                        ? new List<TicketSeatInfoResponse>()
                        : x.TicketSeats.Select(s => new
                        {
                            s.TicketSeatID,
                            s.SeatLabel,
                            s.QRCode
                        }).Select(s => new TicketSeatInfoResponse
                        {
                            TicketSeatID = s.TicketSeatID,
                            SeatLabel = s.SeatLabel,
                            QRCode = s.QRCode
                        }).ToList(),
                    qrCodes = x.TicketSeats == null
                        ? new List<string?>()
                        : x.TicketSeats.Select(s => s.QRCode).ToList(),
                    pickupStop = _context.StopPoints
                        .Where(s => s.StopPointID == x.PickupStopID)
                        .Select(s => new { s.StopPointID, s.StopName, s.StopAddress, s.StopType })
                        .FirstOrDefault(),
                    dropoffStop = _context.StopPoints
                        .Where(s => s.StopPointID == x.DropoffStopID)
                        .Select(s => new { s.StopPointID, s.StopName, s.StopAddress, s.StopType })
                        .FirstOrDefault()
                })
                .FirstOrDefaultAsync();

            if (booking == null)
                return NotFound();

            return Ok(booking);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateBookingRequest request)
        {
            var currentUserId = GetCurrentUserId();
            var sessionId = NormalizeSessionId(request.SessionId);

            if (!currentUserId.HasValue && string.IsNullOrWhiteSpace(sessionId))
                return BadRequest(new { message = "Cần sessionId nếu chưa đăng nhập" });

            var seatLabels = NormalizeSeatLabels(request.SeatLabels);
            if (request.TripId <= 0 || seatLabels.Count == 0)
                return BadRequest(new { message = "TripId và danh sách ghế là bắt buộc" });

            if (string.IsNullOrWhiteSpace(request.CustomerName) || string.IsNullOrWhiteSpace(request.CustomerPhone))
                return BadRequest(new { message = "Tên khách hàng và số điện thoại là bắt buộc" });

            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            try
            {
                var trip = await _context.Trips
                    .Include(x => x.Bus)
                    .FirstOrDefaultAsync(x => x.TripID == request.TripId);

                if (trip == null)
                    return NotFound(new { message = "Không tìm thấy chuyến xe" });

                if (!request.PickupStopId.HasValue || !request.DropoffStopId.HasValue)
                    return BadRequest(new { message = "Điểm đón và điểm trả là bắt buộc" });

                var pickupStopValid = await _context.StopPoints.AnyAsync(x =>
                    x.StopPointID == request.PickupStopId.Value &&
                    x.TripID == request.TripId &&
                    x.IsActive &&
                    x.StopType == 1);

                if (!pickupStopValid)
                    return BadRequest(new { message = "Điểm đón không hợp lệ cho chuyến xe này" });

                var dropoffStopValid = await _context.StopPoints.AnyAsync(x =>
                    x.StopPointID == request.DropoffStopId.Value &&
                    x.TripID == request.TripId &&
                    x.IsActive &&
                    x.StopType == 2);

                if (!dropoffStopValid)
                    return BadRequest(new { message = "Điểm trả không hợp lệ cho chuyến xe này" });

                if (trip.AvailableSeats < seatLabels.Count)
                    return Conflict(new { message = "Không đủ chỗ trống" });

                var now = DateTime.Now;
                var expiredHolds = await _context.SeatHolds
                    .Where(x =>
                        x.TripID == request.TripId &&
                        x.Status == "Holding" &&
                        x.HoldExpiresAt <= now &&
                        seatLabels.Contains(x.SeatLabel.ToUpper()))
                    .ToListAsync();

                foreach (var expiredHold in expiredHolds)
                {
                    expiredHold.Status = "Expired";
                }

                if (expiredHolds.Count > 0)
                    await _context.SaveChangesAsync();

                var holds = await _context.SeatHolds
                    .Where(x =>
                        x.TripID == request.TripId &&
                        x.Status == "Holding" &&
                        x.HoldExpiresAt > now &&
                        seatLabels.Contains(x.SeatLabel.ToUpper()))
                    .ToListAsync();

                var ownedHoldSeats = holds
                    .Where(x => IsOwnedByCurrent(x.UserID, x.SessionId, currentUserId, sessionId))
                    .Select(x => NormalizeSeatLabel(x.SeatLabel))
                    .Distinct()
                    .ToHashSet();

                var missingHoldSeats = seatLabels.Where(x => !ownedHoldSeats.Contains(x)).ToList();
                if (missingHoldSeats.Count > 0)
                {
                    return Conflict(new
                    {
                        message = "Ghế đã hết thời gian giữ, vui lòng chọn lại.",
                        seats = missingHoldSeats
                    });
                }

                var bookedSeats = await _context.TicketSeats
                    .Include(x => x.Booking)
                    .Where(x =>
                        x.Booking != null &&
                        x.Booking.TripID == request.TripId &&
                        (x.Booking.PaymentStatus == null || x.Booking.PaymentStatus != "Cancelled") &&
                        seatLabels.Contains(x.SeatLabel.ToUpper()))
                    .Select(x => x.SeatLabel)
                    .ToListAsync();

                var bookedSeatSet = bookedSeats
                    .Select(NormalizeSeatLabel)
                    .Distinct()
                    .ToList();

                if (bookedSeatSet.Count > 0)
                    return Conflict(new { message = $"Ghế đã được đặt: {string.Join(", ", bookedSeatSet)}" });

                var totalSeats = seatLabels.Count;
                var totalPrice = totalSeats * trip.Price;
                var booking = new Booking
                {
                    TripID = request.TripId,
                    UserID = currentUserId,
                    CustomerName = request.CustomerName.Trim(),
                    CustomerPhone = request.CustomerPhone.Trim(),
                    CustomerEmail = NormalizeOptionalText(request.CustomerEmail),
                    TotalSeats = totalSeats,
                    TotalPrice = totalPrice,
                    PaymentMethod = NormalizeOptionalText(request.PaymentMethod) ?? "Chuyển khoản",
                    PaymentStatus = "Paid",
                    BookingStatus = "PendingConfirm",
                    BookingDate = now,
                    PickupStopID = request.PickupStopId,
                    DropoffStopID = request.DropoffStopId
                };

                _context.Bookings.Add(booking);
                await _context.SaveChangesAsync();

                foreach (var seatLabel in seatLabels)
                {
                    _context.TicketSeats.Add(new TicketSeat
                    {
                        BookingID = booking.BookingID,
                        SeatLabel = seatLabel,
                        QRCode = $"BOOKING:{booking.BookingID};TRIP:{booking.TripID};SEAT:{seatLabel};PHONE:{booking.CustomerPhone}"
                    });
                }

                foreach (var hold in holds.Where(x => ownedHoldSeats.Contains(NormalizeSeatLabel(x.SeatLabel))))
                {
                    hold.Status = "ConvertedToBooking";
                    hold.BookingID = booking.BookingID;
                }

                trip.AvailableSeats -= totalSeats;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    bookingID = booking.BookingID,
                    bookingStatus = booking.BookingStatus,
                    booking.TripID,
                    booking.UserID,
                    booking.CustomerName,
                    booking.CustomerPhone,
                    booking.CustomerEmail,
                    booking.TotalSeats,
                    booking.TotalPrice,
                    booking.PaymentMethod,
                    booking.PaymentStatus,
                    booking.BookingDate,
                    booking.PickupStopID,
                    booking.DropoffStopID,
                    seatLabels
                });
            }
            catch (DbUpdateException)
            {
                await transaction.RollbackAsync();
                return Conflict(new { message = "Không thể tạo booking vì trạng thái ghế vừa thay đổi. Vui lòng chọn lại." });
            }
        }

        [HttpPut("{id}/payment-status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdatePaymentStatus(int id, [FromBody] string status)
        {
            var booking = await _context.Bookings.FindAsync(id);

            if (booking == null)
                return NotFound();

            booking.PaymentStatus = status;
            await _context.SaveChangesAsync();

            return Ok(new { booking.BookingID, booking.PaymentStatus });
        }

        [HttpPut("{id}/confirm")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Confirm(int id)
        {
            var booking = await _context.Bookings.FindAsync(id);

            if (booking == null)
                return NotFound(new { message = "Khong tim thay booking" });

            var currentStatus = booking.BookingStatus ?? "PendingConfirm";
            if (currentStatus != "PendingConfirm")
                return BadRequest(new { message = "Chi co the xac nhan don co BookingStatus = PendingConfirm" });

            booking.BookingStatus = "Confirmed";
            await _context.SaveChangesAsync();

            return Ok(new
            {
                bookingID = booking.BookingID,
                bookingStatus = booking.BookingStatus,
                message = "Da xac nhan don dat ve"
            });
        }

        [HttpPut("{id}/approve-cancel")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ApproveCancel(int id, [FromBody] ApproveCancelBookingRequest? request)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var booking = await _context.Bookings
                .Include(x => x.Trip)
                .Include(x => x.TicketSeats)
                .FirstOrDefaultAsync(x => x.BookingID == id);

            if (booking == null)
                return NotFound(new { message = "Khong tim thay booking" });

            var currentStatus = booking.BookingStatus ?? "PendingConfirm";
            if (currentStatus != "CancelRequested")
                return BadRequest(new { message = "Chi co the duyet huy don co BookingStatus = CancelRequested" });

            booking.BookingStatus = "Cancelled";
            booking.PaymentStatus = "Cancelled";
            booking.CancelledAt = DateTime.Now;

            if (request?.RefundAmount != null)
                booking.RefundAmount = request.RefundAmount.Value;

            if (booking.Trip != null && booking.TotalSeats > 0)
                booking.Trip.AvailableSeats += booking.TotalSeats;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                bookingID = booking.BookingID,
                bookingStatus = booking.BookingStatus,
                paymentStatus = booking.PaymentStatus,
                booking.CancelledAt,
                booking.RefundAmount,
                seatsRestored = booking.TotalSeats,
                message = "Da duyet huy don dat ve"
            });
        }

        [HttpPut("{id}/reject-cancel")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RejectCancel(int id, [FromBody] RejectCancelBookingRequest? request)
        {
            var booking = await _context.Bookings.FindAsync(id);

            if (booking == null)
                return NotFound(new { message = "Khong tim thay booking" });

            var currentStatus = booking.BookingStatus ?? "PendingConfirm";
            if (currentStatus != "CancelRequested")
                return BadRequest(new { message = "Chi co the tu choi huy don co BookingStatus = CancelRequested" });

            var restoreStatus = NormalizeOptionalText(request?.BookingStatus) ?? "Confirmed";
            if (restoreStatus != "Confirmed" && restoreStatus != "PendingConfirm")
                return BadRequest(new { message = "BookingStatus khoi phuc chi duoc la Confirmed hoac PendingConfirm" });

            booking.BookingStatus = restoreStatus;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                bookingID = booking.BookingID,
                bookingStatus = booking.BookingStatus,
                rejectReason = request?.RejectReason,
                message = "Da tu choi yeu cau huy don"
            });
        }

        [HttpPut("{id}/cancel")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Cancel(int id)
        {
            var booking = await _context.Bookings
                .Include(b => b.Trip)
                .FirstOrDefaultAsync(b => b.BookingID == id);

            if (booking == null)
                return NotFound();

            if (booking.PaymentStatus == "Cancelled")
                return BadRequest("Vé này đã bị hủy trước đó.");

            if (booking.PaymentStatus == "Paid")
                return BadRequest("Vé đã thanh toán, không thể hủy tại đây. Vui lòng liên hệ nhà xe để được hỗ trợ.");

            if (booking.Trip != null)
                booking.Trip.AvailableSeats += booking.TotalSeats;

            booking.PaymentStatus = "Cancelled";
            await _context.SaveChangesAsync();

            return Ok(new
            {
                booking.BookingID,
                booking.PaymentStatus,
                SeatsRestored = booking.TotalSeats
            });
        }

        [HttpPut("{id}/request-cancel")]
        [Authorize]
        public async Task<IActionResult> RequestCancel(int id, [FromBody] RequestCancelBookingRequest? request)
        {
            var currentUserId = GetCurrentUserId();
            if (!currentUserId.HasValue)
                return Unauthorized(new { message = "Token không hợp lệ" });

            var booking = await _context.Bookings
                .Include(x => x.Trip)
                .FirstOrDefaultAsync(x => x.BookingID == id);

            if (booking == null)
                return NotFound(new { message = "Không tìm thấy booking" });

            if (booking.UserID != currentUserId.Value)
                return Forbid();

            if (booking.Trip != null && booking.Trip.DepartureTime <= DateTime.Now)
                return BadRequest(new { message = "Chuyến xe đã chạy, không thể yêu cầu hủy vé" });

            var currentStatus = booking.BookingStatus ?? "PendingConfirm";
            if (currentStatus == "Cancelled" || booking.PaymentStatus == "Cancelled")
                return BadRequest(new { message = "Booking đã bị hủy, không thể yêu cầu hủy lại" });

            if (currentStatus == "CancelRequested")
                return BadRequest(new { message = "Booking đã gửi yêu cầu hủy trước đó" });

            booking.BookingStatus = "CancelRequested";
            booking.CancelReason = NormalizeOptionalText(request?.CancelReason);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                bookingID = booking.BookingID,
                bookingStatus = booking.BookingStatus,
                booking.CancelReason,
                message = "Đã gửi yêu cầu hủy vé"
            });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var booking = await _context.Bookings.FindAsync(id);
            if (booking == null)
                return NotFound();

            var ticketSeats = await _context.TicketSeats
                .Where(t => t.BookingID == id)
                .ToListAsync();

            if (ticketSeats.Any())
                _context.TicketSeats.RemoveRange(ticketSeats);

            var trip = await _context.Trips.FindAsync(booking.TripID);
            if (trip != null)
                trip.AvailableSeats += booking.TotalSeats;

            _context.Bookings.Remove(booking);
            await _context.SaveChangesAsync();
            return Ok();
        }

        private int? GetCurrentUserId()
        {
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(claimValue, out var userId) ? userId : null;
        }

        private static bool IsOwnedByCurrent(int? holdUserId, string? holdSessionId, int? currentUserId, string? sessionId)
        {
            var isMineByUser = currentUserId.HasValue && holdUserId.HasValue && holdUserId.Value == currentUserId.Value;
            var isMineBySession = !string.IsNullOrWhiteSpace(sessionId) &&
                                  string.Equals(holdSessionId, sessionId, StringComparison.OrdinalIgnoreCase);

            return isMineByUser || isMineBySession;
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

        private static string? NormalizeOptionalText(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }
    }

    public class CreateBookingRequest
    {
        public int TripId { get; set; }
        public string? SessionId { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerPhone { get; set; }
        public string? CustomerEmail { get; set; }
        public List<string>? SeatLabels { get; set; }
        public int? PickupStopId { get; set; }
        public int? DropoffStopId { get; set; }
        public string? PaymentMethod { get; set; }
    }

    public class RequestCancelBookingRequest
    {
        public string? CancelReason { get; set; }
    }

    public class ApproveCancelBookingRequest
    {
        public decimal? RefundAmount { get; set; }
    }

    public class RejectCancelBookingRequest
    {
        public string? BookingStatus { get; set; }
        public string? RejectReason { get; set; }
    }

    public class TicketSeatInfoResponse
    {
        public int TicketSeatID { get; set; }
        public string? SeatLabel { get; set; }
        public string? QRCode { get; set; }
    }
}
