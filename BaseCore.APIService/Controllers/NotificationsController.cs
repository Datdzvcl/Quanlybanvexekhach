using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationsController : ControllerBase
    {
        private readonly MySqlDbContext _context;

        public NotificationsController(MySqlDbContext context)
        {
            _context = context;
        }

        [HttpGet("my")]
        [Authorize]
        public async Task<IActionResult> GetMyNotifications([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var userId = GetCurrentUserId();
            if (!userId.HasValue) return Unauthorized();

            page = page <= 0 ? 1 : page;
            pageSize = Math.Min(pageSize, 50);

            var query = _context.Notifications
                .AsNoTracking()
                .Where(n => n.UserID == userId.Value)
                .OrderByDescending(n => n.CreatedAt);

            var totalCount = await query.CountAsync();
            var unreadCount = await _context.Notifications
                .AsNoTracking()
                .CountAsync(n => n.UserID == userId.Value && !n.IsRead);

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(n => new
                {
                    n.NotificationID,
                    n.Title,
                    n.Message,
                    n.Type,
                    n.IsRead,
                    n.CreatedAt,
                    n.BookingID
                })
                .ToListAsync();

            return Ok(new { items, totalCount, unreadCount, page, pageSize });
        }

        [HttpPut("{id}/read")]
        [Authorize]
        public async Task<IActionResult> MarkRead(int id)
        {
            var userId = GetCurrentUserId();
            if (!userId.HasValue) return Unauthorized();

            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.NotificationID == id && n.UserID == userId.Value);

            if (notification == null) return NotFound();

            notification.IsRead = true;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã đánh dấu đã đọc." });
        }

        [HttpPut("read-all")]
        [Authorize]
        public async Task<IActionResult> MarkAllRead()
        {
            var userId = GetCurrentUserId();
            if (!userId.HasValue) return Unauthorized();

            var unread = await _context.Notifications
                .Where(n => n.UserID == userId.Value && !n.IsRead)
                .ToListAsync();

            foreach (var n in unread) n.IsRead = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã đánh dấu tất cả đã đọc." });
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
            return claim != null && int.TryParse(claim.Value, out var id) ? id : null;
        }

        public static async Task CreateAsync(MySqlDbContext context, int userId, string title, string message, byte type, int? bookingId = null)
        {
            var notification = new Notification
            {
                UserID = userId,
                Title = title,
                Message = message,
                Type = type,
                IsRead = false,
                CreatedAt = DateTime.Now,
                BookingID = bookingId
            };
            context.Notifications.Add(notification);
            await context.SaveChangesAsync();
        }
    }
}
