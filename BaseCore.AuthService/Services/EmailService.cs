using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace BaseCore.AuthService.Services
{
    public interface IEmailService
    {
        Task SendAsync(string toEmail, string toName, string subject, string htmlBody);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendAsync(string toEmail, string toName, string subject, string htmlBody)
        {
            var smtpHost = _config["Email:SmtpHost"] ?? "smtp.gmail.com";
            var smtpPort = int.Parse(_config["Email:SmtpPort"] ?? "587");
            var smtpUser = _config["Email:SmtpUser"] ?? "";
            var smtpPass = _config["Email:SmtpPassword"] ?? "";
            var senderName = _config["Email:SenderName"] ?? "VéXeAZ";
            var senderEmail = _config["Email:SenderEmail"] ?? smtpUser;

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(senderName, senderEmail));
            message.To.Add(new MailboxAddress(toName, toEmail));
            message.Subject = subject;
            message.Body = new TextPart(MimeKit.Text.TextFormat.Html) { Text = htmlBody };

            using var client = new SmtpClient();
            await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(smtpUser, smtpPass);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
    }

    public static class OtpEmailTemplate
    {
        public static string Build(string otp) => $"""
            <!DOCTYPE html>
            <html lang="vi">
            <head><meta charset="UTF-8" /></head>
            <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
                <tr><td align="center">
                  <table width="480" cellpadding="0" cellspacing="0"
                         style="background:#fff;border-radius:20px;overflow:hidden;
                                box-shadow:0 4px 24px rgba(0,0,0,.08);">
                    <!-- Header -->
                    <tr>
                      <td style="background:linear-gradient(135deg,#1d4ed8 0%,#3b82f6 100%);
                                 padding:28px 32px;text-align:center;">
                        <h1 style="margin:0;color:#fff;font-size:1.6rem;font-weight:900;
                                   letter-spacing:-0.5px;">🚌 VéXeAZ</h1>
                        <p style="margin:6px 0 0;color:rgba(255,255,255,.8);font-size:.9rem;">
                          Đặt lại mật khẩu tài khoản</p>
                      </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                      <td style="padding:32px;">
                        <p style="margin:0 0 12px;color:#475569;font-size:.95rem;">
                          Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
                          Sử dụng mã OTP bên dưới để tiếp tục:</p>
                        <!-- OTP Box -->
                        <div style="background:#eff6ff;border:2px solid #bfdbfe;border-radius:14px;
                                    padding:24px;text-align:center;margin:24px 0;">
                          <p style="margin:0 0 8px;color:#64748b;font-size:.82rem;
                                    text-transform:uppercase;letter-spacing:.1em;font-weight:700;">
                            Mã xác thực OTP</p>
                          <div style="font-size:2.6rem;font-weight:900;letter-spacing:14px;
                                      color:#1d4ed8;font-family:monospace;">{otp}</div>
                          <p style="margin:10px 0 0;color:#94a3b8;font-size:.8rem;">
                            Hiệu lực trong <strong style="color:#f59e0b;">15 phút</strong></p>
                        </div>
                        <p style="margin:0;color:#64748b;font-size:.85rem;line-height:1.6;">
                          Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
                          Mật khẩu của bạn sẽ không thay đổi.
                        </p>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="padding:16px 32px 28px;border-top:1px solid #f1f5f9;
                                 text-align:center;">
                        <p style="margin:0;color:#cbd5e1;font-size:.75rem;">
                          © 2026 VéXeAZ · Hệ thống đặt vé xe khách trực tuyến</p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """;
    }
}
