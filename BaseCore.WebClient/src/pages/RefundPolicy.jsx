import { Link } from 'react-router-dom';
import UserLayout from '../layouts/UserLayout';

const REFUND_TABLE = [
  {
    condition: 'Trước giờ khởi hành trên 24 giờ',
    rate: '90%',
    example: 'Xe khởi hành 10h ngày mai, bạn hủy trước 10h hôm nay',
    badge: 'high',
  },
  {
    condition: 'Trước giờ khởi hành từ 6 đến 24 giờ',
    rate: '70%',
    example: 'Xe khởi hành 10h, bạn hủy từ 10h tối hôm trước đến 4h sáng',
    badge: 'medium',
  },
  {
    condition: 'Trước giờ khởi hành dưới 6 giờ',
    rate: '50%',
    example: 'Xe khởi hành 10h, bạn hủy lúc 5h sáng cùng ngày',
    badge: 'low',
  },
  {
    condition: 'Sau khi xe đã khởi hành hoặc chuyến đã hoàn thành',
    rate: '0%',
    example: 'Xe đã chạy, không thể yêu cầu hủy hoặc hoàn tiền',
    badge: 'none',
  },
];

const CANCEL_STEPS = [
  {
    icon: 'fa-solid fa-ticket',
    title: 'Bước 1 — Vào trang "Vé của tôi"',
    desc: 'Đăng nhập và truy cập mục Vé của tôi, chọn đơn vé cần hủy.',
  },
  {
    icon: 'fa-solid fa-paper-plane',
    title: 'Bước 2 — Gửi yêu cầu hủy vé',
    desc: 'Bấm nút "Yêu cầu hủy vé", nhập lý do và xác nhận. Hệ thống sẽ gửi yêu cầu đến nhà xe.',
  },
  {
    icon: 'fa-solid fa-building',
    title: 'Bước 3 — Nhà xe xem xét',
    desc: 'Nhà xe sẽ duyệt hoặc từ chối yêu cầu hủy trong thời gian sớm nhất. Bạn sẽ nhận thông báo khi có kết quả.',
  },
  {
    icon: 'fa-solid fa-user-shield',
    title: 'Bước 4 — Admin xử lý hoàn tiền',
    desc: 'Sau khi nhà xe duyệt, Admin sẽ xác nhận và thực hiện hoàn tiền về phương thức thanh toán ban đầu.',
  },
  {
    icon: 'fa-solid fa-circle-check',
    title: 'Bước 5 — Nhận tiền hoàn',
    desc: 'Tiền hoàn được xử lý trong 3–7 ngày làm việc tùy ngân hàng / ví điện tử.',
  },
];

const NO_REFUND_CASES = [
  'Vé đã được sử dụng (đã lên xe).',
  'Chuyến xe đã khởi hành hoặc đã hoàn thành.',
  'Yêu cầu hủy bị nhà xe từ chối do vi phạm điều khoản.',
  'Khách hàng tự ý không lên xe mà không gửi yêu cầu hủy trước.',
  'Vé đã ở trạng thái "Đã hủy" hoặc "Đã hoàn tiền" trước đó.',
];

const PAYMENT_METHODS = [
  { method: 'Chuyển khoản ngân hàng / ATM', time: '3 – 5 ngày làm việc' },
  { method: 'Ví điện tử (MoMo, ZaloPay…)', time: '1 – 3 ngày làm việc' },
  { method: 'Thẻ tín dụng / ghi nợ quốc tế', time: '5 – 7 ngày làm việc' },
  { method: 'Tiền mặt tại quầy', time: 'Liên hệ nhà xe hoặc hotline' },
];

