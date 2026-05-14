import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { apiFetch, formatVND, pick } from '../api';

const PAYMENT_METHODS = [
  ['momo', 'Ví MoMo', 'fa-wallet'],
  ['vnpay', 'VNPay', 'fa-credit-card'],
  ['cash', 'Thanh toán tại quầy', 'fa-money-bill'],
];

const HOLD_DURATION = 10 * 60; // 10 phút (giây)

function getHoldInfo() {
  try {
    const raw = localStorage.getItem('holdSeat');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function Payment() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = params.get('bookingId');

  const [method, setMethod] = useState('momo');
  const [status, setStatus] = useState('loading');
  const [booking, setBooking] = useState(null);
  const [paidAt, setPaidAt] = useState('');
  const [showActionModal, setShowActionModal] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      alert('Không tìm thấy đơn hàng cần thanh toán.');
      navigate('/search');
      return;
    }

    apiFetch(`/api/bookings/${bookingId}`)
      .then((data) => {
        setBooking(data);
        const paymentStatus = String(pick(data, ['paymentStatus', 'PaymentStatus'], 'Pending')).toLowerCase();
        if (paymentStatus === 'paid' || paymentStatus === 'completed') {
          setPaidAt(pick(data, ['bookingDate', 'BookingDate'], '') || new Date().toISOString());
          setStatus('success');
          return;
        }
        setStatus('form');
      })
      .catch(() => {
        alert('Không tải được thông tin thanh toán.');
        navigate('/search');
      });
  }, [bookingId, navigate]);

  const pay = async () => {
    if (!bookingId) return;
    setShowActionModal(false);
    try {
      setStatus('processing');
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await apiFetch(`/api/bookings/${bookingId}/payment-status`, {
        method: 'PUT',
        body: JSON.stringify('Paid'),
      });

      // Xóa giữ chỗ nếu có
      const hold = getHoldInfo();
      if (hold && hold.bookingId === bookingId) {
        localStorage.removeItem('holdSeat');
        window.dispatchEvent(new Event('holdSeatUpdated'));
      }

      setPaidAt(new Date().toISOString());
      setBooking((prev) =>
        prev ? { ...prev, paymentMethod: normalizePaymentMethod(method), paymentStatus: 'Paid' } : prev
      );
      setStatus('success');
    } catch {
      setStatus('form');
      alert('Thanh toán thất bại. Vui lòng thử lại.');
    }
  };

  const holdSeat = () => {
    if (!bookingId) return;
    setShowActionModal(false);

    const existingHold = getHoldInfo();
    if (existingHold && existingHold.bookingId !== bookingId) {
      const remaining = Math.ceil((existingHold.expireAt - Date.now()) / 1000);
      if (remaining > 0) {
        alert(`Bạn đang giữ chỗ đơn #${existingHold.bookingId}. Mỗi người chỉ được giữ chỗ 1 đơn hàng. Vui lòng hoàn tất hoặc hủy đơn hiện tại trước.`);
        return;
      }
    }

    const holdData = {
      bookingId,
      expireAt: Date.now() + HOLD_DURATION * 1000,
      amount: Number(pick(booking, ['totalPrice', 'TotalPrice'], 0)),
      seatCount: Number(pick(booking, ['totalSeats', 'TotalSeats'], 0)),
    };
    localStorage.setItem('holdSeat', JSON.stringify(holdData));
    window.dispatchEvent(new Event('holdSeatUpdated'));

    navigate('/search');
  };

  const amount = Number(pick(booking, ['totalPrice', 'TotalPrice'], 0));
  const seatCount = Number(pick(booking, ['totalSeats', 'TotalSeats'], 0));
  const paidTime = paidAt ? new Date(paidAt) : new Date();

  return (
    <>
      <Header simple />
      <div className="payment-page container">
        {status === 'loading' && (
          <div className="payment-card center">
            <i className="fa-solid fa-spinner fa-spin fa-3x" />
            <h2>Đang tải thông tin thanh toán...</h2>
          </div>
        )}

        {status === 'form' && (
          <div className="payment-card">
            <h2>Thanh toán</h2>
            <p className="amount">{formatVND(amount)}</p>
            <div className="payment-meta">
              <p><span>Mã đơn hàng:</span><strong>#{bookingId}</strong></p>
              <p><span>Số ghế:</span><strong>{seatCount || 0}</strong></p>
            </div>

            <div className="methods">
              {PAYMENT_METHODS.map(([id, name, icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMethod(id)}
                  className={`method-card ${method === id ? 'selected' : ''}`}
                >
                  <i className={`fa-solid ${icon}`} />
                  <span>{name}</span>
                  <i className={method === id ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'} />
                </button>
              ))}
            </div>

            <button onClick={() => setShowActionModal(true)} className="btn btn-primary btn-checkout">
              Tiếp tục <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
        )}

        {status === 'processing' && (
          <div className="payment-card center">
            <i className="fa-solid fa-spinner fa-spin fa-3x" />
            <h2>Đang xử lý thanh toán...</h2>
          </div>
        )}

        {status === 'success' && (
          <div className="payment-card center success">
            <i className="fa-solid fa-circle-check fa-4x" />
            <h2>Thanh toán thành công!</h2>
            <p>Số tiền: {formatVND(amount)}</p>
            <p>Thời gian mua: {paidTime.toLocaleString('vi-VN')}</p>
            <div className="payment-actions">
              <Link to="/" className="btn btn-primary">Về trang chủ</Link>
              <Link to="/search" className="btn btn-secondary">Tiếp tục đặt vé</Link>
            </div>
          </div>
        )}
      </div>

      {showActionModal && (
        <div className="action-modal-overlay" onClick={() => setShowActionModal(false)}>
          <div className="action-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Bạn muốn làm gì?</h3>
            <p className="action-modal-sub">
              Phương thức: <strong>{PAYMENT_METHODS.find(([id]) => id === method)?.[1]}</strong>
            </p>

            <div className="action-modal-options">
              <button className="action-option-card" onClick={holdSeat}>
                <i className="fa-solid fa-clock fa-2x" style={{ color: '#f59e0b' }} />
                <div>
                  <strong>Giữ chỗ</strong>
                  <p>Giữ ghế 10 phút, thanh toán sau</p>
                </div>
              </button>

              <button className="action-option-card featured" onClick={pay}>
                <i className="fa-solid fa-bolt fa-2x" style={{ color: '#2563eb' }} />
                <div>
                  <strong>Thanh toán ngay</strong>
                  <p>Hoàn tất đặt vé ngay bây giờ</p>
                </div>
              </button>
            </div>

            <button
              className="btn btn-outline"
              style={{ marginTop: '12px', width: '100%' }}
              onClick={() => setShowActionModal(false)}
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function normalizePaymentMethod(method) {
  if (method === 'momo') return 'MoMo';
  if (method === 'vnpay') return 'VNPay';
  if (method === 'cash') return 'Cash';
  return 'Online';
}
