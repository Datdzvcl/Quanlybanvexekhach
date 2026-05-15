import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserLayout from '../layouts/UserLayout';
import { formatVND, pick } from '../api';
import { bookingApi } from '../services/bookingApi';

const PENDING_BOOKING_KEY = 'pendingBooking';
const HOLD_STORAGE_KEY = 'currentSeatHold';
const PAYMENT_EXPIRES_KEY = 'paymentExpiresAt';

const paymentMethods = [
  { value: 'Cash', label: 'Tiền mặt', icon: 'fa-money-bill-wave' },
  { value: 'BankTransfer', label: 'Chuyển khoản ngân hàng', icon: 'fa-building-columns' },
  { value: 'VNPay', label: 'Ví điện tử/VNPay giả lập', icon: 'fa-wallet' },
];

function readPendingBooking() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_BOOKING_KEY) || 'null');
  } catch {
    return null;
  }
}

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatDateTime(value) {
  if (!value) return '--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export default function BookingPayment() {
  const navigate = useNavigate();
  const [pendingBooking] = useState(() => readPendingBooking());
  const [paymentMethod, setPaymentMethod] = useState('BankTransfer');
  const [expiresAt] = useState(() => {
    const stored = localStorage.getItem(PAYMENT_EXPIRES_KEY);
    if (stored && Number(stored) > Date.now()) return Number(stored);

    const next = Date.now() + 10 * 60 * 1000;
    localStorage.setItem(PAYMENT_EXPIRES_KEY, String(next));
    return next;
  });
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (expiresAt > now) return;
    alert('Đã hết thời gian thanh toán. Vui lòng chọn lại ghế.');
    localStorage.removeItem(PAYMENT_EXPIRES_KEY);
    navigate(pendingBooking?.tripId ? `/trips/${pendingBooking.tripId}/seats` : '/search-results', { replace: true });
  }, [expiresAt, navigate, now, pendingBooking?.tripId]);

  const trip = pendingBooking?.trip || {};
  const remainingMs = expiresAt - now;

  const summary = useMemo(() => ({
    route: `${pick(trip, ['departureLocation', 'DepartureLocation'], '--')} → ${pick(trip, ['arrivalLocation', 'ArrivalLocation'], '--')}`,
    departureTime: pick(trip, ['departureTime', 'DepartureTime']),
    operatorName: pick(trip, ['operatorName', 'OperatorName'], 'Nhà xe'),
    busType: pick(trip, ['busType', 'BusType'], 'Xe khách'),
  }), [trip]);

  const submit = async () => {
    if (!pendingBooking?.tripId || !pendingBooking?.contact) {
      alert('Thiếu dữ liệu đặt vé. Vui lòng thực hiện lại từ bước chọn ghế.');
      navigate('/search-results');
      return;
    }

    if (remainingMs <= 0) {
      alert('Đã hết thời gian thanh toán. Vui lòng chọn lại ghế.');
      navigate(`/trips/${pendingBooking.tripId}/seats`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await bookingApi.create({
        tripId: pendingBooking.tripId,
        sessionId: pendingBooking.sessionId,
        customerName: pendingBooking.contact.customerName,
        customerPhone: pendingBooking.contact.customerPhone,
        customerEmail: pendingBooking.contact.customerEmail,
        seatLabels: pendingBooking.seatLabels,
        pickupStopId: pendingBooking.pickupStopId,
        dropoffStopId: pendingBooking.dropoffStopId,
        paymentMethod,
      });

      const bookingId = pick(response, ['bookingID', 'bookingId', 'BookingID', 'id', 'Id']);
      localStorage.removeItem(PENDING_BOOKING_KEY);
      localStorage.removeItem(HOLD_STORAGE_KEY);
      localStorage.removeItem(PAYMENT_EXPIRES_KEY);
      window.dispatchEvent(new Event('holdSeatUpdated'));

      navigate(`/booking/success/${bookingId}`, { replace: true });
    } catch (err) {
      const message = err.message || 'Không thể tạo booking.';
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes('hết thời gian giữ') || lowerMessage.includes('het thoi gian')) {
        alert('Ghế đã hết thời gian giữ, vui lòng chọn lại ghế.');
        navigate(`/trips/${pendingBooking.tripId}/seats`);
        return;
      }

      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!pendingBooking?.tripId) {
    return (
      <UserLayout>
        <div className="container pickup-placeholder">
          <h1>Chưa có dữ liệu thanh toán</h1>
          <p>Vui lòng chọn chuyến, giữ ghế và nhập thông tin liên hệ trước khi thanh toán.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/search-results')}>
            Tìm chuyến
          </button>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <section className="payment-flow-hero">
        <div className="container">
          <span>Thanh toán</span>
          <h1>Hoàn tất đặt vé</h1>
          <p>Vui lòng hoàn tất thanh toán trong thời gian quy định.</p>
        </div>
      </section>

      <section className="container payment-flow-layout">
        <main className="payment-method-card">
          <div className="payment-countdown-panel">
            <div>
              <span>Thời gian thanh toán còn lại</span>
              <strong>{formatCountdown(remainingMs)}</strong>
            </div>
            <i className="fa-solid fa-clock" />
          </div>

          <h2>Chọn phương thức thanh toán</h2>
          <div className="payment-method-list">
            {paymentMethods.map((method) => (
              <label className={`payment-method-option ${paymentMethod === method.value ? 'selected' : ''}`} key={method.value}>
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === method.value}
                  onChange={() => setPaymentMethod(method.value)}
                />
                <i className={`fa-solid ${method.icon}`} />
                <span>{method.label}</span>
              </label>
            ))}
          </div>

          <button type="button" className="btn btn-primary payment-submit-btn" disabled={submitting} onClick={submit}>
            {submitting ? 'Đang xử lý...' : 'Thanh toán'}
            <i className="fa-solid fa-arrow-right" />
          </button>
        </main>

        <aside className="payment-summary-card">
          <h2>Tóm tắt đơn</h2>
          <div className="payment-trip-box">
            <strong>{summary.operatorName}</strong>
            <span>{summary.busType}</span>
            <p>{summary.route}</p>
            <small>{formatDateTime(summary.departureTime)}</small>
          </div>
          <div className="contact-summary-line">
            <span>Ghế</span>
            <strong>{pendingBooking.seatLabels?.join(', ') || '--'}</strong>
          </div>
          <div className="contact-summary-line">
            <span>Người đi</span>
            <strong>{pendingBooking.contact?.customerName || '--'}</strong>
          </div>
          <div className="contact-summary-line">
            <span>Số điện thoại</span>
            <strong>{pendingBooking.contact?.customerPhone || '--'}</strong>
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
