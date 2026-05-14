import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserLayout from '../layouts/UserLayout';
import { formatVND, pick } from '../api';
import { useAuth } from '../contexts/AuthContext';

const PENDING_BOOKING_KEY = 'pendingBooking';

function readPendingBooking() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_BOOKING_KEY) || 'null');
  } catch {
    return null;
  }
}

function formatTime(value) {
  if (!value) return '--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDate(value) {
  if (!value) return '--';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function stopLabel(stop) {
  if (!stop) return '--';
  const name = pick(stop, ['stopName', 'StopName'], '');
  const address = pick(stop, ['stopAddress', 'StopAddress'], '');
  return address ? `${name} - ${address}` : name || '--';
}

export default function BookingContact() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingBooking, setPendingBooking] = useState(() => readPendingBooking());
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const stored = readPendingBooking();
    setPendingBooking(stored);

    const contact = stored?.contact || {};
    setForm({
      customerName: contact.customerName || user?.fullName || '',
      customerPhone: contact.customerPhone || user?.phone || '',
      customerEmail: contact.customerEmail || user?.email || '',
    });
  }, [user]);

  const trip = pendingBooking?.trip || {};
  const summary = useMemo(() => ({
    operatorName: pick(trip, ['operatorName', 'OperatorName'], 'Nhà xe'),
    busType: pick(trip, ['busType', 'BusType'], 'Xe khách'),
    from: pick(trip, ['departureLocation', 'DepartureLocation'], '--'),
    to: pick(trip, ['arrivalLocation', 'ArrivalLocation'], '--'),
    departureTime: pick(trip, ['departureTime', 'DepartureTime']),
    arrivalTime: pick(trip, ['arrivalTime', 'ArrivalTime']),
  }), [trip]);

  const validate = () => {
    const nextErrors = {};
    if (!form.customerName.trim()) nextErrors.customerName = 'Vui lòng nhập tên người đi.';
    if (!form.customerPhone.trim()) nextErrors.customerPhone = 'Vui lòng nhập số điện thoại.';

    const email = form.customerEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.customerEmail = 'Email không đúng định dạng.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = (event) => {
    event.preventDefault();
    if (!pendingBooking?.tripId) {
      alert('Không tìm thấy dữ liệu đặt vé tạm. Vui lòng chọn lại chuyến.');
      navigate('/search-results');
      return;
    }

    if (!validate()) return;

    const nextBooking = {
      ...pendingBooking,
      contact: {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerEmail: form.customerEmail.trim(),
      },
    };

    localStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify(nextBooking));
    setPendingBooking(nextBooking);
    navigate('/booking/payment');
  };

  if (!pendingBooking?.tripId) {
    return (
      <UserLayout>
        <div className="container pickup-placeholder">
          <h1>Chưa có dữ liệu đặt vé</h1>
          <p>Vui lòng chọn chuyến, giữ ghế và chọn điểm đón/trả trước khi nhập thông tin liên hệ.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/search-results')}>
            Tìm chuyến
          </button>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <section className="contact-page-hero">
        <div className="container">
          <span>Thông tin liên hệ</span>
          <h1>Nhập thông tin người đi</h1>
          <p>Thông tin này sẽ được dùng để xác nhận vé và gửi chi tiết đặt chỗ.</p>
        </div>
      </section>

      <section className="container contact-booking-layout">
        <main className="contact-form-card">
          <div className="contact-form-head">
            <i className="fa-solid fa-address-card" />
            <div>
              <h2>Thông tin người đi</h2>
              <p>Bạn có thể chỉnh sửa dù đã đăng nhập.</p>
            </div>
          </div>

          <form className="contact-booking-form" onSubmit={submit}>
            <label className="contact-field">
              <span>Tên người đi</span>
              <input
                value={form.customerName}
                onChange={(event) => setForm({ ...form, customerName: event.target.value })}
                placeholder="Nguyễn Văn A"
              />
              {errors.customerName && <small>{errors.customerName}</small>}
            </label>

            <label className="contact-field">
              <span>Số điện thoại</span>
              <input
                value={form.customerPhone}
                onChange={(event) => setForm({ ...form, customerPhone: event.target.value })}
                placeholder="0912345678"
              />
              {errors.customerPhone && <small>{errors.customerPhone}</small>}
            </label>

            <label className="contact-field">
              <span>Email</span>
              <input
                type="email"
                value={form.customerEmail}
                onChange={(event) => setForm({ ...form, customerEmail: event.target.value })}
                placeholder="email@example.com"
              />
              {errors.customerEmail && <small>{errors.customerEmail}</small>}
            </label>

            <button type="submit" className="btn btn-primary contact-pay-btn">
              Thanh toán
              <i className="fa-solid fa-credit-card" />
            </button>
          </form>
        </main>

        <aside className="contact-summary-card">
          <h2>Thông tin chuyến</h2>
          <div className="contact-trip-box">
            <strong>{summary.operatorName}</strong>
            <span>{summary.busType}</span>
          </div>

          <div className="contact-summary-line">
            <span>Điểm xuất phát</span>
            <strong>{summary.from}</strong>
          </div>
          <div className="contact-summary-line">
            <span>Điểm đến</span>
            <strong>{summary.to}</strong>
          </div>
          <div className="contact-summary-line">
            <span>Giờ đi</span>
            <strong>{formatTime(summary.departureTime)}</strong>
          </div>
          <div className="contact-summary-line">
            <span>Giờ đến dự kiến</span>
            <strong>{formatTime(summary.arrivalTime)}</strong>
          </div>
          <div className="contact-summary-line">
            <span>Ngày đi</span>
            <strong>{formatDate(summary.departureTime)}</strong>
          </div>
          <div className="contact-summary-line">
            <span>Ghế đã chọn</span>
            <strong>{pendingBooking.seatLabels?.join(', ') || '--'}</strong>
          </div>
          <div className="contact-summary-line">
            <span>Điểm đón</span>
            <strong>{stopLabel(pendingBooking.pickupStop)}</strong>
          </div>
          <div className="contact-summary-line">
            <span>Điểm trả</span>
            <strong>{stopLabel(pendingBooking.dropoffStop)}</strong>
          </div>
          <div className="contact-summary-total">
            <span>Tổng tiền</span>
            <strong>{formatVND(pendingBooking.totalPrice || 0)}</strong>
          </div>
        </aside>
      </section>
    </UserLayout>
  );
}
