using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BaseCore.Common;
using BaseCore.Services.Authen;
using BaseCore.AuthService.Services;
using System.Collections.Concurrent;
using System.Security.Claims;

namespace BaseCore.AuthService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly IEmailService _emailService;
        private readonly string _secretKey;
        private const int TokenExpirationMinutes = 480;

        // In-memory OTP store: email → (otp, expiry)
        private static readonly ConcurrentDictionary<string, (string Otp, DateTime Expiry)> _otpStore = new();

        public AuthController(IUserService userService, IEmailService emailService, IConfiguration configuration)
        {
            _userService = userService;
            _emailService = emailService;
            _secretKey = configuration["Jwt:SecretKey"]
                ?? configuration["AppSettings:Secret"]
                ?? "YourSecretKeyForAuthenticationShouldBeLongEnough";
        }

        // POST /api/auth/login
        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var identifier = request?.GetLoginIdentifier();
            if (request == null || string.IsNullOrWhiteSpace(identifier) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { message = "Email hoặc số điện thoại và mật khẩu là bắt buộc" });

            var user = await _userService.Authenticate(identifier, request.Password);
            if (user == null)
                return Unauthorized(new { message = "Email/số điện thoại hoặc mật khẩu không đúng" });

            var token = TokenHelper.GenerateToken(_secretKey, TokenExpirationMinutes, user.UserID.ToString(), user.Email, user.Role);

            return Ok(new LoginResponse
            {
                Token = token,
                User = ToUserResponse(user),
                ExpiresIn = TokenExpirationMinutes * 60
            });
        }

        // POST /api/auth/register
        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (request == null)
                return BadRequest(new { message = "Yêu cầu không hợp lệ" });

            if (string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Phone) ||
                string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { message = "Email, số điện thoại và mật khẩu là bắt buộc" });

            if (request.Password.Length < 6)
                return BadRequest(new { message = "Mật khẩu phải ít nhất 6 ký tự" });

            try
            {
                var user = new BaseCore.Entities.User
                {
                    FullName  = request.FullName ?? request.Email.Trim(),
                    Email     = request.Email.Trim(),
                    Phone     = request.Phone.Trim(),
                    Role      = RoleConstant.Customer,
                    CreatedAt = DateTime.Now
                };

                var created = await _userService.Create(user, request.Password);
                return Ok(new { message = "Đăng ký thành công", user = ToUserResponse(created) });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Đăng ký thất bại: " + ex.Message });
            }
        }

        // GET /api/auth/me
        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> Me()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, out var userId))
                return Unauthorized(new { message = "Token không hợp lệ" });

            var user = await _userService.GetById(userId);
            if (user == null)
                return NotFound(new { message = "Không tìm thấy tài khoản" });

            return Ok(ToUserResponse(user));
        }

        // POST /api/auth/forgot-password
        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Email))
                return BadRequest(new { message = "Vui lòng nhập email" });

            var email = request.Email.Trim().ToLower();
            var user = await _userService.GetByLoginIdentifier(email);

            // Always return success to prevent email enumeration
            if (user == null)
                return Ok(new { message = "Nếu email tồn tại, mã OTP sẽ được gửi về hộp thư của bạn" });

            // Generate and store OTP (valid 15 minutes)
            var otp = Random.Shared.Next(100000, 999999).ToString();
            _otpStore[email] = (otp, DateTime.Now.AddMinutes(15));

            // Send OTP via email
            try
            {
                var subject = "Mã OTP đặt lại mật khẩu - VéXeAZ";
                var body    = OtpEmailTemplate.Build(otp);
                await _emailService.SendAsync(email, user.FullName ?? email, subject, body);
            }
            catch (Exception ex)
            {
                // Remove OTP if email failed so user must retry
                _otpStore.TryRemove(email, out _);
                return StatusCode(500, new { message = "Không thể gửi email. Vui lòng thử lại sau.", detail = ex.Message });
            }

            return Ok(new { message = "Mã OTP đã được gửi về hộp thư của bạn. Vui lòng kiểm tra email (kể cả thư mục Spam)." });
        }

        // POST /api/auth/reset-password
        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Email) ||
                string.IsNullOrWhiteSpace(request.Otp) ||
                string.IsNullOrWhiteSpace(request.NewPassword))
                return BadRequest(new { message = "Thiếu thông tin" });

            if (request.NewPassword.Length < 6)
                return BadRequest(new { message = "Mật khẩu mới phải ít nhất 6 ký tự" });

            var email = request.Email.Trim().ToLower();

            if (!_otpStore.TryGetValue(email, out var entry))
                return BadRequest(new { message = "Mã OTP không hợp lệ hoặc đã hết hạn" });

            if (entry.Expiry < DateTime.Now)
            {
                _otpStore.TryRemove(email, out _);
                return BadRequest(new { message = "Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại" });
            }

            if (entry.Otp != request.Otp.Trim())
                return BadRequest(new { message = "Mã OTP không đúng" });

            var user = await _userService.GetByLoginIdentifier(email);
            if (user == null)
                return NotFound(new { message = "Không tìm thấy tài khoản" });

            await _userService.Update(user, request.NewPassword);
            _otpStore.TryRemove(email, out _);

            return Ok(new { message = "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới." });
        }

        private static AuthUserResponse ToUserResponse(BaseCore.Entities.User user) =>
            new()
            {
                UserID   = user.UserID,
                FullName = user.FullName,
                Email    = user.Email,
                Phone    = user.Phone,
                Role     = user.Role
            };
    }

    // ── Request / Response models ──────────────────────────────────────────────

    public class LoginRequest
    {
        public string? Login { get; set; }
        public string? EmailOrPhone { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string Password { get; set; } = string.Empty;
        public string? GetLoginIdentifier() => Login ?? EmailOrPhone ?? Email ?? Phone;
    }

    public class LoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public AuthUserResponse User { get; set; } = new();
        public int ExpiresIn { get; set; }
    }

    public class AuthUserResponse
    {
        public int UserID { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public byte Role { get; set; }
    }

    public class RegisterRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public string Phone { get; set; } = string.Empty;
    }

    public class ForgotPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
    }

    public class ResetPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
