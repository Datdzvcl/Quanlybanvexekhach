using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using BaseCore.Common;
using BaseCore.Services.Authen;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace BaseCore.AuthService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly string _secretKey;
        private const int TokenExpirationMinutes = 480;

        public AuthController(IUserService userService, IConfiguration configuration)
        {
            _userService = userService;
            _secretKey = configuration["Jwt:SecretKey"]
                ?? configuration["AppSettings:Secret"]
                ?? "YourSecretKeyForAuthenticationShouldBeLongEnough";
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var loginIdentifier = request?.GetLoginIdentifier();
            if (request == null ||
                string.IsNullOrWhiteSpace(loginIdentifier) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Email or phone and password are required" });
            }

            var user = await _userService.Authenticate(loginIdentifier, request.Password);

            if (user == null)
                return Unauthorized(new { message = "Invalid email/phone or password" });

            var role = user.Role ?? RoleConstant.Customer;

            var token = TokenHelper.GenerateToken(
                _secretKey,
                TokenExpirationMinutes,
                user.UserID.ToString(),
                user.Email,
                role
            );

            return Ok(new LoginResponse
            {
                Token = token,
                User = ToUserResponse(user),
                ExpiresIn = TokenExpirationMinutes * 60
            });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (request == null)
                return BadRequest(new { message = "Invalid request" });

            if (string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Phone) ||
                string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { message = "Email, phone and password are required" });

            if (request.Password.Length < 6)
                return BadRequest(new { message = "Password must be at least 6 characters" });

            try
            {
                var user = new BaseCore.Entities.User
                {
                    FullName = request.FullName ?? request.Email.Trim(),
                    Email = request.Email.Trim(),
                    Phone = request.Phone.Trim(),
                    Role = RoleConstant.Customer,
                    CreatedAt = DateTime.Now
                };

                var createdUser = await _userService.Create(user, request.Password);

                return Ok(new
                {
                    message = "Registration successful",
                    user = ToUserResponse(createdUser)
                });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = "Registration failed: " + ex.Message });
            }
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> Me()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, out var userId))
                return Unauthorized(new { message = "Invalid token" });

            var user = await _userService.GetById(userId);
            if (user == null)
                return NotFound(new { message = "User not found" });

            return Ok(ToUserResponse(user));
        }

        private static AuthUserResponse ToUserResponse(BaseCore.Entities.User user)
        {
            return new AuthUserResponse
            {
                UserID = user.UserID,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                Role = user.Role ?? RoleConstant.Customer
            };
        }
    }

    public class LoginRequest
    {
        public string? Login { get; set; }
        public string? EmailOrPhone { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string Password { get; set; } = string.Empty;

        public string? GetLoginIdentifier()
        {
            return Login ?? EmailOrPhone ?? Email ?? Phone;
        }
    }

    public class LoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public AuthUserResponse User { get; set; } = new AuthUserResponse();
        public int ExpiresIn { get; set; }
    }

    public class AuthUserResponse
    {
        public int UserID { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }

    public class RegisterRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public string Phone { get; set; } = string.Empty;
    }
}
