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
                    x.CreatedAt
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

            await _context.SaveChangesAsync();

            return Ok(new
            {
                user.UserID,
                user.FullName,
                user.Email,
                user.Phone,
                user.Role,
                user.CreatedAt
            });
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
    }
}
