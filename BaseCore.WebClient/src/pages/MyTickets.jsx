import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import UserLayout from '../layouts/UserLayout';
import { formatVND, labelBookingStatus, labelPaymentStatus, pick } from '../api';
import { bookingApi } from '../services/bookingApi';

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

function statusClass(status) {
  return `ticket-status status-${String(status || '').toLowerCase()}`;
}

export default function MyTickets() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState(null);

  const loadBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await bookingApi.my();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Không tải được danh sách vé.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const requestCancel = async (bookingId) => {
    const reason = window.prompt('Nhập lý do yêu cầu hủy vé:', 'Khách yêu cầu hủy vé');
    if (reason === null) return;

    setActionId(bookingId);
    try {
      await bookingApi.requestCancel(bookingId, { cancelReason: reason });
      await loadBookings();
      alert('Đã gửi yêu cầu hủy vé.');
    } catch (err) {
      alert(err.message || 'Không thể gửi yêu cầu hủy vé.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <UserLayout>
      <main className="account-page">
        <section className="account-panel my-ticket-panel">
          <div className="account-head">
            <div>
              <h1>Vé của tôi</h1>
              <p>Theo dõi các vé đã đặt bằng tài khoản hiện tại.</p>
            </div>
            <Link className="btn btn-primary" to="/search-results">Đặt vé mới</Link>
          </div>

          {loading && <p className="muted">Đang tải vé...</p>}
          {error && <p className="profile-status">{error}</p>}

          {!loading && !error && bookings.length === 0 && (
            <div className="empty-state">
              <i className="fa-solid fa-ticket" />
              <h3>Chưa có vé nào</h3>
              <p>Các vé đã đặt bằng tài khoản này sẽ hiển thị tại đây.</p>
            </div>
          )}

          <div className="my-ticket-list">
            {bookings.map((item) => {
              const bookingId = pick(item, ['bookingID', 'BookingID', 'bookingId', 'id']);
              const paymentStatus = pick(item, ['paymentStatus', 'PaymentStatus'], '--');
              const bookingStatus = pick(item, ['bookingStatus', 'BookingStatus'], '--');
              const seatLabels = pick(item, ['seatLabels', 'SeatLabels'], []);
              const canRequestCancel = !['Cancelled', 'CancelRequested'].includes(String(bookingStatus));

              return (
                <article className="my-ticket-card" key={bookingId}>
                  <div className="my-ticket-main">
                    <div>
                      <span className="ticket-code">Mã vé #{bookingId}</span>
                      <h2>{pick(item, ['operatorName', 'OperatorName'], 'Nhà xe')}</h2>
                      <p>{pick(item, ['route', 'Route'], `${pick(item, ['departureLocation', 'DepartureLocation'], '--')} → ${pick(item, ['arrivalLocation', 'ArrivalLocation'], '--')}`)}</p>
                    </div>
                    <div className="my-ticket-meta">
                      <span><i className="fa-solid fa-calendar-days" /> {formatDateTime(pick(item, ['departureTime', 'DepartureTime']))}</span>
                      <span><i className="fa-solid fa-couch" /> {Array.isArray(seatLabels) ? seatLabels.join(', ') : seatLabels}</span>
                      <span><i className="fa-solid fa-money-bill" /> {formatVND(pick(item, ['totalPrice', 'TotalPrice'], 0))}</span>
                    </div>
                  </div>

                  <div className="my-ticket-side">
                    <span className={statusClass(paymentStatus)}>{labelPaymentStatus(paymentStatus)}</span>
                    <span className={statusClass(bookingStatus)}>{labelBookingStatus(bookingStatus)}</span>
                    <Link className="btn btn-outline" to={`/my-tickets/${bookingId}`}>Xem chi tiết</Link>
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={!canRequestCancel || actionId === bookingId}
                      onClick={() => requestCancel(bookingId)}
                    >
                      {bookingStatus === 'CancelRequested' ? 'Đã yêu cầu hủy' : 'Yêu cầu hủy vé'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </UserLayout>
  );
}
