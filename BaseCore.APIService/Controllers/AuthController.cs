using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Common;
using BaseCore.Repository;
using System.Collections.Concurrent;

namespace BaseCore.APIService.Controllers
{
    [Route("api/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly MySqlDbContext _context;
        private readonly IConfiguration _config;

        // OTP store: email → (otp, expiry)
        private static readonly ConcurrentDictionary<string, (string Otp, DateTime Expiry)> _otpStore = new();

        public AuthController(MySqlDbContext context, IConfiguration config)
        {
            _context = context;
            _config  = config;
        }

        // POST /api/auth/login
        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.EmailOrPhone) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { message = "Email/SĐT và mật khẩu là bắt buộc" });

            var input = request.EmailOrPhone.Trim();
            var user  = await _context.Users.FirstOrDefaultAsync(u =>
                u.Email == input || u.Phone == input);

            if (user == null || !TokenHelper.VerifyPasswordHash(request.Password, user.PasswordHash))
                return Unauthorized(new { message = "Email/SĐT hoặc mật khẩu không đúng" });

            var secretKey = _config["Jwt:SecretKey"] ?? "YourSecretKeyForAuthenticationShouldBeLongEnough";
            var token = TokenHelper.GenerateToken(secretKey, 60 * 24 * 7, user.UserID.ToString(), user.FullName, user.Role);

            return Ok(new {
                token,
                user = new {
                    user.UserID,
                    user.FullName,
                    user.Email,
                    user.Phone,
                    user.Role,
                    user.OperatorID,
                    user.AvatarUrl
                }
            });
        }

        // POST /api/auth/register
        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Phone) ||
                string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { message = "Email, SĐT và mật khẩu là bắt buộc" });

            var email = request.Email.Trim();
            var phone = request.Phone.Trim();

            if (await _context.Users.AnyAsync(u => u.Email == email))
                return Conflict(new { message = "Email đã tồn tại" });

            if (await _context.Users.AnyAsync(u => u.Phone == phone))
                return Conflict(new { message = "Số điện thoại đã tồn tại" });

            var user = new BaseCore.Entities.User
            {
                FullName     = string.IsNullOrWhiteSpace(request.FullName) ? email : request.FullName.Trim(),
                Email        = email,
                Phone        = phone,
                Role         = RoleConstant.Customer,
                PasswordHash = TokenHelper.CreatePasswordHash(request.Password),
                CreatedAt    = DateTime.Now
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đăng ký thành công" });
        }

        // GET /api/auth/me
        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            var idStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(idStr, out var userId)) return Unauthorized();

            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserID == userId);
            if (user == null) return NotFound();

            return Ok(new {
                user.UserID,
                user.FullName,
                user.Email,
                user.Phone,
                user.Role,
                user.OperatorID,
                user.AvatarUrl
            });
        }

        // POST /api/auth/forgot-password
        [AllowAnonymous]
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                return BadRequest(new { message = "Vui lòng nhập email" });

            var email = request.Email.Trim().ToLower();
            var user  = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

            // Luôn trả 200 để không lộ email có tồn tại hay không
            if (user == null)
                return Ok(new { message = "Nếu email tồn tại, mã OTP đã được gửi." });

            var otp    = new Random().Next(100000, 999999).ToString();
            var expiry = DateTime.Now.AddMinutes(10);
            _otpStore[email] = (otp, expiry);

            // TODO: Tích hợp dịch vụ email thực (SendGrid, SMTP, ...)
            // Tạm thời in ra console để test
            Console.WriteLine($"[OTP] Email: {email} | OTP: {otp} | Hết hạn: {expiry:HH:mm:ss}");

            return Ok(new { message = "Nếu email tồn tại, mã OTP đã được gửi." });
        }

        // POST /api/auth/reset-password
        [AllowAnonymous]
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Otp) ||
                string.IsNullOrWhiteSpace(request.NewPassword))
                return BadRequest(new { message = "Thiếu thông tin" });

            var email = request.Email.Trim().ToLower();

            if (!_otpStore.TryGetValue(email, out var stored))
                return BadRequest(new { message = "OTP không hợp lệ hoặc đã hết hạn" });

            if (stored.Otp != request.Otp.Trim())
                return BadRequest(new { message = "OTP không đúng" });

            if (stored.Expiry < DateTime.Now)
            {
                _otpStore.TryRemove(email, out _);
                return BadRequest(new { message = "OTP đã hết hạn. Vui lòng gửi lại." });
            }

            if (request.NewPassword.Length < 6)
                return BadRequest(new { message = "Mật khẩu phải có ít nhất 6 ký tự" });

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) return NotFound();

            user.PasswordHash = TokenHelper.CreatePasswordHash(request.NewPassword);
            _otpStore.TryRemove(email, out _);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đặt lại mật khẩu thành công" });
        }
    }

    public record LoginRequest(string EmailOrPhone, string Password);
    public record RegisterRequest(string? FullName, string? Email, string? Phone, string? Password);
    public record ForgotPasswordRequest(string Email);
    public record ResetPasswordRequest(string Email, string Otp, string NewPassword);
}
