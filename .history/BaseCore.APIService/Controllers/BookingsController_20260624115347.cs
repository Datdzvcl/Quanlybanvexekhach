using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using System.Data;
using System.Security.Claims;
using BaseCore.Common;

namespace BaseCore.APIService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BookingsController : ControllerBase
    {
        private const string HoldingStatus = "Holding";
        private const string ExpiredStatus = "Expired";
        private const string ConvertedToBookingStatus = "ConvertedToBooking";
        private const string BookingPendingConfirmStatus = "PendingConfirm";
        private const string BookingConfirmedStatus = "Confirmed";
        private const string BookingCancelRequestedStatus = "CancelRequested";
        private const string BookingCancelledStatus = "Cancelled";
        private const string BookingCancelRejectedStatus = "CancelRejected";
        private const string PaymentPaidStatus = "Paid";
        private const string PaymentPendingStatus = "Pending";
        private const string PaymentCancelledStatus = "Cancelled";
        private const string PaymentRefundedStatus = "Refunded";

        private readonly MySqlDbContext _context;

        public BookingsController(MySqlDbContext context)
        {
            _context = context;
        }
        private async Task<int?> GetCurrentOperatorId()
        {
            if (!User.IsInRole("Operator")) return null;
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, out var userId)) return null;
            var user = await _context.Users.AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserID == userId);
            return user?.OperatorID;
        }
        [HttpGet]
        [Authorize(Roles = "Admin,Operator")]
        public async Task<IActionResult> GetAll(
            int? bookingId,
            string? customerName,
            string? customerPhone,
            int? operatorId,
            string? routeKeyword,
            byte? paymentStatus,
            byte? bookingStatus,
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
             var operatorIdClaim = await GetCurrentOperatorId();
            if (operatorIdClaim.HasValue)
                query = query.Where(x => x.Trip != null && x.Trip.Bus != null 
                    && x.Trip.Bus.OperatorID == operatorIdClaim.Value);
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

            // if (!string.IsNullOrWhiteSpace(paymentStatus))
            // {
            //     var status = paymentStatus.Trim();
            //     query = query.Where(x => x.PaymentStatus == status);
            // }

            // if (!string.IsNullOrWhiteSpace(bookingStatus))
            // {
            //     var status = bookingStatus.Trim();
            //     query = query.Where(x => x.BookingStatus == status || (x.BookingStatus == null && status == "PendingConfirm"));
            // }
            if (paymentStatus.HasValue)
                query = query.Where(x => x.PaymentStatus == paymentStatus.Value);

            if (bookingStatus.HasValue)
                query = query.Where(x => x.BookingStatus == bookingStatus.Value);
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
                    promotionID = x.PromotionID,
                    discountAmount = x.DiscountAmount,
                    paymentMethod = x.PaymentMethod,
                    paymentStatus = x.PaymentStatus,
                    bookingStatus = x.BookingStatus,
                    bookingDate = x.BookingDate,
                    cancelReason = x.CancelReason,
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
                    arrivalTime = x.Trip == null ? (DateTime?)null : x.Trip.ArrivalTime,
                    seatLabels = x.TicketSeats == null
                        ? new List<string>()
                        : x.TicketSeats.Select(s => s.SeatLabel).ToList(),
                    totalPrice = x.TotalPrice,
                    promotionID = x.PromotionID,
                    discountAmount = x.DiscountAmount,
                    paymentStatus = x.PaymentStatus,
                    bookingStatus = x.BookingStatus,
                    cancelReason = x.CancelReason,
                    cancelledAt = x.CancelledAt,
                    refundAmount = x.RefundAmount,
                    hasReview = _context.Reviews.Any(r => r.BookingID == x.BookingID),
                    reviewRating = _context.Reviews
                        .Where(r => r.BookingID == x.BookingID)
                        .Select(r => (int?)r.Rating)
                        .FirstOrDefault(),
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
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var booking = await _context.Bookings
                .AsNoTracking()
                .Include(x => x.Trip).ThenInclude(x => x.Bus).ThenInclude(x => x.Operator)
                .Include(x => x.TicketSeats)
                .FirstOrDefaultAsync(x => x.BookingID == id);

            if (booking == null)
                return NotFound();

            var review = await _context.Reviews
                .AsNoTracking()
                .Where(r => r.BookingID == id)
                .Select(r => new { r.ReviewID, r.Rating, r.Comment, r.CreatedAt, r.EditedAt, r.ReplyContent, r.RepliedAt })
                .FirstOrDefaultAsync();

            var pickupStop = booking.PickupStopID.HasValue
                ? await _context.StopPoints
                    .AsNoTracking()
                    .Where(s => s.StopPointID == booking.PickupStopID.Value)
                    .Select(s => new { s.StopPointID, s.StopName, s.StopAddress, s.StopType })
                    .FirstOrDefaultAsync()
                : null;

            var dropoffStop = booking.DropoffStopID.HasValue
                ? await _context.StopPoints
                    .AsNoTracking()
                    .Where(s => s.StopPointID == booking.DropoffStopID.Value)
                    .Select(s => new { s.StopPointID, s.StopName, s.StopAddress, s.StopType })
                    .FirstOrDefaultAsync()
                : null;

            var result = new
            {
                bookingID = booking.BookingID,
                tripID = booking.TripID,
                userID = booking.UserID,
                customerName = booking.CustomerName,
                customerPhone = booking.CustomerPhone,
                customerEmail = booking.CustomerEmail,
                totalSeats = booking.TotalSeats,
                totalPrice = booking.TotalPrice,
                promotionID = booking.PromotionID,
                discountAmount = booking.DiscountAmount,
                paymentMethod = booking.PaymentMethod,
                paymentStatus = booking.PaymentStatus,
                bookingStatus = booking.BookingStatus,
                bookingDate = booking.BookingDate,
                pickupStopID = booking.PickupStopID,
                dropoffStopID = booking.DropoffStopID,
                cancelReason = booking.CancelReason,
                cancelledAt = booking.CancelledAt,
                refundAmount = booking.RefundAmount,
                review,
                operatorName = booking.Trip?.Bus?.Operator?.Name,
                departureLocation = booking.Trip?.DepartureLocation,
                arrivalLocation = booking.Trip?.ArrivalLocation,
                departureTime = (DateTime?)booking.Trip?.DepartureTime,
                arrivalTime = (DateTime?)booking.Trip?.ArrivalTime,
                trip = booking.Trip == null ? null : new
                {
                    booking.Trip.TripID,
                    booking.Trip.DepartureLocation,
                    booking.Trip.ArrivalLocation,
                    booking.Trip.DepartureTime,
                    booking.Trip.ArrivalTime,
                    booking.Trip.Price,
                    booking.Trip.Status
                },
                bus = booking.Trip?.Bus == null ? null : (object)new
                {
                    booking.Trip.Bus.BusID,
                    booking.Trip.Bus.LicensePlate,
                    booking.Trip.Bus.Capacity,
                    booking.Trip.Bus.BusType
                },
                operatorInfo = booking.Trip?.Bus?.Operator == null ? null : (object)new
                {
                    booking.Trip.Bus.Operator.OperatorID,
                    booking.Trip.Bus.Operator.Name,
                    booking.Trip.Bus.Operator.ContactPhone,
                    booking.Trip.Bus.Operator.Email
                },
                seatLabels = booking.TicketSeats?.Select(s => s.SeatLabel).ToList() ?? new List<string>(),
                ticketSeats = booking.TicketSeats?.Select(s => new TicketSeatInfoResponse
                {
                    TicketSeatID = s.TicketSeatID,
                    SeatLabel = s.SeatLabel,
                    QRCode = s.QRCode
                }).ToList() ?? new List<TicketSeatInfoResponse>(),
                qrCodes = booking.TicketSeats?.Select(s => s.QRCode).ToList() ?? new List<string?>(),
                pickupStop,
                dropoffStop
            };

            return Ok(result);
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
                    (x.StopType == 1 || x.StopType == 3));

                if (!pickupStopValid)
                    return BadRequest(new { message = "Điểm đón không hợp lệ cho chuyến xe này" });

                var dropoffStopValid = await _context.StopPoints.AnyAsync(x =>
                    x.StopPointID == request.DropoffStopId.Value &&
                    x.TripID == request.TripId &&
                    x.IsActive &&
                    (x.StopType == 2 || x.StopType == 3));

                if (!dropoffStopValid)
                    return BadRequest(new { message = "Điểm trả không hợp lệ cho chuyến xe này" });

                if (trip.AvailableSeats < seatLabels.Count)
                    return Conflict(new { message = "Không đủ chỗ trống" });

                var now = DateTime.Now;
                var expiredHolds = await _context.SeatHolds
                    .Where(x =>
                        x.TripID == request.TripId &&
                        x.Status == SeatHoldStatusConstant.Holding &&
                        x.HoldExpiresAt <= now &&
                        seatLabels.Contains(x.SeatLabel.ToUpper()))
                    .ToListAsync();

                foreach (var expiredHold in expiredHolds)
                {
                    expiredHold.Status = SeatHoldStatusConstant.Released;
                }

                if (expiredHolds.Count > 0)
                    await _context.SaveChangesAsync();

                var holds = await _context.SeatHolds
                    .Where(x =>
                        x.TripID == request.TripId &&
                        x.Status == SeatHoldStatusConstant.Holding &&
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
                        (x.Booking.BookingStatus == BookingStatusConstant.Pending ||
                         x.Booking.BookingStatus == BookingStatusConstant.Confirmed) &&
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
                var subtotal = totalSeats * trip.Price;
                int? promotionId = null;
                decimal discountAmount = 0;
                var totalPrice = subtotal;
                Promotion? promotion = null;

                var promotionCode = NormalizeOptionalText(request.PromotionCode);
                if (!string.IsNullOrWhiteSpace(promotionCode))
                {
                    promotion = await _context.Promotions
                        .FirstOrDefaultAsync(x => x.Code == promotionCode.Trim().ToUpper());

                    if (promotion == null)
                        return BadRequest(new { message = "Mã giảm giá không tồn tại" });

                    var promotionResult = PromotionsController.ValidatePromotionEntity(
                        promotion,
                        subtotal,
                        currentUserId,
                        now);

                    if (!promotionResult.Valid)
                        return BadRequest(new { message = promotionResult.Message });

                    promotionId = promotionResult.PromotionId;
                    discountAmount = promotionResult.DiscountAmount;
                    totalPrice = promotionResult.FinalAmount;
                }

                var paymentMethod = PaymentsController.NormalizePaymentMethod(request.PaymentMethod);
                var paymentStatus = PaymentsController.IsPendingMethod(paymentMethod) ? PaymentPendingStatus : PaymentPaidStatus;

                var booking = new Booking
                {
                    TripID = request.TripId,
                    UserID = currentUserId,
                    CustomerName = request.CustomerName.Trim(),
                    CustomerPhone = request.CustomerPhone.Trim(),
                    CustomerEmail = NormalizeOptionalText(request.CustomerEmail),
                    TotalSeats = totalSeats,
                    TotalPrice = totalPrice,
                    PromotionID = promotionId,
                    DiscountAmount = discountAmount,
                    PaymentMethod = paymentMethod,
                    // PaymentStatus = paymentStatus,
                    // BookingStatus = BookingPendingConfirmStatus,
                    BookingStatus = BookingStatusConstant.Pending,
                    BookingDate = now,
                    PickupStopID = request.PickupStopId,
                    DropoffStopID = request.DropoffStopId
                };

                
                _context.Bookings.Add(booking);

                foreach (var seatLabel in seatLabels)
                {
                    _context.TicketSeats.Add(new TicketSeat
                    {
                        Booking = booking,      // ← Dùng object thay vì BookingID
                        SeatLabel = seatLabel,
                        QRCode = null           // ← Set sau khi có ID
                    });
                }

                foreach (var hold in holds.Where(x => ownedHoldSeats.Contains(NormalizeSeatLabel(x.SeatLabel))))
                {
                    hold.Status = SeatHoldStatusConstant.Confirmed;
                    hold.Booking = booking;     // ← Dùng object thay vì BookingID
                }

                trip.AvailableSeats -= totalSeats;
                if (promotion != null)
                    promotion.UsedCount += 1;

                NotificationsController.AddNotification(
                    _context,
                    booking.UserID,
                    "Đặt vé thành công",
                    $"Đơn tuyến {trip.DepartureLocation} - {trip.ArrivalLocation} đã được tạo thành công.",
                    paymentStatus == PaymentPaidStatus ? (byte)1 : (byte)3,
                    $"/my-tickets/{booking.BookingID}");

                // ✅ Save 1 lần - nếu lỗi thì rollback toàn bộ, không có gì lọt vào DB
                await _context.SaveChangesAsync();

                // Sau khi save, EF đã gán BookingID tự động → update TransactionCode và QRCode
                // var savedPayment = _context.Payments.Local
                //     .FirstOrDefault(p => p.BookingID == booking.BookingID);
                // if (savedPayment != null)
                //     savedPayment.TransactionCode = PaymentsController.CreateTransactionCode(booking.BookingID);

                foreach (var seat in _context.TicketSeats.Local.Where(s => s.BookingID == booking.BookingID))
                {
                    seat.QRCode = $"BOOKING:{booking.BookingID};TRIP:{booking.TripID};SEAT:{seat.SeatLabel};PHONE:{booking.CustomerPhone}";
                }

                // Notification cũng update lại với BookingID thật
                await _context.SaveChangesAsync(); // Lần 2 chỉ update code

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
                    subtotal,
                    booking.DiscountAmount,
                    booking.TotalPrice,
                    booking.PromotionID,
                    booking.PaymentMethod,
                    // booking.BookingStatus,
                    booking.BookingDate,
                    booking.PickupStopID,
                    booking.DropoffStopID,
                    seatLabels
                });
            }
            // catch (DbUpdateException)
            // {
            //     await transaction.RollbackAsync();
            //     return Conflict(new { message = "Không thể tạo booking vì trạng thái ghế vừa thay đổi. Vui lòng chọn lại." });
            // }
            catch (DbUpdateException ex)
        {
            await transaction.RollbackAsync();
            
            var innerMsg = ex.InnerException?.Message ?? "no inner";
            var innerInnerMsg = ex.InnerException?.InnerException?.Message ?? "no inner inner";
            Console.WriteLine($"=== DbUpdateException ===");
            Console.WriteLine($"Message: {ex.Message}");
            Console.WriteLine($"Inner: {innerMsg}");
            Console.WriteLine($"InnerInner: {innerInnerMsg}");
            
            return Conflict(new { 
                message = "Không thể tạo booking vì trạng thái ghế vừa thay đổi. Vui lòng chọn lại.",
                debug = innerMsg
            });
        }
}

        // [HttpPut("{id}/payment-status")]
        // [Authorize(Roles = "Admin")]
        // public async Task<IActionResult> UpdatePaymentStatus(int id, [FromBody] string status)
        // {
        //     var booking = await _context.Bookings.FindAsync(id);

        //     if (booking == null)
        //         return NotFound();

        //     booking.PaymentStatus = status;

        //     var payment = await _context.Payments
        //         .Where(x => x.BookingID == id)
        //         .OrderByDescending(x => x.CreatedAt)
        //         .FirstOrDefaultAsync();

        //     var now = DateTime.Now;
        //     if (payment == null)
        //     {
        //         _context.Payments.Add(new Payment
        //         {
        //             BookingID = booking.BookingID,
        //             Amount = booking.TotalPrice,
        //             PaymentMethod = PaymentsController.NormalizePaymentMethod(booking.PaymentMethod),
        //             PaymentStatus = status,
        //             TransactionCode = PaymentsController.CreateTransactionCode(booking.BookingID),
        //             PaidAt = string.Equals(status, PaymentPaidStatus, StringComparison.OrdinalIgnoreCase) ? now : null,
        //             CreatedAt = now
        //         });
        //     }
        //     else
        //     {
        //         payment.PaymentStatus = status;
        //         if (string.Equals(status, PaymentPaidStatus, StringComparison.OrdinalIgnoreCase))
        //         {
        //             payment.PaidAt = now;
        //             payment.TransactionCode ??= PaymentsController.CreateTransactionCode(booking.BookingID);
        //         }
        //     }

        //     if (string.Equals(status, PaymentPaidStatus, StringComparison.OrdinalIgnoreCase))
        //     {
        //         NotificationsController.AddNotification(
        //             _context,
        //             booking.UserID,
        //             "Thanh toán thành công",
        //             $"Đơn #{booking.BookingID} đã được ghi nhận thanh toán thành công và đang chờ admin xác nhận.",
        //             1);
        //     }

        //     await _context.SaveChangesAsync();

        //     return Ok(new { booking.BookingID, booking.PaymentStatus });
        // }
        [HttpPut("{id}/booking-status")]
        [Authorize(Roles = "Admin,Operator")]
        public async Task<IActionResult> UpdateBookingStatus(int id, [FromBody] byte status)
        {
            var booking = await _context.Bookings.FindAsync(id);

            if (booking == null)
                return NotFound();

            var now = DateTime.Now;
            var oldStatus = booking.BookingStatus;

            booking.BookingStatus = status;

            _context.BookingStatusHistory.Add(new BookingStatusHistory
            {
                BookingID = booking.BookingID,
                OldStatus = oldStatus,
                NewStatus = status,
                ChangedAt = now,
                Note      = "Admin cập nhật trạng thái"
            });

            await _context.SaveChangesAsync();

            return Ok(new { booking.BookingID, booking.BookingStatus });
        }
        [HttpPut("{id}/confirm")]
        [Authorize(Roles = "Admin,Operator")]
        public async Task<IActionResult> Confirm(int id)
        {
            var booking = await _context.Bookings.FindAsync(id);

            if (booking == null)
                return NotFound(new { message = "Khong tim thay booking" });

            var currentStatus = booking.BookingStatus ;
            if (currentStatus != BookingStatusConstant.Pending)
                return BadRequest(new { message = "Chi co the xac nhan don co BookingStatus = PendingConfirm" });

            booking.BookingStatus  = BookingStatusConstant.Confirmed;
            booking.PaymentStatus  = PaymentStatusConstant.Paid;
            NotificationsController.AddNotification(
                _context,
                booking.UserID,
                "Đơn đặt vé đã được xác nhận",
                $"Đơn #{booking.BookingID} đã được xác nhận.",
                1,
                $"/my-tickets/{booking.BookingID}");
            await _context.SaveChangesAsync();

            return Ok(new
            {
                bookingID = booking.BookingID,
                bookingStatus = booking.BookingStatus,
                message = "Da xac nhan don dat ve"
            });
        }

        [HttpPut("{id}/approve-cancel")]
        [Authorize(Roles = "Admin,Operator")]
        // public async Task<IActionResult> ApproveCancel(int id, [FromBody] ApproveCancelBookingRequest? request)
        // {
        //     await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        //     var booking = await _context.Bookings
        //         .Include(x => x.Trip)
        //         .Include(x => x.TicketSeats)
        //         .FirstOrDefaultAsync(x => x.BookingID == id);

        //     if (booking == null)
        //         return NotFound(new { message = "Khong tim thay booking" });

        //     var currentStatus = booking.BookingStatus;
        //     if (currentStatus != BookingStatusConstant.CancelRequested)
        //         return BadRequest(new { message = "Chi co the duyet huy don co BookingStatus = CancelRequested" });

        //     var now = DateTime.Now;
        //     if (booking.Trip != null && IsTripDepartedOrCompleted(booking.Trip, now))
        //         return BadRequest(new { message = "Chuyen xe da chay hoac da hoan thanh, khong the duyet huy." });

        //     var refundRate = CalculateRefundRate(booking.Trip?.DepartureTime, now);
        //     var isPaid = booking.BookingStatus == BookingStatusConstant.Confirmed;
        //     var refundAmount = isPaid ? Math.Round(booking.TotalPrice * refundRate, 0) : 0m;

        //     booking.BookingStatus = BookingStatusConstant.Cancelled;
        //     booking.BookingStatus = isPaid ? BookingStatusConstant.Refunded : BookingStatusConstant.Cancelled;
        //     booking.CancelledAt   = now;
        //     booking.RefundAmount = refundAmount;

        //     // var latestPayment = await _context.Payments
        //     //     .Where(x => x.BookingID == booking.BookingID)
        //     //     .OrderByDescending(x => x.CreatedAt)
        //     //     .FirstOrDefaultAsync();
        //     // if (latestPayment != null)
        //     //     latestPayment.PaymentStatus = booking.PaymentStatus;

        //     if (booking.Trip != null && booking.TotalSeats > 0 && booking.Trip.DepartureTime > now)
        //         booking.Trip.AvailableSeats += booking.TotalSeats;

        //     NotificationsController.AddNotification(
        //         _context,
        //         booking.UserID,
        //         "Hủy vé được duyệt",
        //         $"Yêu cầu hủy đơn #{booking.BookingID} đã được duyệt. Số tiền hoàn dự kiến: {refundAmount:N0} đ.",
        //         4);

        //     await _context.SaveChangesAsync();
        //     await transaction.CommitAsync();

        //     return Ok(new
        //     {
        //         bookingID = booking.BookingID,
        //         bookingStatus = booking.BookingStatus,
        //         paymentStatus = booking.BookingStatus,
        //         booking.CancelledAt,
        //         booking.RefundAmount,
        //         refundRate,
        //         seatsRestored = booking.TotalSeats,
        //         message = "Da duyet huy don dat ve"
        //     });
        // }
        // public async Task<IActionResult> ApproveCancel(int id, [FromBody] ApproveCancelBookingRequest? request)
        // {
        //     await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        //     var booking = await _context.Bookings
        //         .Include(x => x.Trip)
        //         .Include(x => x.TicketSeats)
        //         .FirstOrDefaultAsync(x => x.BookingID == id);

        //     if (booking == null)
        //         return NotFound(new { message = "Khong tim thay booking" });

        //     var currentStatus = booking.BookingStatus;
        //     if (currentStatus != BookingStatusConstant.CancelRequested)
        //         return BadRequest(new { message = "Chi co the duyet huy don co BookingStatus = CancelRequested" });

        //     var now = DateTime.Now;
        //     if (booking.Trip != null && IsTripDepartedOrCompleted(booking.Trip, now))
        //         return BadRequest(new { message = "Chuyen xe da chay hoac da hoan thanh, khong the duyet huy." });

        //     // ✅ FIX: Đọc lịch sử từ DB để biết booking này trước đó đã Confirmed chưa
        //     var wasConfirmed = await _context.BookingStatusHistory
        //         .AnyAsync(h => h.BookingID == id && h.NewStatus == BookingStatusConstant.Confirmed);

        //     var refundRate   = CalculateRefundRate(booking.Trip?.DepartureTime, now);
        //     var refundAmount = wasConfirmed
        //         ? Math.Round(booking.TotalPrice * refundRate, 0)
        //         : 0m;

        //     // ✅ FIX: Chỉ gán 1 lần, đúng logic
        //     booking.BookingStatus = wasConfirmed
        //         ? BookingStatusConstant.Refunded   // đã xác nhận (đã thu tiền) → hoàn tiền
        //         : BookingStatusConstant.Cancelled; // chưa xác nhận → hủy thẳng
        //     booking.CancelledAt  = now;
        //     booking.RefundAmount = refundAmount;

        //     // ✅ FIX: Đã xoá 4 dòng _context.Payments — bảng không còn tồn tại

        //     if (booking.Trip != null && booking.TotalSeats > 0 && booking.Trip.DepartureTime > now)
        //         booking.Trip.AvailableSeats += booking.TotalSeats;

        //     NotificationsController.AddNotification(
        //         _context,
        //         booking.UserID,
        //         "Hủy vé được duyệt",
        //         $"Yêu cầu hủy đơn #{booking.BookingID} đã được duyệt. Số tiền hoàn dự kiến: {refundAmount:N0} đ.",
        //         4);

        //     await _context.SaveChangesAsync();
        //     await transaction.CommitAsync();

        //     return Ok(new
        //     {
        //         bookingID     = booking.BookingID,
        //         bookingStatus = booking.BookingStatus,
        //         booking.CancelledAt,
        //         booking.RefundAmount,
        //         refundRate,
        //         wasConfirmed,
        //         seatsRestored = booking.TotalSeats,
        //         message       = "Đã duyệt hủy đơn đặt vé"
        //     });
        // }
        public async Task<IActionResult> ApproveCancel(int id, [FromBody] ApproveCancelBookingRequest? request)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var booking = await _context.Bookings
                .Include(x => x.Trip)
                .Include(x => x.TicketSeats)
                .FirstOrDefaultAsync(x => x.BookingID == id);

            if (booking == null)
                return NotFound(new { message = "Không tìm thấy booking" });

            if (booking.BookingStatus != BookingStatusConstant.CancelRequested)
                return BadRequest(new { message = "Chỉ được duyệt hủy đơn đang ở trạng thái Yêu cầu hủy" });

            var now = DateTime.Now;
            if (booking.Trip != null && IsTripDepartedOrCompleted(booking.Trip, now))
                return BadRequest(new { message = "Chuyến xe đã chạy hoặc hoàn thành, không thể duyệt hủy." });

            // Đã thanh toán → chờ admin hoàn tiền; chưa thanh toán → hủy thẳng
            bool wasPaid = booking.PaymentStatus == PaymentStatusConstant.Paid;
            booking.BookingStatus = BookingStatusConstant.Cancelled;
            booking.CancelledAt   = now;
            if (wasPaid)
                booking.PaymentStatus = PaymentStatusConstant.PendingRefund;

            if (booking.Trip != null && booking.TotalSeats > 0 && booking.Trip.DepartureTime > now)
                booking.Trip.AvailableSeats += booking.TotalSeats;

            var seatLabels = booking.TicketSeats?
                .Select(s => s.SeatLabel.Trim().ToUpperInvariant())
                .ToList() ?? new List<string>();

            if (seatLabels.Count > 0)
            {
                var confirmedHolds = await _context.SeatHolds
                    .Where(x => x.TripID == booking.TripID && x.BookingID == booking.BookingID
                             && x.Status == SeatHoldStatusConstant.Confirmed)
                    .ToListAsync();
                foreach (var hold in confirmedHolds)
                    hold.Status = SeatHoldStatusConstant.Released;
            }

            // Thông báo khách
            var customerMsg = wasPaid
                ? $"Yêu cầu hủy đơn #{booking.BookingID} đã được nhà xe duyệt. Admin đang xử lý hoàn tiền cho bạn."
                : $"Yêu cầu hủy đơn #{booking.BookingID} đã được nhà xe duyệt. Đơn đã hủy (không cần hoàn tiền).";
            NotificationsController.AddNotification(_context, booking.UserID, "Hủy vé được duyệt",
                customerMsg, 4, $"/my-tickets/{booking.BookingID}");

            // Thông báo admin nếu cần hoàn tiền
            if (wasPaid)
            {
                var adminUsers = await _context.Users
                    .Where(u => u.Role == RoleConstant.Admin)
                    .Select(u => new { u.UserID })
                    .ToListAsync();
                foreach (var admin in adminUsers)
                    NotificationsController.AddNotification(_context, admin.UserID, "Cần duyệt hoàn tiền",
                        $"Đơn #{booking.BookingID} ({booking.Trip?.DepartureLocation} → {booking.Trip?.ArrivalLocation}) đã được nhà xe duyệt hủy. Cần xử lý hoàn tiền.",
                        3, "/admin/bookings");
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                bookingID     = booking.BookingID,
                bookingStatus = booking.BookingStatus,
                paymentStatus = booking.PaymentStatus,
                booking.CancelledAt,
                seatsRestored = booking.TotalSeats,
                message       = wasPaid ? "Đã duyệt hủy, đang chờ Admin hoàn tiền" : "Đã hủy vé (không phát sinh hoàn tiền)"
            });
        }

        // Admin duyệt hoàn tiền sau khi nhà xe đã duyệt hủy
        [HttpPut("{id}/approve-refund")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ApproveRefund(int id, [FromBody] ApproveCancelBookingRequest? request)
        {
            var booking = await _context.Bookings
                .Include(x => x.Trip)
                .FirstOrDefaultAsync(x => x.BookingID == id);

            if (booking == null)
                return NotFound(new { message = "Không tìm thấy booking" });

            if (booking.PaymentStatus != PaymentStatusConstant.PendingRefund)
                return BadRequest(new { message = "Chỉ được duyệt hoàn tiền đơn đang ở trạng thái Chờ hoàn tiền" });

            var now = DateTime.Now;
            var refundRate   = CalculateRefundRate(booking.Trip?.DepartureTime, now);
            var refundAmount = request?.RefundAmount
                ?? Math.Round(booking.TotalPrice * refundRate, 0);

            booking.BookingStatus = BookingStatusConstant.Refunded;
            booking.PaymentStatus = PaymentStatusConstant.Refunded;
            booking.RefundAmount  = refundAmount;

            NotificationsController.AddNotification(
                _context, booking.UserID,
                "Hoàn tiền thành công",
                $"Đơn #{booking.BookingID} đã được hoàn tiền {refundAmount:N0} đ.",
                4,
                $"/my-tickets/{booking.BookingID}");

            await _context.SaveChangesAsync();

            return Ok(new
            {
                bookingID     = booking.BookingID,
                bookingStatus = booking.BookingStatus,
                paymentStatus = booking.PaymentStatus,
                booking.RefundAmount,
                message       = "Đã duyệt hoàn tiền"
            });
        }
        [HttpPut("{id}/reject-cancel")]
        [Authorize(Roles = "Admin,Operator")]
        public async Task<IActionResult> RejectCancel(int id, [FromBody] RejectCancelBookingRequest? request)
        {
            var booking = await _context.Bookings.FindAsync(id);

            if (booking == null)
                return NotFound(new { message = "Khong tim thay booking" });

            var currentStatus = booking.BookingStatus;
            if (currentStatus != BookingStatusConstant.CancelRequested)
                return BadRequest(new { message = "Chi co the tu choi huy don co BookingStatus = CancelRequested" });

            booking.BookingStatus = BookingStatusConstant.CancelRejected;
            NotificationsController.AddNotification(
                _context,
                booking.UserID,
                "Yêu cầu hủy vé bị từ chối",
                $"Yêu cầu hủy đơn #{booking.BookingID} đã bị từ chối.",
                4,
                $"/my-tickets/{booking.BookingID}");

            await _context.SaveChangesAsync();

            return Ok(new
            {
                bookingID = booking.BookingID,
                bookingStatus = booking.BookingStatus,
                rejectReason = NormalizeOptionalText(request?.RejectReason),
                message = "Da tu choi yeu cau huy don"
            });
        }

        [HttpPut("{id}/cancel")]
        [Authorize(Roles = "Admin,Operator")]
        public async Task<IActionResult> Cancel(int id)
        {
            var booking = await _context.Bookings
                .Include(b => b.Trip)
                .FirstOrDefaultAsync(b => b.BookingID == id);

            if (booking == null)
                return NotFound();

            if (booking.BookingStatus == BookingStatusConstant.Cancelled)
                return BadRequest("Vé này đã bị hủy trước đó.");

            if (booking.BookingStatus == BookingStatusConstant.Confirmed)
                return BadRequest("Vé đã thanh toán, không thể hủy tại đây. Vui lòng liên hệ nhà xe để được hỗ trợ.");

            if (booking.Trip != null)
                booking.Trip.AvailableSeats += booking.TotalSeats;

            booking.BookingStatus = BookingStatusConstant.Cancelled;
            // var latestPayment = await _context.Payments
            //     .Where(x => x.BookingID == booking.BookingID)
            //     .OrderByDescending(x => x.CreatedAt)
            //     .FirstOrDefaultAsync();
            // if (latestPayment != null)
            //     latestPayment.PaymentStatus = PaymentCancelledStatus;

            NotificationsController.AddNotification(
                _context,
                booking.UserID,
                "Vé đã bị hủy",
                $"Đơn #{booking.BookingID} (tuyến {booking.Trip?.DepartureLocation} → {booking.Trip?.ArrivalLocation}) đã bị hủy.",
                4, $"/my-tickets/{booking.BookingID}");

            await _context.SaveChangesAsync();

            return Ok(new
            {
                booking.BookingID,
                booking.BookingStatus,
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
                .Include(x => x.Trip).ThenInclude(t => t!.Bus)
                .FirstOrDefaultAsync(x => x.BookingID == id);

            if (booking == null)
                return NotFound(new { message = "Không tìm thấy booking" });

            if (booking.UserID != currentUserId.Value)
                return Forbid();

            var now = DateTime.Now;
            if (booking.Trip != null && IsTripDepartedOrCompleted(booking.Trip, now))
                return BadRequest(new { message = "Chuyến xe đã chạy, không thể yêu cầu hủy vé" });

            // var currentStatus = booking.BookingStatus ?? BookingPendingConfirmStatus;
            // if (currentStatus == BookingCancelledStatus || booking.PaymentStatus == PaymentCancelledStatus || booking.PaymentStatus == PaymentRefundedStatus)
            //     return BadRequest(new { message = "Booking đã bị hủy, không thể yêu cầu hủy lại" });

            // if (currentStatus == BookingCancelRequestedStatus)
            //     return BadRequest(new { message = "Booking đã gửi yêu cầu hủy trước đó" });

            // if (currentStatus == BookingCancelRejectedStatus)
            //     return BadRequest(new { message = "Yeu cau huy ve da bi tu choi truoc do" });

            // booking.BookingStatus = BookingCancelRequestedStatus;
            // booking.CancelReason = NormalizeOptionalText(request?.CancelReason);
            var currentStatus = booking.BookingStatus;
            if (currentStatus == BookingStatusConstant.Cancelled || currentStatus == BookingStatusConstant.Refunded)
                return BadRequest(new { message = "Booking đã bị hủy, không thể yêu cầu hủy lại" });

            if (currentStatus == BookingStatusConstant.CancelRequested)
                return BadRequest(new { message = "Booking đã gửi yêu cầu hủy trước đó" });

            if (currentStatus == BookingStatusConstant.CancelRejected)
                return BadRequest(new { message = "Yeu cau huy ve da bi tu choi truoc do" });

            booking.BookingStatus = BookingStatusConstant.CancelRequested;
            booking.CancelReason  = NormalizeOptionalText(request?.CancelReason);

            // Thông báo khách
            NotificationsController.AddNotification(
                _context,
                booking.UserID,
                "Đã gửi yêu cầu hủy vé",
                $"Yêu cầu hủy đơn #{booking.BookingID} đã được ghi nhận và đang chờ nhà xe duyệt.",
                4, $"/my-tickets/{booking.BookingID}");

            // Thông báo nhà xe để duyệt hủy
            if (booking.Trip?.Bus?.OperatorID != null)
            {
                var opUser = await _context.Users
                    .Where(u => u.OperatorID == booking.Trip.Bus.OperatorID && u.Role == RoleConstant.Operator)
                    .Select(u => new { u.UserID })
                    .FirstOrDefaultAsync();
                if (opUser != null)
                    NotificationsController.AddNotification(
                        _context, opUser.UserID,
                        "Khách yêu cầu hủy vé",
                        $"Đơn #{booking.BookingID} ({booking.Trip.DepartureLocation} → {booking.Trip.ArrivalLocation}) có yêu cầu hủy vé. Vui lòng xem xét.",
                        4, $"/operator/trips/{booking.Trip.TripID}");
            }

            await _context.SaveChangesAsync();

            // var estimatedRefundAmount = string.Equals(booking.PaymentStatus, PaymentPaidStatus, StringComparison.OrdinalIgnoreCase)
            //     ? Math.Round(booking.TotalPrice * CalculateRefundRate(booking.Trip?.DepartureTime, now), 0)
            //     : 0m;
            // var estimatedRefundAmount = booking.BookingStatus == BookingStatusConstant.Confirmed
            // ? Math.Round(booking.TotalPrice * CalculateRefundRate(booking.Trip?.DepartureTime, now), 0)
            // : 0m;
            var estimatedRefundAmount = currentStatus == BookingStatusConstant.Confirmed
            ? Math.Round(booking.TotalPrice * CalculateRefundRate(booking.Trip?.DepartureTime, now), 0)
            : 0m;
            return Ok(new
            {
                bookingID = booking.BookingID,
                bookingStatus = booking.BookingStatus,
                booking.CancelReason,
                estimatedRefundAmount,
                message = "Đã gửi yêu cầu hủy vé"
            });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Operator")]
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

        private static bool IsTripDepartedOrCompleted(Trip trip, DateTime now)
        {
            return trip.DepartureTime <= now ||
       trip.Status == TripStatusConstant.Completed;
        }

        private static decimal CalculateRefundRate(DateTime? departureTime, DateTime now)
        {
            if (!departureTime.HasValue)
                return 0.5m;

            var hoursBeforeDeparture = (departureTime.Value - now).TotalHours;
            if (hoursBeforeDeparture > 24)
                return 0.9m;

            if (hoursBeforeDeparture >= 6)
                return 0.7m;

            if (hoursBeforeDeparture > 0)
                return 0.5m;

            return 0m;
        }

        private static string? NormalizeOptionalText(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }
    //     [HttpGet("suggest")]
    //     [Authorize(Roles = "Admin,Operator")]
    //     public async Task<IActionResult> Suggest([FromQuery] string q, [FromQuery] int take = 8)
    //     {
    //         if (string.IsNullOrWhiteSpace(q))
    //             return Ok(new List<object>());
        
    //         take = Math.Clamp(take, 1, 20);
    //         q = q.Trim();
        
    //         // Lấy operatorId nếu là Operator
    //         var operatorId = await GetCurrentOperatorId();
        
    //         // Query base — include Trip > Bus để filter operator
    //         var query = _context.Bookings
    //             .AsNoTracking()
    //             .Include(x => x.Trip)
    //                 .ThenInclude(x => x.Bus)
    //             .AsQueryable();
        
    //         // Operator chỉ thấy booking thuộc nhà xe mình
    //         if (operatorId.HasValue)
    //             query = query.Where(x => x.Trip.Bus.OperatorID == operatorId.Value);
        
    //         // Tìm theo mã đơn (số) hoặc tên khách hàng
    //         // bool isNumeric = int.TryParse(q, out var bookingIdSearch);
        
    //         // query = isNumeric
    //         //     ? query.Where(x => x.BookingID == bookingIdSearch
    //         //                     || x.CustomerName.Contains(q))
    //         //     : query.Where(x => x.CustomerName.Contains(q)
    //         //                     || x.CustomerPhone.Contains(q));
    //         int.TryParse(q, out var bookingIdSearch);

    //             query = query.Where(x =>
    //                 (bookingIdSearch > 0 && x.BookingID == bookingIdSearch) ||
    //                 x.CustomerName.Contains(q) ||
    //                 x.CustomerPhone.Contains(q)
    //             );
        
    //         var results = await query
    //             .OrderByDescending(x => x.BookingDate)
    //             .Take(take)
    //             .Select(x => new
    //             {
    //                 x.BookingID,
    //                 x.CustomerName,
    //                 x.CustomerPhone,
    //                 x.TotalPrice,
    //                 x.BookingStatus,
    //                 Route = x.Trip != null
    //                     ? $"{x.Trip.DepartureLocation} → {x.Trip.ArrivalLocation}"
    //                     : "Chưa rõ",
    //             })
    //             .ToListAsync();
        
    //         return Ok(results);
    //     }
    // }
    [HttpGet("suggest")]
[Authorize(Roles = "Admin,Operator")]
public async Task<IActionResult> Suggest([FromQuery] string q, [FromQuery] int take = 8)
    {
        if (string.IsNullOrWhiteSpace(q))
            return Ok(new List<object>());

        take = Math.Clamp(take, 1, 20);
        q = q.Trim();

        var operatorId = await GetCurrentOperatorId();

        // Query base
        var baseQuery = _context.Bookings
            .AsNoTracking()
            .Include(x => x.Trip).ThenInclude(x => x.Bus)
            .AsQueryable();

        if (operatorId.HasValue)
            baseQuery = baseQuery.Where(x => x.Trip.Bus.OperatorID == operatorId.Value);

        // Parse mã đơn
        int.TryParse(q, out var bookingIdSearch);

        // Lọc sơ bộ ở DB: SĐT hoặc mã đơn (nhanh, dùng index)
        // Tên có dấu không filter được ở DB → load 300 bản ghi gần nhất về memory
        var candidates = await baseQuery
            .Where(x =>
                (bookingIdSearch > 0 && x.BookingID == bookingIdSearch) ||
                (x.CustomerPhone != null && x.CustomerPhone.Contains(q))
            )
            .OrderByDescending(x => x.BookingDate)
            .Take(50)
            .Select(x => new
            {
                x.BookingID,
                x.CustomerName,
                x.CustomerPhone,
                x.TotalPrice,
                x.BookingStatus,
                x.BookingDate,
                Route = x.Trip != null
                    ? $"{x.Trip.DepartureLocation} → {x.Trip.ArrivalLocation}"
                    : "Chưa rõ",
            })
            .ToListAsync();

        // Load thêm batch để tìm theo tên (cần bỏ dấu ở memory)
        var nameBatch = await baseQuery
            .OrderByDescending(x => x.BookingDate)
            .Take(300)
            .Select(x => new
            {
                x.BookingID,
                x.CustomerName,
                x.CustomerPhone,
                x.TotalPrice,
                x.BookingStatus,
                x.BookingDate,
                Route = x.Trip != null
                    ? $"{x.Trip.DepartureLocation} → {x.Trip.ArrivalLocation}"
                    : "Chưa rõ",
            })
            .ToListAsync();

        // Filter tên không dấu ở memory
        var qNorm = RemoveDiacritics(q);
        var byName = nameBatch
            .Where(x => RemoveDiacritics(x.CustomerName ?? "").Contains(qNorm))
            .ToList();

        // Gộp + dedup + lấy top
        var results = candidates
            .Concat(byName)
            .DistinctBy(x => x.BookingID)
            .OrderByDescending(x => x.BookingDate)
            .Take(take)
            .Select(x => new
            {
                x.BookingID,
                x.CustomerName,
                x.CustomerPhone,
                x.TotalPrice,
                x.BookingStatus,
                x.Route,
            })
            .ToList();

        return Ok(results);
    }
    
    // Hàm bỏ dấu tiếng Việt — thêm vào cuối class BookingsController
    private static string RemoveDiacritics(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return "";
        var normalized = text.Normalize(System.Text.NormalizationForm.FormD);
        var sb = new System.Text.StringBuilder();
        foreach (var c in normalized)
        {
            if (System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c)
                != System.Globalization.UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }
        return sb.ToString()
                .Normalize(System.Text.NormalizationForm.FormC)
                .ToLower();
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
        public string? PromotionCode { get; set; }
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
}