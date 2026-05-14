using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Common;
using BaseCore.Entities;
using BaseCore.Repository;

namespace BaseCore.APIService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private static readonly HashSet<string> ValidRoles = new(StringComparer.OrdinalIgnoreCase)
        {
            "Admin",
            "Customer",
            "Operator"
        };

        private readonly MySqlDbContext _context;

        public UsersController(MySqlDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? fullName,
            [FromQuery] string? email,
            [FromQuery] string? phone,
            [FromQuery] string? role,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.Users.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(fullName))
            {
                var keyword = fullName.Trim();
                query = query.Where(x => EF.Functions.Like(x.FullName, $"%{keyword}%"));
            }

            if (!string.IsNullOrWhiteSpace(email))
            {
                var keyword = email.Trim();
                query = query.Where(x => EF.Functions.Like(x.Email, $"%{keyword}%"));
            }

            if (!string.IsNullOrWhiteSpace(phone))
            {
                var keyword = phone.Trim();
                query = query.Where(x => EF.Functions.Like(x.Phone, $"%{keyword}%"));
            }

            if (!string.IsNullOrWhiteSpace(role))
            {
                var keyword = role.Trim();
                query = query.Where(x => x.Role != null && x.Role == keyword);
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(x => x.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new
                {
                    x.UserID,
                    x.FullName,
                    x.Email,
                    x.Phone,
                    x.Role,
                    x.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                items,
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var user = await _context.Users
                .AsNoTracking()
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

            if (user == null)
                return NotFound();

            return Ok(user);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] AdminCreateUserRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Phone) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Email, phone và password là bắt buộc" });
            }

            var role = NormalizeRole(request.Role);
            if (role == null)
                return BadRequest(new { message = "Role chỉ được là Admin, Customer hoặc Operator" });

            var email = request.Email.Trim();
            var phone = request.Phone.Trim();

            if (await _context.Users.AnyAsync(x => x.Email == email))
                return Conflict(new { message = "Email đã tồn tại" });

            if (await _context.Users.AnyAsync(x => x.Phone == phone))
                return Conflict(new { message = "Số điện thoại đã tồn tại" });

            var user = new User
            {
                FullName = string.IsNullOrWhiteSpace(request.FullName) ? email : request.FullName.Trim(),
                Email = email,
                Phone = phone,
                Role = role,
                PasswordHash = TokenHelper.CreatePasswordHash(request.Password),
                CreatedAt = DateTime.Now
            };

            _context.Users.Add(user);
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

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] AdminUpdateUserRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(x => x.UserID == id);
            if (user == null)
                return NotFound();

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                var email = request.Email.Trim();
                if (await _context.Users.AnyAsync(x => x.Email == email && x.UserID != id))
                    return Conflict(new { message = "Email đã tồn tại" });

                user.Email = email;
            }

            if (!string.IsNullOrWhiteSpace(request.Phone))
            {
                var phone = request.Phone.Trim();
                if (await _context.Users.AnyAsync(x => x.Phone == phone && x.UserID != id))
                    return Conflict(new { message = "Số điện thoại đã tồn tại" });

                user.Phone = phone;
            }

            if (!string.IsNullOrWhiteSpace(request.FullName))
                user.FullName = request.FullName.Trim();

            if (!string.IsNullOrWhiteSpace(request.Role))
            {
                var role = NormalizeRole(request.Role);
                if (role == null)
                    return BadRequest(new { message = "Role chỉ được là Admin, Customer hoặc Operator" });

                user.Role = role;
            }

            if (!string.IsNullOrWhiteSpace(request.Password))
                user.PasswordHash = TokenHelper.CreatePasswordHash(request.Password);

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

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound();

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok();
        }

        private static string? NormalizeRole(string? role)
        {
            var value = string.IsNullOrWhiteSpace(role) ? "Customer" : role.Trim();
            return ValidRoles.Contains(value) ? ValidRoles.First(x => x.Equals(value, StringComparison.OrdinalIgnoreCase)) : null;
        }
    }

    public class AdminCreateUserRequest
    {
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Password { get; set; }
        public string? Role { get; set; }
    }

    public class AdminUpdateUserRequest
    {
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Password { get; set; }
        public string? Role { get; set; }
    }
}
