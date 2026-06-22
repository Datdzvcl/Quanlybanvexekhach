import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import UserLayout from '../layouts/UserLayout';
import { formatVND, pick } from '../api';
import { bookingApi } from '../services/bookingApi';
import { reviewApi } from '../services/reviewApi';
import { useAuth } from '../contexts/AuthContext';

function StarRating({ value, onChange, readonly }) {
  const [hover, setHover] = useState(0);
  return (
    <div className={`star-rating ${readonly ? 'readonly' : ''}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star-btn ${star <= (hover || value) ? 'active' : ''}`}
          onClick={() => !readonly && onChange(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          disabled={readonly}
          aria-label={`${star} sao`}
        >
          <i className="fa-solid fa-star" />
        </button>
      ))}
      <span className="star-label">
        {value === 1 && 'Rất tệ'}
        {value === 2 && 'Tệ'}
        {value === 3 && 'Bình thường'}
        {value === 4 && 'Tốt'}
        {value === 5 && 'Tuyệt vời'}
      </span>
    </div>
  );
}

function formatDate(value) {
  if (!value) return '--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(value));
}

export default function ReviewPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [existingReview, setExistingReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!bookingId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [bookingData, reviewData] = await Promise.allSettled([
          bookingApi.getById(Number(bookingId)),
          reviewApi.getByBooking(Number(bookingId)),
        ]);
        if (bookingData.status === 'fulfilled') setBooking(bookingData.value);
        if (reviewData.status === 'fulfilled') {
          setExistingReview(reviewData.value);
          setRating(reviewData.value.rating || 5);
          setComment(reviewData.value.comment || '');
        }
      } catch {
        setError('Không thể tải thông tin.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookingId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { setError('Vui lòng chọn số sao.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await reviewApi.create({ bookingID: Number(bookingId), rating, comment: comment.trim() });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Không thể gửi đánh giá.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="loading">Đang tải...</div>
      </UserLayout>
    );
  }

  const tripFrom = pick(booking, ['departureLocation']) || '--';
  const tripTo = pick(booking, ['arrivalLocation']) || '--';
  const depTime = pick(booking, ['departureTime']);
  const operator = pick(booking, ['operatorName']) || 'Nhà xe';

  return (
    <UserLayout>
      <section className="review-page-hero">
        <div className="container">
          <span>Đánh giá chuyến đi</span>
          <h1>{tripFrom} → {tripTo}</h1>
          <p>{operator} · {formatDate(depTime)}</p>
        </div>
      </section>

      <section className="container review-page-layout">
        <div className="review-card">
          {success || existingReview ? (
            <div className="review-success">
              <i className="fa-solid fa-circle-check" />
              <h2>{existingReview ? 'Bạn đã đánh giá chuyến này' : 'Đánh giá thành công!'}</h2>
              <StarRating value={rating} onChange={() => {}} readonly />
              {comment && <p className="review-comment-display">"{comment}"</p>}
              <button type="button" className="btn btn-primary" onClick={() => navigate('/my-tickets')}>
                Về vé của tôi
              </button>
            </div>
          ) : (
            <>
              <div className="review-card-head">
                <i className="fa-solid fa-star-half-stroke" />
                <div>
                  <h2>Chia sẻ trải nghiệm của bạn</h2>
                  <p>Đánh giá giúp cộng đồng chọn chuyến phù hợp hơn.</p>
                </div>
              </div>

              <form className="review-form" onSubmit={submit}>
                <div className="review-field">
                  <label>Chất lượng chuyến đi</label>
                  <StarRating value={rating} onChange={setRating} />
                </div>

                <div className="review-field">
                  <label>Nhận xét (tùy chọn)</label>
                  <textarea
                    rows={4}
                    placeholder="Chia sẻ về tài xế, xe, đúng giờ, dịch vụ..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={500}
                  />
                  <small>{comment.length}/500</small>
                </div>

                {error && <p className="review-error">{error}</p>}

                <div className="review-actions">
                  <button type="button" className="btn btn-outline" onClick={() => navigate('/my-tickets')}>
                    Bỏ qua
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                    <i className="fa-solid fa-paper-plane" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </section>
    </UserLayout>
  );
}
