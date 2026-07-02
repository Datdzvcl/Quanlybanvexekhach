using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using System.Security.Claims;
using BaseCore.Common;
namespace BaseCore.APIService.Controllers
{
    [Route("api/payments")]
    [ApiController]
    public class PaymentsController : ControllerBase
    {
        // private const string BookingConfirmedStatus = "Confirmed";
        // private const string PaymentPaidStatus = "Paid";
        // private const string PaymentPendingStatus = "Pending";

        private readonly MySqlDbContext _context;

        public PaymentsController(MySqlDbContext context)
        {
            _context = context;
        }

        // [HttpGet]
        // [Authorize(Roles = "Admin")]
        // public async Task<IActionResult> GetAll(
        //     string? paymentStatus,
        //     int? bookingId,
        //     DateTime? fromDate,
        //     DateTime? toDate,
        //     int page = 1,
        //     int pageSize = 20)
        // {
        //     page = page <= 0 ? 1 : page;
        //     pageSize = pageSize <= 0 ? 20 : Math.Min(pageSize, 100);

        //     var query = _context.Payments
        //         .AsNoTracking()
        //         .Include(x => x.Booking).ThenInclude(x => x.Trip)
        //         .AsQueryable();

        //     if (!string.IsNullOrWhiteSpace(paymentStatus))
        //     {
        //         var status = paymentStatus.Trim();
        //         query = query.Where(x => x.PaymentStatus == status);
        //     }

        //     if (bookingId.HasValue)
        //         query = query.Where(x => x.BookingID == bookingId.Value);

        //     if (fromDate.HasValue)
        //         query = query.Where(x => x.CreatedAt >= fromDate.Value.Date);

        //     if (toDate.HasValue)
        //         query = query.Where(x => x.CreatedAt < toDate.Value.Date.AddDays(1));

        //     var totalCount = await query.CountAsync();
        //     var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        //     var items = await query
        //         .OrderByDescending(x => x.CreatedAt)
        //         .Skip((page - 1) * pageSize)
        //         .Take(pageSize)
        //         .Select(x => new
        //         {
        //             x.PaymentID,
        //             x.BookingID,
        //             x.Amount,
        //             x.PaymentMethod,
        //             x.PaymentStatus,
        //             x.TransactionCode,
        //             x.PaidAt,
        //             x.CreatedAt,
        //             customerName         = x.Booking == null ? null : x.Booking.CustomerName,
        //             customerPhone        = x.Booking == null ? null : x.Booking.CustomerPhone,
        //             bookingStatus        = x.Booking == null ? (byte?)null : x.Booking.BookingStatus,
        //             bookingPaymentStatus = x.Booking == null ? (byte?)null : x.Booking.BookingStatus, // hoặc xóa dòng này nếu trùng
        //             route                = x.Booking == null || x.Booking.Trip == null
        //                 ? null
        //                 : $"{x.Booking.Trip.DepartureLocation} - {x.Booking.Trip.ArrivalLocation}",
        //             departureTime = x.Booking == null || x.Booking.Trip == null
        //                 ? (DateTime?)null
        //                 : x.Booking.Trip.DepartureTime
        //         })
        //         .ToListAsync();

        //     return Ok(new
        //     {
        //         items,
        //         totalCount,
        //         page,
        //         pageSize,
        //         totalPages
        //     });
        // }
        [HttpGet]
        [Authorize(Roles = "Admin,Operator")] // ← thêm Operator
        public async Task<IActionResult> GetAll(
            byte? bookingStatus,
            int? bookingId,
            DateTime? fromDate,
            DateTime? toDate,
            int page = 1,
            int pageSize = 20)
        {
            var query = _context.Bookings
                .AsNoTracking()
                .Include(x => x.Trip).ThenInclude(x => x.Bus)
                .AsQueryable();

            // Filter theo operator nếu là nhà xe
            if (User.IsInRole("Operator"))
            {
                var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (int.TryParse(userIdClaim, out var userId))
                {
                    var user = await _context.Users.AsNoTracking()
                        .FirstOrDefaultAsync(x => x.UserID == userId);
                    if (user?.OperatorID != null)
                        query = query.Where(x => x.Trip.Bus.OperatorID == user.OperatorID);
                }
            }

            if (bookingStatus.HasValue)
                query = query.Where(x => x.BookingStatus == bookingStatus.Value);
            if (bookingId.HasValue)
                query = query.Where(x => x.BookingID == bookingId.Value);
            if (fromDate.HasValue)
                query = query.Where(x => x.BookingDate >= fromDate.Value.Date);
            if (toDate.HasValue)
                query = query.Where(x => x.BookingDate < toDate.Value.Date.AddDays(1));

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(x => x.BookingDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new
                {
                    x.BookingID, x.TotalPrice, x.PaymentMethod,
                    x.BookingStatus, x.BookingDate,
                    customerName = x.CustomerName,
                    customerPhone = x.CustomerPhone,
                    route = x.Trip == null ? null : $"{x.Trip.DepartureLocation} - {x.Trip.ArrivalLocation}",
                    departureTime = x.Trip == null ? (DateTime?)null : x.Trip.DepartureTime
                })
                .ToListAsync();

            return Ok(new { items, totalCount, page, pageSize,
                totalPages = (int)Math.Ceiling(totalCount / (double)pageSize) });
        }
        // [HttpGet("booking/{bookingId:int}")]
        // [Authorize]
        // public async Task<IActionResult> GetByBooking(int bookingId)
        // {
        //     var booking = await _context.Bookings
        //         .AsNoTracking()
        //         .Include(x => x.Payments)
        //         .FirstOrDefaultAsync(x => x.BookingID == bookingId);

