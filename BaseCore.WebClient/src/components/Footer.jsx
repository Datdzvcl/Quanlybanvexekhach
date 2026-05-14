export default function Footer() {
  return (
    <footer className="user-footer" id="contact">
      <div className="container user-footer-grid">
        <div className="footer-brand">
          <h3><i className="fa-solid fa-bus" /> VéXeAZ</h3>
          <p>Nền tảng đặt vé xe khách trực tuyến, hỗ trợ tìm chuyến, giữ ghế và quản lý vé nhanh chóng.</p>
          <div className="footer-socials" aria-label="Mạng xã hội">
            <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
              <i className="fa-brands fa-facebook-f" />
            </a>
            <a href="https://zalo.me" target="_blank" rel="noreferrer" aria-label="Zalo">
              Z
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube">
              <i className="fa-brands fa-youtube" />
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok">
              <i className="fa-brands fa-tiktok" />
            </a>
          </div>
        </div>

        <div className="footer-col">
          <h3>Liên hệ</h3>
          <p><i className="fa-solid fa-phone" /> 1900 1234</p>
          <p><i className="fa-solid fa-envelope" /> support@vexeaz.vn</p>
          <p><i className="fa-solid fa-clock" /> Hỗ trợ 24/7</p>
        </div>

        <div className="footer-col">
          <h3>Địa chỉ</h3>
          <p><i className="fa-solid fa-location-dot" /> 123 Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh</p>
          <p>Văn phòng miền Bắc: 25 Láng Hạ, Hà Nội</p>
        </div>

        <div className="footer-col">
          <h3>Chính sách</h3>
          <a href="/#terms">Điều khoản sử dụng</a>
          <a href="/#policy">Chính sách bảo mật</a>
          <a href="/#refund">Chính sách hoàn hủy</a>
          <a href="/#booking-guide">Hướng dẫn đặt vé</a>
        </div>
      </div>

      <div className="container user-footer-bottom">
        <span>© 2026 VéXeAZ. All rights reserved.</span>
        <span>Đặt vé xe an toàn, minh bạch và tiện lợi.</span>
      </div>
    </footer>
  );
}
