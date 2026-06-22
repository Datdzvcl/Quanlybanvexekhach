using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Common;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewsController : ControllerBase
    {
        private readonly MySqlDbContext _context;

        public ReviewsController(MySqlDbContext context)
        {
            _context = context;
        }

        [HttpGet("booking/{bookingId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetByBooking(int bookingId)
        {
            var review = await _context.Reviews
                .AsNoTracking()
                .Where(r => r.BookingID == bookingId)
                .Select(r => new
                {
                    r.ReviewID,
                    r.BookingID,
                    r.UserID,
                    r.TripID,
                    r.Rating,
                    r.Comment,
                    r.CreatedAt
                })
                .FirstOrDefaultAsync();

            if (review == null) return NotFound(new { message = "Chưa có đánh giá." });
            return Ok(review);
        }

        [HttpGet("trip/{tripId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetByTrip(int tripId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            page = page <= 0 ? 1 : page;
            pageSize = Math.Min(pageSize, 50);

            var query = _context.Reviews
                .AsNoTracking()
                .Where(r => r.TripID == tripId)
                .OrderByDescending(r => r.CreatedAt);

            var totalCount = await query.CountAsync();
            var averageRating = totalCount > 0 ? await query.AverageAsync(r => (double)r.Rating) : 0;

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Join(_context.Users, r => r.UserID, u => u.UserID, (r, u) => new
                {
                    r.ReviewID,
                    r.Rating,
                    r.Comment,
                    r.CreatedAt,
                    userName = u.FullName
                })
                .ToListAsync();

            return Ok(new { items, totalCount, averageRating, page, pageSize });
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateReview([FromBody] CreateReviewRequest request)
        {
            var userId = GetCurrentUserId();
            if (!userId.HasValue) return Unauthorized();

            if (request.Rating < 1 || request.Rating > 5)
                return BadRequest(new { message = "Đánh giá phải từ 1 đến 5 sao." });

            var booking = await _context.Bookings
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.BookingID == request.BookingID && b.UserID == userId.Value);

            if (booking == null)
                return NotFound(new { message = "Không tìm thấy đặt vé." });

            if (booking.BookingStatus != DomainCodes.BookingCompleted)
                return BadRequest(new { message = "Chỉ có thể đánh giá sau khi chuyến xe hoàn thành." });

            var existing = await _context.Reviews.AnyAsync(r => r.BookingID == request.BookingID);
            if (existing)
                return BadRequest(new { message = "Bạn đã đánh giá chuyến này rồi." });

            var review = new Review
            {
                BookingID = request.BookingID,
                UserID = userId.Value,
                TripID = booking.TripID,
                Rating = request.Rating,
                Comment = request.Comment?.Trim(),
                CreatedAt = DateTime.Now
            };

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đánh giá thành công.", reviewId = review.ReviewID });
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
            return claim != null && int.TryParse(claim.Value, out var id) ? id : null;
        }
    }

    public class CreateReviewRequest
    {
        public int BookingID { get; set; }
        public byte Rating { get; set; }
        public string? Comment { get; set; }
    }
}
