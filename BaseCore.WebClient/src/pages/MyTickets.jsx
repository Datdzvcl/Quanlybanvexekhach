import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import UserLayout from '../layouts/UserLayout';
import { formatVND, labelBookingStatus, pick } from '../api';
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

function CancelModal({ onConfirm, onClose, loading }) {
  const [reason, setReason] = useState('Khách yêu cầu hủy vé');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444' }} />
          <h3>Yêu cầu hủy vé</h3>
        </div>
        <p className="modal-desc">Vui lòng nhập lý do hủy. Yêu cầu sẽ được gửi đến nhà xe để xem xét.</p>
        <textarea
          className="modal-textarea"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={300}
          placeholder="Nhập lý do..."
        />
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>Hủy bỏ</button>
          <button
            className="btn btn-danger"
            onClick={() => onConfirm(reason)}
            disabled={loading || !reason.trim()}
          >
            {loading ? <><i className="fa-solid fa-spinner fa-spin" /> Đang gửi...</> : 'Xác nhận hủy vé'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyTickets() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await bookingApi.my();
      const all = Array.isArray(data) ? data : [];
      const activeOnly = all.filter((b) => {
        const bs = Number(b.bookingStatus ?? b.BookingStatus ?? 0);
        return bs === 0 || bs === 1 || bs === 5 || bs === 6;
      });
      setBookings(activeOnly);
    } catch (err) {
      setError(err.message || 'Không tải được danh sách vé.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const confirmCancel = async (reason) => {
    if (!cancelModal) return;
    setCancelLoading(true);
    try {
      await bookingApi.requestCancel(cancelModal, { cancelReason: reason });
      setCancelModal(null);
      setNotice({ type: 'success', text: 'Đã gửi yêu cầu hủy vé. Vui lòng chờ nhà xe xác nhận.' });
      await loadBookings();
    } catch (err) {
      setCancelModal(null);
      setNotice({ type: 'error', text: err.message || 'Không thể gửi yêu cầu hủy vé.' });
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <UserLayout>
      <main className="account-page">
        <section className="account-panel my-ticket-panel">
          <div className="account-head">
            <div>
              <h1>Vé của tôi</h1>
              <p>Theo dõi các vé đang hoạt động bằng tài khoản hiện tại.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link className="btn btn-outline" to="/order-history">
                <i className="fa-solid fa-clock-rotate-left" /> Lịch sử đơn hàng
              </Link>
              <Link className="btn btn-primary" to="/search-results">Đặt vé mới</Link>
            </div>
          </div>

          {notice && (
            <p className={`profile-status profile-status--${notice.type}`} role="alert">
              {notice.type === 'success'
                ? <i className="fa-solid fa-circle-check" />
                : <i className="fa-solid fa-circle-exclamation" />}
              {' '}{notice.text}
            </p>
          )}

          {loading && <p className="muted">Đang tải vé...</p>}
          {error && <p className="profile-status profile-status--error">{error}</p>}

          {!loading && !error && bookings.length === 0 && (
            <div className="empty-state">
              <i className="fa-solid fa-ticket" />
              <h3>Chưa có vé nào đang hoạt động</h3>
              <p>Các vé chưa hoàn thành hoặc chưa hủy sẽ hiển thị ở đây.</p>
              <Link className="btn btn-primary" to="/search-results">Đặt vé ngay</Link>
            </div>
          )}

          <div className="my-ticket-list">
            {bookings.map((item) => {
              const bookingId     = pick(item, ['bookingID', 'BookingID', 'bookingId', 'id']);
              const bookingStatus = Number(pick(item, ['bookingStatus', 'BookingStatus'], 0));
              const seatLabels    = pick(item, ['seatLabels', 'SeatLabels'], []);
              const cancelReason  = pick(item, ['cancelReason', 'CancelReason'], '');
              const refundAmount  = pick(item, ['refundAmount', 'RefundAmount'], null);

              const canRequestCancel = bookingStatus !== 2
                                    && bookingStatus !== 4
                                    && bookingStatus !== 5
                                    && bookingStatus !== 6;

              return (
                <article className="my-ticket-card" key={bookingId}>
                  <div className="my-ticket-main">
                    <div>
                      <span className="ticket-code">Mã vé #{bookingId}</span>
                      <h2>{pick(item, ['operatorName', 'OperatorName'], 'Nhà xe')}</h2>
                      <p>
                        {pick(item, ['departureLocation', 'DepartureLocation'], '--')}
                        {' → '}
                        {pick(item, ['arrivalLocation', 'ArrivalLocation'], '--')}
                      </p>
                    </div>
                    <div className="my-ticket-meta">
                      <span><i className="fa-solid fa-calendar-days" /> {formatDateTime(pick(item, ['departureTime', 'DepartureTime']))}</span>
                      <span><i className="fa-solid fa-couch" /> {Array.isArray(seatLabels) ? seatLabels.join(', ') : seatLabels}</span>
                      <span><i className="fa-solid fa-money-bill" /> {formatVND(pick(item, ['totalPrice', 'TotalPrice'], 0))}</span>
                    </div>
                  </div>

                  <div className="my-ticket-side">
                    <span className={statusClass(bookingStatus)}>{labelBookingStatus(bookingStatus)}</span>
                    {cancelReason && <small>Lý do hủy: {cancelReason}</small>}
                    {refundAmount != null && <small>Hoàn tiền: {formatVND(refundAmount)}</small>}
                    {bookingStatus === 5 && (
                      <span className="ticket-status status-pending">Đang chờ duyệt hủy</span>
                    )}
                    {bookingStatus === 6 && (
                      <span className="ticket-status status-cancelled">Từ chối hủy</span>
                    )}
                    <Link className="btn btn-outline" to={`/my-tickets/${bookingId}`}>Xem chi tiết</Link>
                    {canRequestCancel && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => { setNotice(null); setCancelModal(bookingId); }}
                      >
                        Yêu cầu hủy vé
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      {cancelModal && (
        <CancelModal
          onConfirm={confirmCancel}
          onClose={() => setCancelModal(null)}
          loading={cancelLoading}
        />
      )}
    </UserLayout>
  );
}
