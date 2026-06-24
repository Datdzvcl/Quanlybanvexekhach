using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [Route("api/notifications")]
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
        public async Task<IActionResult> GetMy(int take = 10)
        {
            var currentUserId = GetCurrentUserId();
            if (!currentUserId.HasValue)
                return Unauthorized(new { message = "Token khong hop le" });

            take = Math.Clamp(take, 1, 50);

            var query = _context.Notifications
                .AsNoTracking()
                .Where(x => x.UserID == currentUserId.Value)
                .OrderByDescending(x => x.CreatedAt)
                .ThenByDescending(x => x.NotificationID);

            var unreadCount = await query.CountAsync(x => !x.IsRead);
            var items = await query
                .Take(take)
                .Select(x => new
                {
                    x.NotificationID,
                    x.UserID,
                    x.Title,
                    x.Message,
                    x.Type,
                    x.IsRead,
                    x.CreatedAt
                })
                .ToListAsync();

            return Ok(new { items, unreadCount });
        }

        [HttpPut("{id:int}/read")]
        [Authorize]
        public async Task<IActionResult> MarkRead(int id)
        {
            var currentUserId = GetCurrentUserId();
            if (!currentUserId.HasValue)
                return Unauthorized(new { message = "Token khong hop le" });

            var notification = await _context.Notifications.FirstOrDefaultAsync(x => x.NotificationID == id);
            if (notification == null)
                return NotFound(new { message = "Khong tim thay thong bao" });

            if (notification.UserID != currentUserId.Value && !User.IsInRole("Admin"))
                return Forbid();

            notification.IsRead = true;
            await _context.SaveChangesAsync();

            return Ok(new { notification.NotificationID, notification.IsRead });
        }

        [HttpPut("read-all")]
        [Authorize]
        public async Task<IActionResult> MarkAllRead()
        {
            var currentUserId = GetCurrentUserId();
            if (!currentUserId.HasValue)
                return Unauthorized(new { message = "Token khong hop le" });

            var notifications = await _context.Notifications
                .Where(x => x.UserID == currentUserId.Value && !x.IsRead)
                .ToListAsync();

            foreach (var notification in notifications)
                notification.IsRead = true;

            await _context.SaveChangesAsync();
            return Ok(new { updated = notifications.Count });
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] NotificationRequest request)
        {
            if (request.UserID <= 0)
                return BadRequest(new { message = "UserID la bat buoc" });

            if (!await _context.Users.AnyAsync(x => x.UserID == request.UserID))
                return NotFound(new { message = "Khong tim thay user" });

            var notification = new Notification
            {
                UserID = request.UserID,
                Title = NormalizeText(request.Title, 200),
                Message = NormalizeText(request.Message, 500),
                Type = NormalizeType(request.Type),
                IsRead = false,
                CreatedAt = DateTime.Now
            };

            if (string.IsNullOrWhiteSpace(notification.Title) || string.IsNullOrWhiteSpace(notification.Message))
                return BadRequest(new { message = "Title va Message la bat buoc" });

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                notification.NotificationID,
                notification.UserID,
                notification.Title,
                notification.Message,
                notification.Type,
                notification.IsRead,
                notification.CreatedAt
            });
        }

        internal static void AddNotification(MySqlDbContext context, int? userId, string title, string message, byte type = 1, string? link = null)
        {
            if (!userId.HasValue || userId.Value <= 0)
                return;

            try
            {
                context.Notifications.Add(new Notification
                {
                    UserID = userId.Value,
                    Title = NormalizeText(title, 200),
                    Message = NormalizeText(message, 500),
                    Type = NormalizeType(type),
                    IsRead = false,
                    Link = link,
                    CreatedAt = DateTime.Now
                });
            }
            catch
            {
                // Notification must never block the main booking/payment flow.
            }
        }

        private int? GetCurrentUserId()
        {
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(claimValue, out var userId) ? userId : null;
        }

        private static byte NormalizeType(byte type)
        {
            return type is >= 1 and <= 4 ? type : (byte)1;
        }

        private static string NormalizeText(string? value, int maxLength)
        {
            var text = string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();
            return text.Length <= maxLength ? text : text[..maxLength];
        }
    }

    public class NotificationRequest
    {
        public int UserID { get; set; }
        public string? Title { get; set; }
        public string? Message { get; set; }
        public byte Type { get; set; } = 1;
    }
}
