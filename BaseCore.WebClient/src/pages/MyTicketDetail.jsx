// import { useEffect, useMemo, useState } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import UserLayout from '../layouts/UserLayout';
import { formatVND, labelBookingStatus, labelPaymentMethod, labelPaymentStatus, pick } from '../api';
import { bookingApi } from '../services/bookingApi';
import { reviewApi } from '../services/reviewApi';
import { QRCodeSVG } from 'qrcode.react';
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

function stopText(stop) {
  if (!stop) return '--';
  const name = pick(stop, ['stopName', 'StopName'], '');
  const address = pick(stop, ['stopAddress', 'StopAddress'], '');
  return address ? `${name} - ${address}` : name || '--';
}

const BOOKING_STATUS_CLASS = {
  0: 'pending', 1: 'confirmed', 2: 'cancelled', 3: 'confirmed',
  4: 'refunded', 5: 'pending', 6: 'cancelled', 7: 'pending-refund',
};
function statusClass(status) {
  const name = BOOKING_STATUS_CLASS[Number(status)] || String(status || '').toLowerCase();
  return `ticket-status status-${name}`;
}

function qrValue(booking) {
  const qrCodes = booking?.qrCodes || booking?.QrCodes || [];
  const ticketSeats = booking?.ticketSeats || booking?.TicketSeats || [];
  return qrCodes[0] || ticketSeats[0]?.qrCode || ticketSeats[0]?.QRCode || `BOOKING:${pick(booking, ['bookingID', 'BookingID', 'bookingId', 'id'])}`;
}

// function PseudoQrCode({ value }) {
//   const cells = useMemo(() => {
//     let seed = 0;
//     const source = String(value || 'ticket');
//     for (let i = 0; i < source.length; i += 1) seed = (seed * 31 + source.charCodeAt(i)) >>> 0;
//     return Array.from({ length: 121 }, (_, index) => {
//       const row = Math.floor(index / 11);
//       const col = index % 11;
//       const finder = (row < 3 && col < 3) || (row < 3 && col > 7) || (row > 7 && col < 3);
//       seed = (seed * 1664525 + 1013904223) >>> 0;
//       return finder || seed % 3 === 0;
//     });
//   }, [value]);

//   return (
//     <div className="pseudo-qr">
//       {cells.map((filled, index) => <span key={index} className={filled ? 'filled' : ''} />)}
//     </div>
//   );
// }
{/* <QRCodeSVG
  value={code}
  size={200}
  bgColor="#ffffff"
  fgColor="#000000"
  level="M"
  includeMargin={true}
/> */}
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

export default function MyTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelNotice, setCancelNotice] = useState(null);
  const [review, setReview] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewMessage, setReviewMessage] = useState('');
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [editReviewForm, setEditReviewForm] = useState({ rating: 5, comment: '' });

  // const loadBooking = async () => {
  //   setLoading(true);
  //   setError('');
  //   try {
  //     setBooking(await bookingApi.getById(id));
  //     try {
  //       setReview(await reviewApi.byBooking(id));
  //     } catch {
  //       setReview(null);
  //     }
  //   } catch (err) {
  //     setError(err.message || 'Không tải được chi tiết vé.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };
