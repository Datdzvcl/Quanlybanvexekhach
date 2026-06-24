using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using System.Security.Claims;
using BaseCore.DTO;
using BaseCore.Common;
namespace BaseCore.APIService.Controllers
{
    [Route("api/reviews")]
    [ApiController]
    public class ReviewsController : ControllerBase
    {
        private readonly MySqlDbContext _context;

        public ReviewsController(MySqlDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> GetAll(int page = 1, int pageSize = 20, int? tripId = null, int? operatorId = null)
        {
            page = page <= 0 ? 1 : page;
            pageSize = pageSize <= 0 ? 20 : Math.Min(pageSize, 100);

            // var query = _context.Reviews
            //     .AsNoTracking()
            //     .Include(x => x.User)
            //     .Include(x => x.Booking)
            //     .Include(x => x.Trip).ThenInclude(x => x.Bus).ThenInclude(x => x.Operator)
            //     .AsQueryable();

            // if (tripId.HasValue)
            //     query = query.Where(x => x.TripID == tripId.Value);

            // if (operatorId.HasValue)
            //     query = query.Where(x => x.Trip != null && x.Trip.Bus != null && x.Trip.Bus.OperatorID == operatorId.Value);
            var query = _context.Reviews
                .AsNoTracking()
                .Include(x => x.User)
                .Include(x => x.Booking).ThenInclude(x => x.Trip).ThenInclude(x => x.Bus).ThenInclude(x => x.Operator)
                .AsQueryable();
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (int.TryParse(userIdClaim, out var userId))
            {
                var currentUser = await _context.Users.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.UserID == userId);
                if (currentUser?.OperatorID != null)
                    query = query.Where(x => x.Booking.Trip.Bus.OperatorID == currentUser.OperatorID);
            }
            if (tripId.HasValue)
                query = query.Where(x => x.Booking.TripID == tripId.Value);

            if (operatorId.HasValue)
                query = query.Where(x => x.Booking.Trip.Bus.OperatorID == operatorId.Value);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(x => x.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                // .Select(x => new
                // {
                //     x.ReviewID,
                //     x.BookingID,
                //     x.UserID,
                //     // x.TripID,
                //     x.Rating,
                //     x.Comment,
                //     x.CreatedAt,
                //     userName = x.User == null ? null : x.User.FullName,
                //     customerName = x.Booking == null ? null : x.Booking.CustomerName,
                //     operatorName = x.Trip == null || x.Trip.Bus == null || x.Trip.Bus.Operator == null
                //         ? null
                //         : x.Trip.Bus.Operator.Name,
                //     route = x.Trip == null ? null : $"{x.Trip.DepartureLocation} - {x.Trip.ArrivalLocation}"
                // })
                .Select(x => new
                {
                    x.ReviewID,
                    x.BookingID,
                    x.UserID,
                    TripID = x.Booking.TripID,
                    x.Rating,
                    x.Comment,
                    x.CreatedAt,
                    userName = x.User == null ? null : x.User.FullName,
                    customerName = x.Booking == null ? null : x.Booking.CustomerName,
                    operatorName = x.Booking.Trip.Bus.Operator == null ? null : x.Booking.Trip.Bus.Operator.Name,
                    route = x.Booking.Trip == null ? null : $"{x.Booking.Trip.DepartureLocation} - {x.Booking.Trip.ArrivalLocation}"
                })
                .ToListAsync();

            return Ok(new
            {
                items,
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            });
        }

        [HttpGet("suggest-trips")]
        [Authorize(Roles = "Admin,Operator")]
        public async Task<IActionResult> SuggestTrips([FromQuery] string? q, [FromQuery] int take = 8)
        {
            if (string.IsNullOrWhiteSpace(q))
                return Ok(new List<object>());

            take = Math.Clamp(take, 1, 20);
            q = q.Trim();
            var operatorId = await GetCurrentOperatorId();
            var isNumeric = int.TryParse(q, out var tripIdSearch);

            var query = _context.Trips
                .AsNoTracking()
                .Include(x => x.Bus).ThenInclude(x => x.Operator)
                .AsQueryable();

            if (operatorId.HasValue)
                query = query.Where(x => x.Bus != null && x.Bus.OperatorID == operatorId.Value);

            query = isNumeric
                ? query.Where(x =>
                    x.TripID == tripIdSearch ||
                    x.DepartureLocation.Contains(q) ||
                    x.ArrivalLocation.Contains(q) ||
                    (x.Bus != null && x.Bus.Operator != null && x.Bus.Operator.Name.Contains(q)))
                : query.Where(x =>
                    x.DepartureLocation.Contains(q) ||
                    x.ArrivalLocation.Contains(q) ||
                    (x.Bus != null && x.Bus.Operator != null && x.Bus.Operator.Name.Contains(q)));

            var results = await query
                .OrderByDescending(x => x.DepartureTime)
                .Take(take)
                .Select(x => new
                {
                    x.TripID,
                    x.DepartureLocation,
                    x.ArrivalLocation,
                    x.DepartureTime,
                    OperatorName = x.Bus == null || x.Bus.Operator == null ? null : x.Bus.Operator.Name,
                    Route = $"{x.DepartureLocation} → {x.ArrivalLocation}",
                    ReviewCount = _context.Reviews.Count(r => r.Booking != null && r.Booking.TripID == x.TripID)
                })
                .ToListAsync();

            return Ok(results);
        }

        [HttpGet("suggest-operators")]
        [Authorize(Roles = "Admin,Operator")]
        public async Task<IActionResult> SuggestOperators([FromQuery] string? q, [FromQuery] int take = 8)
        {
            if (string.IsNullOrWhiteSpace(q))
                return Ok(new List<object>());

            take = Math.Clamp(take, 1, 20);
            q = q.Trim();
            var currentOperatorId = await GetCurrentOperatorId();
            var isNumeric = int.TryParse(q, out var operatorIdSearch);

            var query = _context.Operators
                .AsNoTracking()
                .AsQueryable();

            if (currentOperatorId.HasValue)
                query = query.Where(x => x.OperatorID == currentOperatorId.Value);

            query = isNumeric
                ? query.Where(x =>
                    x.OperatorID == operatorIdSearch ||
                    x.Name.Contains(q))
                : query.Where(x =>
                    x.Name.Contains(q) ||
                    x.ContactPhone.Contains(q) ||
                    x.Email.Contains(q));

            var results = await query
                .OrderBy(x => x.Name)
                .Take(take)
                .Select(x => new
                {
                    x.OperatorID,
                    x.Name,
                    x.ContactPhone,
                    x.Email,
                    ReviewCount = _context.Reviews.Count(r =>
                        r.Booking != null &&
                        r.Booking.Trip != null &&
                        r.Booking.Trip.Bus != null &&
                        r.Booking.Trip.Bus.OperatorID == x.OperatorID)
                })
                .ToListAsync();

            return Ok(results);
        }

        [HttpGet("trip/{tripId:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetByTrip(int tripId)
        {
            // var reviews = await _context.Reviews
            //     .AsNoTracking()
            //     .Include(x => x.User)
            //     .Where(x => x.TripID == tripId)
            //     .OrderByDescending(x => x.CreatedAt)
            //     .Select(x => new
            //     {
            //         x.ReviewID,
            //         x.BookingID,
            //         x.UserID,
            //         x.TripID,
            //         x.Rating,
            //         x.Comment,
            //         x.CreatedAt,
            //         userName = x.User == null ? null : x.User.FullName
            //     })
            //     .ToListAsync();
            var reviews = await _context.Reviews
                .AsNoTracking()
                .Include(x => x.User)
                .Include(x => x.Booking)
                .Where(x => x.Booking.TripID == tripId)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new
                {
                    x.ReviewID,
                    x.BookingID,
                    x.UserID,
                    TripID = x.Booking.TripID,
                    x.Rating,
                    x.Comment,
                    x.CreatedAt,
                    userName = x.User == null ? null : x.User.FullName
                })
                .ToListAsync();
            return Ok(new
            {
                items = reviews,
                averageRating = reviews.Count == 0 ? 0 : Math.Round(reviews.Average(x => x.Rating), 1),
                reviewCount = reviews.Count
            });
        }

        [HttpGet("operator/{operatorId:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetByOperator(int operatorId)
        {
            // var reviews = await _context.Reviews
            //     .AsNoTracking()
            //     .Include(x => x.User)
            //     .Include(x => x.Trip).ThenInclude(x => x.Bus)
            //     .Where(x => x.Trip != null && x.Trip.Bus != null && x.Trip.Bus.OperatorID == operatorId)
            //     .OrderByDescending(x => x.CreatedAt)
            //     .Select(x => new
            //     {
            //         x.ReviewID,
            //         x.BookingID,
            //         x.UserID,
            //         x.TripID,
            //         x.Rating,
            //         x.Comment,
            //         x.CreatedAt,
            //         userName = x.User == null ? null : x.User.FullName
            //     })
            //     .ToListAsync();
            var reviews = await _context.Reviews
                .AsNoTracking()
                .Include(x => x.User)
                .Include(x => x.Booking).ThenInclude(x => x.Trip).ThenInclude(x => x.Bus)
                .Where(x => x.Booking.Trip.Bus.OperatorID == operatorId && !x.IsHidden)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new
                {
                    x.ReviewID,
                    x.BookingID,
                    x.UserID,
                    TripID = x.Booking.TripID,
                    x.Rating,
                    x.Comment,
                    x.CreatedAt,
                    x.ReplyContent,
                    x.RepliedAt,
                    userName = x.User == null ? null : x.User.FullName,
                    route = x.Booking.Trip == null ? null : $"{x.Booking.Trip.DepartureLocation} → {x.Booking.Trip.ArrivalLocation}"
                })
                .ToListAsync();
            return Ok(new
            {
                items = reviews,
                averageRating = reviews.Count == 0 ? 0 : Math.Round(reviews.Average(x => x.Rating), 1),
                reviewCount = reviews.Count
            });
        }

        [HttpGet("booking/{bookingId:int}")]
        [Authorize]
        public async Task<IActionResult> GetByBooking(int bookingId)
        {
            var review = await _context.Reviews
                .AsNoTracking()
                .Include(x => x.User)
                .Include(x => x.Booking)
                .FirstOrDefaultAsync(x => x.BookingID == bookingId);

            if (review == null)
                return NotFound(new { message = "Booking chua co danh gia" });

            if (!User.IsInRole("Admin"))
            {
                var currentUserId = GetCurrentUserId();
                if (!currentUserId.HasValue || review.UserID != currentUserId.Value)
                    return Forbid();
            }

            return Ok(ToReviewResponse(review));
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Create([FromBody] ReviewRequest request)
        {
            var currentUserId = GetCurrentUserId();
            if (!currentUserId.HasValue)
                return Unauthorized(new { message = "Token khong hop le" });

            if (request.Rating < 1 || request.Rating > 5)
                return BadRequest(new { message = "Rating phai tu 1 den 5" });

            var booking = await _context.Bookings
                .Include(x => x.Trip).ThenInclude(x => x.Bus).ThenInclude(x => x.Operator)
                .FirstOrDefaultAsync(x => x.BookingID == request.BookingID);

            if (booking == null)
                return NotFound(new { message = "Khong tim thay booking" });

            if (booking.UserID != currentUserId.Value)
                return Forbid();

            if (await _context.Reviews.AnyAsync(x => x.BookingID == booking.BookingID))
                return Conflict(new { message = "Booking nay da duoc danh gia" });

            if (!CanReview(booking))
                return BadRequest(new { message = "Chi co the danh gia khi chuyen da hoan thanh hoac da qua gio den" });

            var review = new Review
            {
                BookingID = booking.BookingID,
                UserID = currentUserId.Value,
                // TripID = booking.TripID,
                Rating = request.Rating,
                Comment = NormalizeComment(request.Comment),
                CreatedAt = DateTime.Now
            };

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            review.Booking = booking;
            review.User = await _context.Users.AsNoTracking().FirstOrDefaultAsync(x => x.UserID == currentUserId.Value);

            return Ok(ToReviewResponse(review));
        }

        [HttpPut("{id:int}")]
        [Authorize]
        public async Task<IActionResult> Update(int id, [FromBody] ReviewRequest request)
        {
            var review = await _context.Reviews.FirstOrDefaultAsync(x => x.ReviewID == id);
            if (review == null)
                return NotFound(new { message = "Khong tim thay danh gia" });

            if (!User.IsInRole("Admin"))
            {
                var currentUserId = GetCurrentUserId();
                if (!currentUserId.HasValue || review.UserID != currentUserId.Value)
                    return Forbid();

                if (review.EditedAt != null)
                    return BadRequest(new { message = "Đánh giá chỉ được chỉnh sửa 1 lần." });
            }

            if (request.Rating < 1 || request.Rating > 5)
                return BadRequest(new { message = "Rating phai tu 1 den 5" });

            review.Rating = request.Rating;
            review.Comment = NormalizeComment(request.Comment);
            review.EditedAt = DateTime.Now;
            await _context.SaveChangesAsync();

           var updated = await _context.Reviews
            .AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.Booking).ThenInclude(x => x.Trip).ThenInclude(x => x.Bus).ThenInclude(x => x.Operator)
            // .Include(x => x.Trip).ThenInclude(x => x.Bus).ThenInclude(x => x.Operator)  ← xóa dòng này
            .FirstAsync(x => x.ReviewID == id);

            return Ok(ToReviewResponse(updated));
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null)
                return NotFound(new { message = "Khong tim thay danh gia" });

            _context.Reviews.Remove(review);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Da xoa danh gia" });
        }

        private int? GetCurrentUserId()
        {
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(claimValue, out var userId) ? userId : null;
        }

        private async Task<int?> GetCurrentOperatorId()
        {
            if (User.IsInRole("Admin"))
                return null;

            var currentUserId = GetCurrentUserId();
            if (!currentUserId.HasValue)
                return null;

            return await _context.Users
                .AsNoTracking()
                .Where(x => x.UserID == currentUserId.Value)
                .Select(x => x.OperatorID)
                .FirstOrDefaultAsync();
        }

        private static bool CanReview(Booking booking)
        {
            if (booking.Trip == null)
                return false;

            // var bookingStatus = booking.BookingStatus ;
            // if (string.Equals(bookingStatus, "Cancelled", StringComparison.OrdinalIgnoreCase) ||
            //     string.Equals(bookingStatus, "CancelRequested", StringComparison.OrdinalIgnoreCase))
            //     return false;
            var bookingStatus = booking.BookingStatus;
            if (bookingStatus == BookingStatusConstant.Cancelled ||
                bookingStatus == BookingStatusConstant.CancelRequested)
                return false;
            return booking.Trip.Status == TripStatusConstant.Completed ||
                booking.Trip.ArrivalTime <= DateTime.Now;
        }

        private static string? NormalizeComment(string? comment)
        {
            var value = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim();
            return value == null || value.Length <= 500 ? value : value[..500];
        }

        private static object ToReviewResponse(Review review)
        {
            return new
            {
                review.ReviewID,
                review.BookingID,
                review.UserID,
                TripID = review.Booking?.TripID,
                review.Rating,
                review.Comment,
                review.CreatedAt,
                review.EditedAt,
                review.ReplyContent,
                review.RepliedAt,
                userName = review.User == null ? null : review.User.FullName,
                customerName = review.Booking == null ? null : review.Booking.CustomerName,
                operatorName = review.Booking?.Trip?.Bus?.Operator?.Name,
                route = review.Booking?.Trip == null ? null
                    : $"{review.Booking.Trip.DepartureLocation} - {review.Booking.Trip.ArrivalLocation}"
            };
        }
        [HttpGet]
[Authorize(Roles = "Admin,Operator")]  // ← thêm Admin vào
public async Task<IActionResult> GetAll(
    int page = 1, int pageSize = 20,
    string? keyword = null,
    int? rating = null,
    int? hasReply = null,
    bool? isHidden = null,
    DateTime? fromDate = null,
    DateTime? toDate = null)
{
    page = page <= 0 ? 1 : page;
    pageSize = pageSize <= 0 ? 20 : Math.Min(pageSize, 100);

    var query = _context.Reviews
        .AsNoTracking()
        .Include(x => x.User)
        .Include(x => x.Booking)
            .ThenInclude(x => x.Trip)
                .ThenInclude(x => x.Bus)
                    .ThenInclude(x => x.Operator)
        .AsQueryable();

    // Operator chỉ thấy reviews của nhà xe mình
    if (User.IsInRole("Operator"))
    {
        var operatorId = await GetCurrentOperatorId();
        if (operatorId.HasValue)
            query = query.Where(x => x.Booking.Trip.Bus.OperatorID == operatorId.Value);
    }

    // Filter keyword (tên/SĐT khách) — Admin
    if (!string.IsNullOrWhiteSpace(keyword))
        query = query.Where(x =>
            x.Booking.CustomerName.Contains(keyword) ||
            x.Booking.CustomerPhone.Contains(keyword));

    // Filter rating
    if (rating.HasValue)
        query = query.Where(x => x.Rating == rating.Value);

    // Filter hasReply (Operator)
    if (hasReply.HasValue)
        query = hasReply.Value == 1
            ? query.Where(x => x.ReplyContent != null && x.ReplyContent != "")
            : query.Where(x => x.ReplyContent == null || x.ReplyContent == "");

    // Filter isHidden (Admin)
    if (isHidden.HasValue)
        query = query.Where(x => x.IsHidden == isHidden.Value);

    // Filter fromDate/toDate theo CreatedAt
    if (fromDate.HasValue)
        query = query.Where(x => x.CreatedAt >= fromDate.Value);
    if (toDate.HasValue)
        query = query.Where(x => x.CreatedAt <= toDate.Value);

    var totalCount = await query.CountAsync();
    var items = await query
        .OrderByDescending(x => x.CreatedAt)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(x => new
        {
            x.ReviewID,
            x.BookingID,
            x.UserID,
            x.Rating,
            x.Comment,
            x.CreatedAt,
            x.ReplyContent,
            x.RepliedAt,
            x.IsHidden,
            customerName = x.Booking.CustomerName,
            customerPhone = x.Booking.CustomerPhone,
            operatorName = x.Booking.Trip.Bus.Operator == null
                ? null : x.Booking.Trip.Bus.Operator.Name,
            departureLocation = x.Booking.Trip.DepartureLocation,
            arrivalLocation   = x.Booking.Trip.ArrivalLocation,
            departureTime     = x.Booking.Trip.DepartureTime,
        })
        .ToListAsync();

    return Ok(new { items, totalCount, page, pageSize,
        totalPages = (int)Math.Ceiling(totalCount / (double)pageSize) });
}

// ── PUT /api/reviews/{id}/reply ──────────────────────────────
[HttpPut("{id:int}/reply")]
[Authorize(Roles = "Admin,Operator")]
public async Task<IActionResult> Reply(int id, [FromBody] ReplyRequest request)
{
    var review = await _context.Reviews
        .Include(x => x.Booking).ThenInclude(x => x.Trip)
            .ThenInclude(x => x.Bus)
        .FirstOrDefaultAsync(x => x.ReviewID == id);

    if (review == null)
        return NotFound(new { message = "Không tìm thấy đánh giá." });

    // Operator chỉ reply review của nhà xe mình
    if (User.IsInRole("Operator"))
    {
        var operatorId = await GetCurrentOperatorId();
        if (review.Booking?.Trip?.Bus?.OperatorID != operatorId)
            return Forbid();
    }

    // Chỉ reply 1 lần
    if (!string.IsNullOrWhiteSpace(review.ReplyContent))
        return BadRequest(new { message = "Đánh giá này đã được phản hồi." });

    review.ReplyContent = request.ReplyContent?.Trim();
    review.RepliedAt    = DateTime.Now;

    // Gửi thông báo cho khách hàng
    var bookingId = review.Booking?.BookingID;
    NotificationsController.AddNotification(
        _context,
        review.UserID,
        "Nhà xe đã phản hồi đánh giá của bạn",
        $"Đơn #{bookingId}: \"{review.ReplyContent?.Substring(0, Math.Min(review.ReplyContent?.Length ?? 0, 80))}\"",
        1,
        $"/my-tickets/{bookingId}");

    await _context.SaveChangesAsync();

    return Ok(new { message = "Đã gửi phản hồi.", review.ReplyContent, review.RepliedAt });
}

// ── PUT /api/reviews/{id}/hide — chỉ Admin ──────────────────
[HttpPut("{id:int}/hide")]
[Authorize(Roles = "Admin")]
public async Task<IActionResult> Hide(int id)
{
    var review = await _context.Reviews.FindAsync(id);
    if (review == null)
        return NotFound(new { message = "Không tìm thấy đánh giá." });

    review.IsHidden = true;
    await _context.SaveChangesAsync();
    return Ok(new { message = "Đã ẩn đánh giá." });
}

// ── PUT /api/reviews/{id}/show — chỉ Admin ──────────────────
[HttpPut("{id:int}/show")]
[Authorize(Roles = "Admin")]
    public async Task<IActionResult> Show(int id)
    {
        var review = await _context.Reviews.FindAsync(id);
        if (review == null)
            return NotFound(new { message = "Không tìm thấy đánh giá." });

        review.IsHidden = false;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Đã hiện đánh giá." });
    }
    [HttpGet("/api/operator/reviews")]
    [Authorize(Roles = "Operator")]
    public async Task<IActionResult> GetOperatorReviews(
        int page = 1, int pageSize = 20,
        int? rating = null,
        int? hasReply = null,
        DateTime? fromDate = null,
        DateTime? toDate = null)
    {
        // Gọi lại GetAll với params tương ứng
        return await GetAll(page, pageSize, null, rating, hasReply, null, fromDate, toDate);
    }
}
    // ── GET /api/reviews — fix cho cả Admin + Operator ──────────

    
    public class ReviewRequest
    {
        public int BookingID { get; set; }
        public byte Rating { get; set; }
        public string? Comment { get; set; }
    }
    public class ReplyRequest
    {
        public string? ReplyContent { get; set; }
    }
}