        //     if (booking == null)
        //         return NotFound(new { message = "Khong tim thay booking" });

        //     if (!User.IsInRole("Admin"))
        //     {
        //         var currentUserId = GetCurrentUserId();
        //         if (!currentUserId.HasValue || booking.UserID != currentUserId.Value)
        //             return Forbid();
        //     }

        //     var payments = (booking.Payments ?? new List<Payment>())
        //         .OrderByDescending(x => x.CreatedAt)
        //         .Select(x => new
        //         {
        //             x.PaymentID,
        //             x.BookingID,
        //             x.Amount,
        //             x.PaymentMethod,
        //             x.PaymentStatus,
        //             x.TransactionCode,
        //             x.PaidAt,
        //             x.CreatedAt
        //         })
        //         .ToList();

        //     return Ok(payments);
        // }
        [HttpGet("booking/{bookingId:int}")]
        [Authorize]
        public async Task<IActionResult> GetByBooking(int bookingId)
        {
            var booking = await _context.Bookings
                .AsNoTracking()
                .Include(x => x.Trip)
                .FirstOrDefaultAsync(x => x.BookingID == bookingId);

            if (booking == null)
                return NotFound(new { message = "Khong tim thay booking" });

            if (!User.IsInRole("Admin"))
            {
                var currentUserId = GetCurrentUserId();
                if (!currentUserId.HasValue || booking.UserID != currentUserId.Value)
                    return Forbid();
            }

            return Ok(new
            {
                booking.BookingID,
                booking.TotalPrice,
                booking.PaymentMethod,
                booking.BookingStatus,
                booking.BookingDate,
                route = booking.Trip == null ? null : $"{booking.Trip.DepartureLocation} - {booking.Trip.ArrivalLocation}"
            });
        }
        // [HttpPost("simulate")]
        // [Authorize]
        // public async Task<IActionResult> Simulate([FromBody] SimulatePaymentRequest request)
        // {
        //     var booking = await _context.Bookings.FindAsync(request.BookingID);
        //     if (booking == null)
        //         return NotFound(new { message = "Khong tim thay booking" });

        //     if (!User.IsInRole("Admin"))
        //     {
        //         var currentUserId = GetCurrentUserId();
        //         if (!currentUserId.HasValue || booking.UserID != currentUserId.Value)
        //             return Forbid();
        //     }

        //     if (booking.BookingStatus == BookingStatusConstant.Confirmed)
        //         return BadRequest(new { message = "Booking da duoc thanh toan" });

        //     var now = DateTime.Now;
        //     var method = NormalizePaymentMethod(request.PaymentMethod ?? booking.PaymentMethod);
        //     var status = IsPendingMethod(method) ? BookingStatusConstant.Pending : BookingStatusConstant.Confirmed;
        //     var amount = request.Amount.HasValue && request.Amount.Value > 0
        //         ? request.Amount.Value
        //         : booking.TotalPrice;

        //     var payment = new Payment
        //     {
        //         BookingID = booking.BookingID,
        //         Amount = amount,
        //         PaymentMethod = method,
        //         // PaymentStatus = status,
        //         TransactionCode = NormalizeOptionalText(request.TransactionCode) ?? CreateTransactionCode(booking.BookingID),
        //         PaidAt = status == BookingStatusConstant.Confirmed ? now : null,
        //         CreatedAt = now
        //     };

        //     booking.PaymentMethod = method;
        //     booking.BookingStatus = status;

        //     _context.Payments.Add(payment);
        //     NotificationsController.AddNotification(
        //         _context,
        //         booking.UserID,
        //         status == BookingStatusConstant.Confirmed ? "Thanh toán thành công" : "Đã ghi nhận phương thức thanh toán",
        //         status == BookingStatusConstant.Confirmed
        //             ? $"Đơn #{booking.BookingID} đã thanh toán thành công và đang chờ admin xác nhận."
        //             : $"Đơn #{booking.BookingID} đang chờ thanh toán/xác nhận.",
        //         status == BookingStatusConstant.Confirmed ? (byte)1 : (byte)3);
        //     await _context.SaveChangesAsync();