const loadBooking = async () => {
  setLoading(true);
  setError('');
  try {
    const data = await bookingApi.getById(id);
    setBooking(data);
    // review đã có sẵn trong response của getById
    setReview(data?.review ?? null);
  } catch (err) {
    setError(err.message || 'Không tải được chi tiết vé.');
  } finally {
    setLoading(false);
  }
};
  useEffect(() => {
    loadBooking();
  }, [id]);
  useEffect(() => {
    if (window.location.hash === '#review' && !loading) {
      setTimeout(() => {
        document.querySelector('.ticket-review-form')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [loading]);
  const requestCancel = async (reason) => {
    setActionLoading(true);
    try {
      await bookingApi.requestCancel(id, { cancelReason: reason });
      setShowCancelModal(false);
      setCancelNotice({ type: 'success', text: 'Đã gửi yêu cầu hủy vé. Vui lòng chờ nhà xe xác nhận.' });
      await loadBooking();
    } catch (err) {
      setShowCancelModal(false);
      setCancelNotice({ type: 'error', text: err.message || 'Không thể gửi yêu cầu hủy vé.' });
    } finally {
      setActionLoading(false);
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    setActionLoading(true);
    setReviewMessage('');
    try {
      const result = await reviewApi.create({
        bookingID: Number(id),
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment,
      });
      setReview(result);
      setReviewMessage('Đã gửi đánh giá nhà xe.');
      await loadBooking();
    } catch (err) {
      setReviewMessage(err.message || 'Không gửi được đánh giá.');
    } finally {
      setActionLoading(false);
    }
  };

  const updateReview = async (event) => {
    event.preventDefault();
    setActionLoading(true);
    setReviewMessage('');
    try {
      const reviewId = pick(review, ['reviewID', 'ReviewID']);
      const result = await reviewApi.update(reviewId, {
        bookingID: Number(id),
        rating: Number(editReviewForm.rating),
        comment: editReviewForm.comment,
      });
      setReview(result);
      setIsEditingReview(false);
      setReviewMessage('Đã cập nhật đánh giá.');
      await loadBooking();
    } catch (err) {
      setReviewMessage(err.message || 'Không cập nhật được đánh giá.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="loading">Đang tải chi tiết vé...</div>
      </UserLayout>
    );
  }

  if (error || !booking) {
    return (
      <UserLayout>
        <div className="container pickup-placeholder">
          <h1>Không tải được vé</h1>
          <p>{error || 'Không tìm thấy vé.'}</p>
          <button className="btn btn-primary" onClick={() => navigate(-1)}>Quay lại</button>
        </div>
      </UserLayout>
    );
  }

  const bookingId = pick(booking, ['bookingID', 'BookingID', 'bookingId', 'id']);
  const trip = booking.trip || booking.Trip || {};
  const bus = booking.bus || booking.Bus || {};
  const operator = booking.operatorInfo || booking.OperatorInfo || {};
  const seatLabels = booking.seatLabels || booking.SeatLabels || [];
  const paymentStatus = pick(booking, ['paymentStatus', 'PaymentStatus'], '--');
  const bookingStatus = pick(booking, ['bookingStatus', 'BookingStatus'], '--');
  const cancelReason = pick(booking, ['cancelReason', 'CancelReason'], '');
  const cancelledAt = pick(booking, ['cancelledAt', 'CancelledAt'], '');
  const refundAmount = pick(booking, ['refundAmount', 'RefundAmount'], null);
  // const canRequestCancel = !['Cancelled', 'CancelRequested', 'CancelRejected'].includes(String(bookingStatus));
  const bs = Number(bookingStatus);
  const arrivalTime = pick(trip, ['arrivalTime', 'ArrivalTime'], pick(booking, ['arrivalTime', 'ArrivalTime']));
  const tripStatus = pick(trip, ['status', 'Status'], pick(booking, ['tripStatus', 'TripStatus'], ''));
  const ts = Number(tripStatus);
  const tripEnded = ts === 2 || ts === 3 // Completed hoặc Cancelled
    || (arrivalTime && new Date(arrivalTime) < new Date()); // hoặc đã qua giờ đến
  const canRequestCancel = !tripEnded
                      && bs !== 2   // Cancelled
                      && bs !== 3   // Completed
                      && bs !== 4   // Refunded
                      && bs !== 5   // CancelRequested
                      && bs !== 6;  // CancelRejected
  // const canReview = !review &&
  //   !['Cancelled', 'CancelRequested'].includes(String(bookingStatus)) &&
  //   (String(tripStatus).toLowerCase() === 'completed' || (arrivalTime && new Date(arrivalTime) <= new Date()));
  // const canReview = !review
  // && bs !== 2   // Cancelled
  // && bs !== 4   // Refunded
  // && bs !== 5   // CancelRequested
  // && (String(tripStatus).toLowerCase() === 'completed' 
  //     || (arrivalTime && new Date(arrivalTime) <= new Date()));
  // const code = qrValue(booking);
  const canReview = !review && bs === 3; // chỉ Completed
const code = qrValue(booking);

  return (
    <UserLayout>
      <section className="ticket-detail-hero">
        <div className="container">
          <span>Chi tiết vé</span>
          <h1>Vé #{bookingId}</h1>
          <p>{pick(trip, ['departureLocation', 'DepartureLocation'], pick(booking, ['departureLocation', 'DepartureLocation'], '--'))} → {pick(trip, ['arrivalLocation', 'ArrivalLocation'], pick(booking, ['arrivalLocation', 'ArrivalLocation'], '--'))}</p>
        </div>
      </section>

      <section className="container ticket-detail-layout">
        <main className="ticket-detail-card">
          <div className="ticket-detail-head">
            <h2>Thông tin chuyến đi</h2>
            <div>
              {/* <span className={statusClass(paymentStatus)}>{labelPaymentStatus(paymentStatus)}</span>
              <span className={statusClass(bookingStatus)}>{labelBookingStatus(bookingStatus)}</span> */}
               <span className={statusClass(bs)}>{labelBookingStatus(bs)}</span>
            </div>
          </div>

          <div className="ticket-detail-grid">
            <div><span>Nhà xe</span><strong>{pick(booking, ['operatorName', 'OperatorName'], pick(operator, ['name', 'Name'], '--'))}</strong></div>
            <div><span>Loại xe</span><strong>{pick(bus, ['busType', 'BusType'], pick(booking, ['busType', 'BusType'], '--'))}</strong></div>
            <div><span>Biển số xe</span><strong>{pick(bus, ['licensePlate', 'LicensePlate'], '--')}</strong></div>
            <div><span>Điểm xuất phát</span><strong>{pick(trip, ['departureLocation', 'DepartureLocation'], pick(booking, ['departureLocation', 'DepartureLocation'], '--'))}</strong></div>
            <div><span>Điểm đến</span><strong>{pick(trip, ['arrivalLocation', 'ArrivalLocation'], pick(booking, ['arrivalLocation', 'ArrivalLocation'], '--'))}</strong></div>
            <div><span>Giờ đi</span><strong>{formatDateTime(pick(trip, ['departureTime', 'DepartureTime'], pick(booking, ['departureTime', 'DepartureTime'])))}</strong></div>
            <div><span>Giờ đến dự kiến</span><strong>{formatDateTime(pick(trip, ['arrivalTime', 'ArrivalTime'], pick(booking, ['arrivalTime', 'ArrivalTime'])))}</strong></div>
            <div><span>Ghế</span><strong>{Array.isArray(seatLabels) ? seatLabels.join(', ') : seatLabels}</strong></div>
            <div><span>Điểm đón</span><strong>{stopText(booking.pickupStop || booking.PickupStop)}</strong></div>
            <div><span>Điểm trả</span><strong>{stopText(booking.dropoffStop || booking.DropoffStop)}</strong></div>
            <div><span>Tổng tiền</span><strong>{formatVND(pick(booking, ['totalPrice', 'TotalPrice'], 0))}</strong></div>
          </div>

          <h2 className="ticket-section-title">Thông tin người đặt</h2>
          <div className="ticket-detail-grid">
            <div><span>Họ tên</span><strong>{pick(booking, ['customerName', 'CustomerName'], '--')}</strong></div>
            <div><span>Số điện thoại</span><strong>{pick(booking, ['customerPhone', 'CustomerPhone'], '--')}</strong></div>
            <div><span>Email</span><strong>{pick(booking, ['customerEmail', 'CustomerEmail'], '--')}</strong></div>
            <div><span>Phương thức thanh toán</span><strong>{labelPaymentMethod(pick(booking, ['paymentMethod', 'PaymentMethod'], '--'))}</strong></div>
          </div>

          {(cancelReason || cancelledAt || refundAmount !== null) && (
            <>
              <h2 className="ticket-section-title">Thông tin hủy vé</h2>
              <div className="ticket-detail-grid">
                <div><span>Trạng thái hủy</span><strong>{labelBookingStatus(bookingStatus)}</strong></div>
                <div><span>Lý do hủy</span><strong>{cancelReason || '--'}</strong></div>
                <div><span>Thời gian hủy</span><strong>{formatDateTime(cancelledAt)}</strong></div>
                <div><span>Số tiền hoàn</span><strong>{refundAmount !== null && refundAmount !== undefined ? formatVND(refundAmount) : '--'}</strong></div>
              </div>
            </>
          )}

          {/* <h2 className="ticket-section-title">Đánh giá nhà xe</h2> */}
          {/* {review ? (
            <div className="ticket-review-box">
              <strong>{'★'.repeat(Number(pick(review, ['rating', 'Rating'], 0)))}{'☆'.repeat(5 - Number(pick(review, ['rating', 'Rating'], 0)))}</strong>
              <p>{pick(review, ['comment', 'Comment'], '') || 'Bạn chưa nhập bình luận.'}</p>
              <small>Đã đánh giá lúc {formatDateTime(pick(review, ['createdAt', 'CreatedAt']))}</small>
            </div>
          ) : canReview ? (
            <form className="ticket-review-form" onSubmit={submitReview}>
              <label>
                <span>Số sao</span>
                <select value={reviewForm.rating} onChange={(event) => setReviewForm((current) => ({ ...current, rating: event.target.value }))}>
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>{value} sao</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Bình luận</span>
                <textarea
                  value={reviewForm.comment}
                  onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))}
                  rows="4"
                  maxLength="500"
                  placeholder="Chia sẻ trải nghiệm về nhà xe, xe và phục vụ"
                />
              </label>
              <button className="btn btn-primary" type="submit" disabled={actionLoading}>Gửi đánh giá</button>
            </form>
          ) : (
            <p className="muted">Bạn có thể đánh giá nhà xe sau khi chuyến xe hoàn thành.</p>
          )}
          {reviewMessage && <p className={`profile-status ${review ? 'success' : ''}`}>{reviewMessage}</p>} */}
          <h2 className="ticket-section-title">Đánh giá nhà xe</h2>
    {review ? (
      <div className="ticket-review-box">
        {isEditingReview ? (
          <form onSubmit={updateReview}>
            <label>
              <span>Số sao</span>
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                {[1,2,3,4,5].map(s => (
                  <span
                    key={s}
                    onClick={() => setEditReviewForm(cur => ({ ...cur, rating: s }))}
                    style={{
                      fontSize: '2rem',
                      cursor: 'pointer',
                      color: s <= Number(editReviewForm.rating) ? '#f59e0b' : '#d1d5db',
                      transition: 'color 0.15s',
                    }}
                  >★</span>
                ))}
              </div>
            </label>
            <label>
              <span>Bình luận</span>
              <textarea
                value={editReviewForm.comment}
                onChange={e => setEditReviewForm(cur => ({ ...cur, comment: e.target.value }))}
                rows="4"
                maxLength="500"
                placeholder="Chia sẻ trải nghiệm về nhà xe, xe và phục vụ"
              />
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary" type="submit" disabled={actionLoading}>Lưu đánh giá</button>
              <button className="btn btn-secondary" type="button" onClick={() => setIsEditingReview(false)}>Hủy</button>
            </div>
          </form>
        ) : (
          <>
            <div style={{ fontSize: '1.4rem', letterSpacing: 2 }}>
              {[1,2,3,4,5].map(s => (
                <span key={s} style={{ color: s <= Number(pick(review, ['rating','Rating'], 0)) ? '#f59e0b' : '#d1d5db' }}>★</span>
              ))}
            </div>
            <p>{pick(review, ['comment','Comment'], '') || 'Bạn chưa nhập bình luận.'}</p>
            <small>Đã đánh giá lúc {formatDateTime(pick(review, ['createdAt','CreatedAt']))}</small>
            {pick(review, ['editedAt','EditedAt'], null) && (
              <small style={{ display: 'block', color: '#9ca3af', marginTop: 2 }}>
                Đã chỉnh sửa lúc {formatDateTime(pick(review, ['editedAt','EditedAt']))}
              </small>
            )}
            {!pick(review, ['editedAt','EditedAt'], null) && (
              <button
                className="btn btn-secondary"
                style={{ marginTop: 8, fontSize: '0.85rem', padding: '4px 12px' }}
                onClick={() => {
                  setEditReviewForm({
                    rating: Number(pick(review, ['rating','Rating'], 5)),
                    comment: pick(review, ['comment','Comment'], ''),
                  });
                  setIsEditingReview(true);
                }}
              >Sửa đánh giá</button>
            )}
          </>
        )}

        {/* Reply của nhà xe */}
        {pick(review, ['replyContent','ReplyContent'], '') && (
          <div className="ticket-review-reply" style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f3f4f6', borderRadius: 6, borderLeft: '3px solid #6366f1' }}>
            <small style={{ fontWeight: 600, color: '#6366f1' }}>Phản hồi từ nhà xe</small>
            <p style={{ margin: '0.25rem 0 0' }}>{pick(review, ['replyContent','ReplyContent'])}</p>
            {pick(review, ['repliedAt','RepliedAt'], '') && (
              <small style={{ color: '#9ca3af' }}>{formatDateTime(pick(review, ['repliedAt','RepliedAt']))}</small>
            )}
          </div>
        )}
      </div>
    ) : canReview ? (
      <form className="ticket-review-form" onSubmit={submitReview}>
        {/* Star rating click */}
        <label>
          <span>Số sao</span>
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            {[1,2,3,4,5].map(s => (
              <span
                key={s}
                onClick={() => setReviewForm(cur => ({ ...cur, rating: s }))}
                style={{
                  fontSize: '2rem',
                  cursor: 'pointer',
                  color: s <= Number(reviewForm.rating) ? '#f59e0b' : '#d1d5db',
                  transition: 'color 0.15s',
                }}
              >★</span>
            ))}
          </div>
        </label>
        <label>
          <span>Bình luận</span>
          <textarea
            value={reviewForm.comment}
            onChange={e => setReviewForm(cur => ({ ...cur, comment: e.target.value }))}
            rows="4"
            maxLength="500"
            placeholder="Chia sẻ trải nghiệm về nhà xe, xe và phục vụ"
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={actionLoading}>Gửi đánh giá</button>
      </form>
    ) : (
      <p className="muted">Bạn có thể đánh giá nhà xe sau khi chuyến xe hoàn thành.</p>
    )}
{reviewMessage && <p className={`profile-status ${review ? 'success' : ''}`}>{reviewMessage}</p>}
        </main>

        <aside className="ticket-detail-side">
          <h2>Mã QR</h2>
          {/* <PseudoQrCode value={code} /> */}
          <QRCodeSVG
            value={code || 'empty'}
            size={200}
            bgColor="#ffffff"
            fgColor="#000000"
            level="M"
            includeMargin={true}
            style={{ display: 'block', margin: '0 auto' }}
          />
          {cancelNotice && (
            <p className={`profile-status profile-status--${cancelNotice.type}`} role="alert">
              {cancelNotice.type === 'success'
                ? <i className="fa-solid fa-circle-check" />
                : <i className="fa-solid fa-circle-exclamation" />}
              {' '}{cancelNotice.text}
            </p>
          )}
          <Link className="btn btn-outline" to="/my-tickets">Quay lại danh sách</Link>
          {canRequestCancel && (
            <button
              type="button"
              className="btn btn-danger"
              disabled={actionLoading}
              onClick={() => { setCancelNotice(null); setShowCancelModal(true); }}
            >
              Yêu cầu hủy vé
            </button>
          )}
          {bs === 5 && <span className="ticket-status status-pending">Đang chờ duyệt hủy</span>}
          {bs === 6 && <span className="ticket-status status-cancelled">Từ chối hủy</span>}
        </aside>
      </section>

      {showCancelModal && (
        <CancelModal
          onConfirm={requestCancel}
          onClose={() => setShowCancelModal(false)}
          loading={actionLoading}
        />
      )}
    </UserLayout>
  );
}
