using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BaseCore.Entities;
using BaseCore.Services.Authen;
using System.Security.Claims;

namespace BaseCore.AuthService.Controllers
{
    [Route("api/users")]
    [ApiController]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll(
            [FromQuery] string keyword = "",
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var (users, totalCount) = await _userService.Search(keyword, page, pageSize);

            var result = users.Select(u => new UserResponse
            {
                UserID = u.UserID,
                FullName = u.FullName,
                Email = u.Email,
                Phone = u.Phone,
                Role = u.Role,
                CreatedAt = u.CreatedAt
            });

            return Ok(new
            {
                data = result,
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var user = await _userService.GetById(id);

            if (user == null)
                return NotFound(new { message = "User not found" });

            return Ok(new UserResponse
            {
                UserID = user.UserID,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                Role = user.Role,
                CreatedAt = user.CreatedAt
            });
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
        {
            if (request == null)
                return BadRequest(new { message = "Invalid request" });

            if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
                return BadRequest(new { message = "Email and password are required" });

            try
            {
                var user = new User
                {
                    FullName = request.FullName ?? request.Email,
                    Email = request.Email,
                    Phone = request.Phone,
                    Role = request.Role ?? "Customer",
                    CreatedAt = DateTime.Now
                };

                var createdUser = await _userService.Create(user, request.Password);

                return CreatedAtAction(nameof(GetById), new { id = createdUser.UserID }, new UserResponse
                {
                    UserID = createdUser.UserID,
                    FullName = createdUser.FullName,
                    Email = createdUser.Email,
                    Phone = createdUser.Phone,
                    Role = createdUser.Role,
                    CreatedAt = createdUser.CreatedAt
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to create user: " + ex.Message });
            }
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserRequest request)
        {
            if (request == null)
                return BadRequest(new { message = "Invalid request" });

            var existingUser = await _userService.GetById(id);

            if (existingUser == null)
                return NotFound(new { message = "User not found" });

            existingUser.FullName = request.FullName ?? existingUser.FullName;
            existingUser.Email = request.Email ?? existingUser.Email;
            existingUser.Phone = request.Phone ?? existingUser.Phone;
            if (User.IsInRole("Admin"))
            {
                existingUser.Role = request.Role ?? existingUser.Role;
            }

            await _userService.Update(existingUser, request.Password);

            return Ok(new UserResponse
            {
                UserID = existingUser.UserID,
                FullName = existingUser.FullName,
                Email = existingUser.Email,
                Phone = existingUser.Phone,
                Role = existingUser.Role,
                CreatedAt = existingUser.CreatedAt
            });
        }

        [HttpPut("{id:int}/profile")]
        public async Task<IActionResult> UpdateProfile(int id, [FromBody] UpdateProfileRequest request)
        {
            if (request == null)
                return BadRequest(new { message = "Invalid request" });

            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = User.IsInRole("Admin");

            if (!isAdmin && currentUserId != id.ToString())
                return Forbid();

            var existingUser = await _userService.GetById(id);

            if (existingUser == null)
                return NotFound(new { message = "User not found" });

            existingUser.FullName = request.FullName ?? existingUser.FullName;
            existingUser.Email = request.Email ?? existingUser.Email;
            existingUser.Phone = request.Phone ?? existingUser.Phone;

            await _userService.Update(existingUser);

            return Ok(new UserResponse
            {
                UserID = existingUser.UserID,
                FullName = existingUser.FullName,
                Email = existingUser.Email,
                Phone = existingUser.Phone,
                Role = existingUser.Role,
                CreatedAt = existingUser.CreatedAt
            });
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var existingUser = await _userService.GetById(id);

            if (existingUser == null)
                return NotFound(new { message = "User not found" });

            await _userService.Delete(id);
            return NoContent();
        }
    }

    public class UserResponse
    {
        public int UserID { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public string? Role { get; set; }
        public DateTime? CreatedAt { get; set; }
    }

    public class CreateUserRequest
    {
        public string Email { get; set; }
        public string Password { get; set; }
        public string FullName { get; set; }
        public string Phone { get; set; }
        public string? Role { get; set; }
    }

    public class UpdateUserRequest
    {
        public string? Password { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Role { get; set; }
    }

    public class UpdateProfileRequest
    {
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
    }
}