        //     return Ok(ToResponse(payment, booking));
        // }
        [HttpPost("simulate")]
        [Authorize]
        public async Task<IActionResult> Simulate([FromBody] SimulatePaymentRequest request)
        {
            var booking = await _context.Bookings.FindAsync(request.BookingID);
            if (booking == null)
                return NotFound(new { message = "Khong tim thay booking" });

            if (!User.IsInRole("Admin"))
            {
                var currentUserId = GetCurrentUserId();
                if (!currentUserId.HasValue || booking.UserID != currentUserId.Value)
                    return Forbid();
            }

            if (booking.BookingStatus == BookingStatusConstant.Confirmed)
                return BadRequest(new { message = "Booking da duoc thanh toan" });

            var now     = DateTime.Now;
            var method  = NormalizePaymentMethod(request.PaymentMethod ?? booking.PaymentMethod);
            var status  = IsPendingMethod(method) ? BookingStatusConstant.Pending : BookingStatusConstant.Confirmed;

            booking.PaymentMethod = method;
            booking.BookingStatus = status;
            booking.PaymentStatus = IsPendingMethod(method) ? PaymentStatusConstant.Pending : PaymentStatusConstant.Paid;

            _context.BookingStatusHistory.Add(new BookingStatusHistory
            {
                BookingID = booking.BookingID,
                OldStatus = BookingStatusConstant.Pending,
                NewStatus = status,
                ChangedAt = now,
                Note      = "Simulate thanh toán"
            });

            NotificationsController.AddNotification(
                _context,
                booking.UserID,
                status == BookingStatusConstant.Confirmed ? "Thanh toán thành công" : "Đã ghi nhận phương thức thanh toán",
                status == BookingStatusConstant.Confirmed
                    ? $"Đơn #{booking.BookingID} đã thanh toán thành công."
                    : $"Đơn #{booking.BookingID} đang chờ thanh toán.",
                status == BookingStatusConstant.Confirmed ? (byte)1 : (byte)3);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                booking.BookingID,
                booking.BookingStatus,
                booking.PaymentMethod,
                booking.TotalPrice,
                booking.BookingDate
            });
        }
        [HttpPut("{id:int}/confirm")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Confirm(int id, [FromBody] ConfirmPaymentRequest? request)
        {
            var booking = await _context.Bookings
                .FirstOrDefaultAsync(x => x.BookingID == id);

            if (booking == null)
                return NotFound(new { message = "Khong tim thay giao dich" });

            var now = DateTime.Now;
            var oldStatus = booking.BookingStatus;

            booking.BookingStatus = BookingStatusConstant.Confirmed;

            // Lưu lịch sử
            _context.BookingStatusHistory.Add(new BookingStatusHistory
            {
                BookingID = booking.BookingID,
                OldStatus = oldStatus,
                NewStatus = BookingStatusConstant.Confirmed,
                ChangedAt = now,
                Note      = "Admin xác nhận thanh toán"
            });

            NotificationsController.AddNotification(
                _context,
                booking.UserID,
                "Thanh toán đã được xác nhận",
                $"Admin đã xác nhận thanh toán cho đơn #{booking.BookingID}.",
                1);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                booking.BookingID,
                booking.BookingStatus,
                booking.PaymentMethod,
                booking.TotalPrice,
                booking.BookingDate
            });
        }

        internal static string NormalizePaymentMethod(string? method)
        {
            var value = NormalizeOptionalText(method);
            if (value == null)
                return "BankTransfer";

            var lowered = value.ToLowerInvariant();
            if (lowered == "cash" || lowered == "tienmat" || lowered.Contains("tien mat"))
                return "Cash";

            if (lowered == "banktransfer" || lowered == "chuyenkhoan" || lowered.Contains("chuyen khoan"))
                return "BankTransfer";

            if (lowered == "ewallet" || lowered == "vnpay" || lowered.Contains("vi dien tu"))
                return "EWallet";

            return value.Length > 30 ? value[..30] : value;
        }

        internal static bool IsPendingMethod(string method)
        {
            return string.Equals(method, "Cash", StringComparison.OrdinalIgnoreCase);
        }

        internal static string CreateTransactionCode(int bookingId)
        {
            return $"VEXEAZ-{bookingId}-{DateTime.Now:yyyyMMddHHmmss}";
        }

        private int? GetCurrentUserId()
        {
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(claimValue, out var userId) ? userId : null;
        }

        private static string? NormalizeOptionalText(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }

        // private static object ToResponse(Payment payment, Booking? booking)
        // {
        //     return new
        //     {
        //         payment.PaymentID,
        //         payment.BookingID,
        //         payment.Amount,
        //         payment.PaymentMethod,
        //         payment.PaymentStatus,
        //         payment.TransactionCode,
        //         payment.PaidAt,
        //         payment.CreatedAt,
        //         bookingStatus = booking?.BookingStatus,
        //         bookingPaymentStatus = booking?.PaymentStatus
        //     };
        // }
    }

    public class SimulatePaymentRequest
    {
        public int BookingID { get; set; }
        public decimal? Amount { get; set; }
        public string? PaymentMethod { get; set; }
        public string? TransactionCode { get; set; }
    }

    public class ConfirmPaymentRequest
    {
        public string? TransactionCode { get; set; }
    }
}
