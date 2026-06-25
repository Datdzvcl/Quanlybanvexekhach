using BaseCore.Repository;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [Route("api/profile")]
    [ApiController]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly MySqlDbContext _context;

        public ProfileController(MySqlDbContext context)
        {
            _context = context;
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var user = await _context.Users
                .Where(x => x.UserID == id)
                .Select(x => new
                {
                    x.UserID,
                    x.FullName,
                    x.Email,
                    x.Phone,
                    x.Role,
                    x.CreatedAt,
                    x.DateOfBirth,
                    x.Gender,
                    x.IdentityNumber,
                    x.AvatarUrl
                })
                .FirstOrDefaultAsync();

            if (user == null) return NotFound(new { message = "User not found" });
            if (!CanAccessUser(user.UserID, user.Email)) return Forbid();

            return Ok(user);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateProfileRequest request)
        {
            if (request == null) return BadRequest(new { message = "Invalid request" });

            var user = await _context.Users.FirstOrDefaultAsync(x => x.UserID == id);
            if (user == null) return NotFound(new { message = "User not found" });
            if (!CanAccessUser(user.UserID, user.Email)) return Forbid();

            user.FullName = request.FullName ?? user.FullName;
            user.Email = request.Email ?? user.Email;
            user.Phone = request.Phone ?? user.Phone;
            if (request.DateOfBirth.HasValue) user.DateOfBirth = request.DateOfBirth;
            if (request.Gender.HasValue) user.Gender = request.Gender;
            if (request.IdentityNumber != null) user.IdentityNumber = request.IdentityNumber.Trim();
            if (request.AvatarUrl != null) user.AvatarUrl = request.AvatarUrl.Trim();

            await _context.SaveChangesAsync();

            return Ok(new
            {
                user.UserID,
                user.FullName,
                user.Email,
                user.Phone,
                user.Role,
                user.CreatedAt,
                user.DateOfBirth,
                user.Gender,
                user.IdentityNumber,
                user.AvatarUrl
            });
        }

        [HttpPost("upload-avatar")]
        public async Task<IActionResult> UploadAvatar(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Không có file được chọn" });

            if (file.Length > 2 * 1024 * 1024)
                return BadRequest(new { message = "Ảnh không được vượt quá 2MB" });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            string[] allowedExt = [".jpg", ".jpeg", ".png", ".webp"];
            if (!allowedExt.Contains(ext))
                return BadRequest(new { message = "Chỉ chấp nhận JPG, PNG, WEBP" });

            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, out var userId)) return Unauthorized();

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            // Xóa ảnh cũ nếu là file local
            if (!string.IsNullOrEmpty(user.AvatarUrl) && user.AvatarUrl.StartsWith("/uploads/avatars/"))
            {
                var oldPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot",
                    user.AvatarUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                if (System.IO.File.Exists(oldPath))
                    System.IO.File.Delete(oldPath);
            }

            var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "avatars");
            Directory.CreateDirectory(uploadsDir);

            var fileName = $"{userId}_{Guid.NewGuid():N}{ext}";
            var filePath = Path.Combine(uploadsDir, fileName);
            using (var stream = new FileStream(filePath, FileMode.Create))
                await file.CopyToAsync(stream);

            user.AvatarUrl = $"/uploads/avatars/{fileName}";
            await _context.SaveChangesAsync();

            return Ok(new { avatarUrl = user.AvatarUrl });
        }

        private bool CanAccessUser(int id, string email)
        {
            if (User.IsInRole("Admin")) return true;
            var tokenUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var tokenEmail = User.FindFirstValue(ClaimTypes.Name);

            return tokenUserId == id.ToString()
                || string.Equals(tokenEmail, email, StringComparison.OrdinalIgnoreCase);
        }
    }

    public class UpdateProfileRequest
    {
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public byte? Gender { get; set; }
        public string? IdentityNumber { get; set; }
        public string? AvatarUrl { get; set; }
    }
}