export default function RefundPolicy() {
  return (
    <UserLayout>
      {/* ── Hero ── */}
      <section className="rp-hero">
        <div className="container rp-hero-inner">
          <div className="rp-hero-badge">
            <i className="fa-solid fa-shield-halved" /> Chính sách hoàn hủy vé
          </div>
          <h1>Chính sách hoàn tiền &amp; hủy vé</h1>
          <p>
            VéXeAZ cam kết minh bạch trong mọi giao dịch. Đọc kỹ chính sách dưới đây để hiểu
            quyền lợi khi hủy vé và mức hoàn tiền áp dụng.
          </p>
          <p className="rp-hero-updated">
            <i className="fa-regular fa-calendar" /> Cập nhật lần cuối: 25/06/2026
          </p>
        </div>
      </section>

      <div className="container rp-body">

        {/* ── 1. Điều kiện được hủy vé ── */}
        <section className="rp-section">
          <h2 className="rp-section-title">
            <span className="rp-num">1</span> Điều kiện được phép hủy vé
          </h2>
          <div className="rp-conditions-grid">
            <div className="rp-condition-card rp-condition-ok">
              <i className="fa-solid fa-circle-check" />
              <div>
                <strong>Được phép hủy</strong>
                <ul>
                  <li>Vé đang ở trạng thái <b>Đã xác nhận</b> hoặc <b>Chờ xác nhận</b>.</li>
                  <li>Chuyến xe <b>chưa khởi hành</b>.</li>
                  <li>Chưa có yêu cầu hủy nào đang chờ xử lý.</li>
                </ul>
              </div>
            </div>
            <div className="rp-condition-card rp-condition-no">
              <i className="fa-solid fa-circle-xmark" />
              <div>
                <strong>Không được hủy</strong>
                <ul>
                  <li>Vé đã bị hủy hoặc đã hoàn tiền trước đó.</li>
                  <li>Yêu cầu hủy đang trong trạng thái chờ duyệt.</li>
                  <li>Chuyến xe đã khởi hành hoặc đã hoàn thành.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. Bảng tỷ lệ hoàn tiền ── */}
        <section className="rp-section">
          <h2 className="rp-section-title">
            <span className="rp-num">2</span> Bảng tỷ lệ hoàn tiền
          </h2>
          <p className="rp-section-desc">
            Tỷ lệ hoàn tiền được tính dựa trên <b>thời điểm gửi yêu cầu hủy</b> so với
            <b> giờ khởi hành</b> của chuyến xe.
          </p>
          <div className="rp-table-wrap">
            <table className="rp-table">
              <thead>
                <tr>
                  <th>Thời điểm hủy</th>
                  <th>Tỷ lệ hoàn</th>
                  <th>Ví dụ minh họa</th>
                </tr>
              </thead>
              <tbody>
                {REFUND_TABLE.map((row) => (
                  <tr key={row.condition}>
                    <td>{row.condition}</td>
                    <td>
                      <span className={`rp-rate-badge rp-rate-${row.badge}`}>{row.rate}</span>
                    </td>
                    <td className="rp-table-example">{row.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rp-note">
            <i className="fa-solid fa-circle-info" />
            <span>
              Số tiền hoàn = <b>Tổng tiền đơn vé × Tỷ lệ hoàn</b>. Số tiền được làm tròn đến
              đơn vị nghìn đồng. Phí khuyến mãi (mã giảm giá) <b>không được hoàn lại</b>.
            </span>
          </div>
        </section>

        {/* ── 3. Quy trình hủy vé ── */}
        <section className="rp-section">
          <h2 className="rp-section-title">
            <span className="rp-num">3</span> Quy trình hủy vé &amp; hoàn tiền
          </h2>
          <div className="rp-steps">
            {CANCEL_STEPS.map((step, i) => (
              <div className="rp-step" key={i}>
                <div className="rp-step-icon">
                  <i className={step.icon} />
                </div>
                <div className="rp-step-line" />
                <div className="rp-step-content">
                  <strong>{step.title}</strong>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. Thời gian xử lý hoàn tiền ── */}
        <section className="rp-section">
          <h2 className="rp-section-title">
            <span className="rp-num">4</span> Thời gian xử lý hoàn tiền
          </h2>
          <p className="rp-section-desc">
            Sau khi Admin xác nhận hoàn tiền, thời gian nhận tiền phụ thuộc vào phương thức
            thanh toán ban đầu:
          </p>
          <div className="rp-payment-grid">
            {PAYMENT_METHODS.map((pm) => (
              <div className="rp-payment-card" key={pm.method}>
                <span className="rp-payment-method">{pm.method}</span>
                <span className="rp-payment-time">
                  <i className="fa-regular fa-clock" /> {pm.time}
                </span>
              </div>
            ))}
          </div>
          <div className="rp-note">
            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f59e0b' }} />
            <span>
              Thời gian trên là ước tính. Trong một số trường hợp ngân hàng/ví có thể xử lý
              lâu hơn vào ngày lễ, ngày nghỉ. Nếu sau 7 ngày bạn chưa nhận được tiền, vui lòng
              liên hệ hotline <b>1900 1234</b>.
            </span>
          </div>
        </section>

        {/* ── 5. Trường hợp không hoàn tiền ── */}
        <section className="rp-section">
          <h2 className="rp-section-title">
            <span className="rp-num">5</span> Các trường hợp không được hoàn tiền
          </h2>
          <ul className="rp-norefund-list">
            {NO_REFUND_CASES.map((item, i) => (
              <li key={i}>
                <i className="fa-solid fa-ban" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 6. Trường hợp đặc biệt ── */}
        <section className="rp-section">
          <h2 className="rp-section-title">
            <span className="rp-num">6</span> Trường hợp đặc biệt
          </h2>
          <div className="rp-special-grid">
            <div className="rp-special-card">
              <i className="fa-solid fa-bus-simple" />
              <div>
                <strong>Nhà xe hủy chuyến</strong>
                <p>
                  Nếu nhà xe chủ động hủy chuyến, bạn sẽ được <b>hoàn 100% tiền vé</b> mà
                  không cần gửi yêu cầu. Hệ thống sẽ tự động thông báo và xử lý.
                </p>
              </div>
            </div>
            <div className="rp-special-card">
              <i className="fa-solid fa-cloud-bolt" />
              <div>
                <strong>Bất khả kháng (thiên tai, dịch bệnh…)</strong>
                <p>
                  Trong các trường hợp bất khả kháng được cơ quan nhà nước công nhận, VéXeAZ
                  sẽ xem xét hoàn tiền theo từng trường hợp cụ thể. Liên hệ CSKH để được hỗ trợ.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 7. Liên hệ hỗ trợ ── */}
        <section className="rp-section rp-contact-section">
          <h2 className="rp-section-title">
            <span className="rp-num">7</span> Cần hỗ trợ?
          </h2>
          <p className="rp-section-desc">
            Nếu bạn có thắc mắc về chính sách hoàn hủy hoặc cần hỗ trợ xử lý đơn,
            vui lòng liên hệ đội ngũ CSKH của VéXeAZ:
          </p>
          <div className="rp-contact-grid">
            <a className="rp-contact-card" href="tel:19001234">
              <i className="fa-solid fa-phone" />
              <div>
                <strong>Hotline</strong>
                <span>1900 1234 (24/7)</span>
              </div>
            </a>
            <a className="rp-contact-card" href="mailto:support@vexeaz.vn">
              <i className="fa-solid fa-envelope" />
              <div>
                <strong>Email</strong>
                <span>support@vexeaz.vn</span>
              </div>
            </a>
            <a className="rp-contact-card" href="https://chat.zalo.me/" target="_blank" rel="noreferrer">
              <i className="fa-brands fa-rocketchat" />
              <div>
                <strong>Zalo / Chat trực tuyến</strong>
                <span>Phản hồi trong vòng 30 phút</span>
              </div>
            </a>
          </div>
          <div className="rp-cta">
            <Link to="/my-tickets" className="btn btn-primary">
              <i className="fa-solid fa-ticket" /> Xem vé của tôi
            </Link>
            <Link to="/" className="btn btn-outline">
              <i className="fa-solid fa-house" /> Về trang chủ
            </Link>
          </div>
        </section>

      </div>
    </UserLayout>
  );
}
