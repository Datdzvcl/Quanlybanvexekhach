import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserLayout from '../layouts/UserLayout';
import { formatVND, pick } from '../api';
import { operatorApi } from '../services/operatorApi';
import { reviewApi } from '../services/reviewApi';
import { apiClient, API_BASE } from '../services/httpClient';

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

function Stars({ rating, size = 16 }) {
  return (
    <span style={{ fontSize: size, letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ color: s <= Math.round(rating) ? '#f59e0b' : '#d1d5db' }}>★</span>
      ))}
    </span>
  );
}

function RatingBar({ count, total, star }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 13, color: '#64748b', width: 40 }}>{star} sao</span>
      <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#f59e0b', borderRadius: 4, transition: 'width .4s' }} />
      </div>
      <span style={{ fontSize: 13, color: '#64748b', width: 28, textAlign: 'right' }}>{count}</span>
    </div>
  );
}

function PolicySection({ title, items }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#1e40af' }}>{title}</h3>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {items.map((item, i) => <li key={i} style={{ marginBottom: 4 }}>{item}</li>)}
      </ul>
    </div>
  );
}

export default function OperatorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [operator, setOperator] = useState(null);
  const [buses, setBuses] = useState([]);
  const [busImages, setBusImages] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      operatorApi.getProfile(id).catch(() => null),
      reviewApi.byOperator(id).catch(() => ({ items: [], averageRating: 0, reviewCount: 0 })),
      apiClient.get(`/api/busimages/operator/${id}`).then(r => r.data).catch(() => []),
    ]).then(([op, rev, imgs]) => {
      setOperator(op);
      const revItems = rev?.items || rev?.Items || [];
      setReviews(revItems);
      setAvgRating(Number(rev?.averageRating ?? 0));
      setReviewCount(Number(rev?.reviewCount ?? revItems.length));
      setBusImages(Array.isArray(imgs) ? imgs : []);
    }).finally(() => setLoading(false));
  }, [id]);

  const [visibleCount, setVisibleCount] = useState(5);
  const [activeTab, setActiveTab] = useState('reviews');

  const starCounts = [5, 4, 3, 2, 1].map(s => ({
    star: s,
    count: reviews.filter(r => Math.round(Number(pick(r, ['rating', 'Rating'], 0))) === s).length,
  }));

  const resolveUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
  };
  const allImages = busImages.filter(img => pick(img, ['imageURL', 'ImageURL'], ''));

  return (
    <UserLayout>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px' }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontSize: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="fa-solid fa-arrow-left" /> Quay lại
        </button>

        {loading && <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 28 }} /></div>}

        {!loading && !operator && (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Không tìm thấy nhà xe.</div>
        )}

        {!loading && operator && (
          <>
            {/* ── Header nhà xe ── */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 28, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,.08)', display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ width: 72, height: 72, borderRadius: 14, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="fa-solid fa-bus" style={{ fontSize: 30, color: '#2563eb' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h1 style={{ margin: '0 0 6px', fontSize: '1.4rem', fontWeight: 700 }}>{pick(operator, ['name', 'Name'])}</h1>
                {pick(operator, ['description', 'Description'], '') && (
                  <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: 14 }}>{pick(operator, ['description', 'Description'])}</p>
                )}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14, color: '#475569' }}>
                  {pick(operator, ['contactPhone', 'ContactPhone'], '') && (
                    <span><i className="fa-solid fa-phone" style={{ marginRight: 5, color: '#2563eb' }} />{pick(operator, ['contactPhone', 'ContactPhone'])}</span>
                  )}
                  {pick(operator, ['email', 'Email'], '') && (
                    <span><i className="fa-solid fa-envelope" style={{ marginRight: 5, color: '#2563eb' }} />{pick(operator, ['email', 'Email'])}</span>
                  )}
                </div>
              </div>
              {reviewCount > 0 && (
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#f59e0b', lineHeight: 1 }}>{avgRating.toFixed(1)}</div>
                  <Stars rating={avgRating} size={18} />
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{reviewCount} đánh giá</div>
                </div>
              )}
            </div>

            {/* ── Tab navigation ── */}
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden' }}>
              {/* Tab bar */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
                {[
                  { key: 'reviews', label: 'Đánh giá' },
                  { key: 'policy',  label: 'Chính sách' },
                  ...(allImages.length > 0 ? [{ key: 'images', label: 'Hình ảnh' }] : []),
                ].map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    style={{
                      padding: '14px 24px', border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: 14, fontWeight: activeTab === tab.key ? 700 : 500,
                      color: activeTab === tab.key ? '#2563eb' : '#64748b',
                      borderBottom: activeTab === tab.key ? '2px solid #2563eb' : '2px solid transparent',
                      whiteSpace: 'nowrap', transition: 'color .15s',
                    }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ padding: 24 }}>

                {/* ── Tab: Đánh giá ── */}
                {activeTab === 'reviews' && (
                  <>
                    {reviewCount === 0 ? (
                      <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>Chưa có đánh giá nào.</p>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: 32, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', fontWeight: 700, color: '#f59e0b', lineHeight: 1 }}>{avgRating.toFixed(1)}</div>
                            <Stars rating={avgRating} size={20} />
                            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{reviewCount} đánh giá</div>
                          </div>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            {starCounts.map(({ star, count }) => (
                              <RatingBar key={star} star={star} count={count} total={reviewCount} />
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {reviews.slice(0, visibleCount).map((r, idx) => {
                            const rating = Number(pick(r, ['rating', 'Rating'], 0));
                            const comment = pick(r, ['comment', 'Comment'], '');
                            const reply = pick(r, ['replyContent', 'ReplyContent'], '');
                            const repliedAt = pick(r, ['repliedAt', 'RepliedAt'], '');
                            const userName = pick(r, ['userName', 'UserName'], 'Khách hàng');
                            const route = pick(r, ['route', 'Route'], '');
                            const createdAt = pick(r, ['createdAt', 'CreatedAt'], '');
                            return (
                              <div key={idx} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#2563eb', fontSize: 16, flexShrink: 0 }}>
                                      {userName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: 600, fontSize: 14 }}>{userName}</div>
                                      {route && <div style={{ fontSize: 12, color: '#94a3b8' }}>{route}</div>}
                                    </div>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <Stars rating={rating} size={14} />
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{formatDate(createdAt)}</div>
                                  </div>
                                </div>
                                {comment && <p style={{ margin: '0 0 10px', fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{comment}</p>}
                                {reply && (
                                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', marginTop: 8 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', marginBottom: 4 }}>
                                      <i className="fa-solid fa-reply" style={{ marginRight: 5 }} />Phản hồi từ nhà xe
                                    </div>
                                    <p style={{ margin: 0, fontSize: 14, color: '#0c4a6e', lineHeight: 1.6 }}>{reply}</p>
                                    {repliedAt && <div style={{ fontSize: 11, color: '#7dd3fc', marginTop: 4 }}>{formatDate(repliedAt)}</div>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {visibleCount < reviews.length && (
                          <div style={{ textAlign: 'center', marginTop: 20 }}>
                            <button onClick={() => setVisibleCount(c => c + 5)}
                              style={{ padding: '10px 32px', borderRadius: 24, border: '1.5px solid #2563eb', background: '#fff', color: '#2563eb', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                              Xem thêm ({reviews.length - visibleCount} đánh giá)
                            </button>
                          </div>
                        )}
                        {visibleCount >= reviews.length && reviews.length > 5 && (
                          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#94a3b8' }}>
                            Đã hiển thị tất cả {reviews.length} đánh giá
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* ── Tab: Chính sách ── */}
                {activeTab === 'policy' && (
                  <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
                    <PolicySection title="Điều kiện đặt vé" items={[
                      'Vé đã mua không được hoàn trả sau khi xác nhận thanh toán.',
                      'Có thể đổi vé trước giờ khởi hành ít nhất 24 giờ (phí đổi vé 50.000đ).',
                      'Khách hàng phải có mặt trước giờ xuất phát ít nhất 15 phút.',
                    ]} />
                    <PolicySection title="Hành lý" items={[
                      'Miễn phí 20kg hành lý ký gửi và 7kg hành lý xách tay.',
                      'Hành lý quá kích thước hoặc trọng lượng sẽ tính phụ phí.',
                      'Không vận chuyển hàng hóa nguy hiểm, dễ cháy nổ.',
                    ]} />
                    <div style={{ marginBottom: 24 }}>
                      <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#1e40af' }}>Hỗ trợ khách hàng</h3>
                      <p style={{ margin: '0 0 4px' }}>Hotline: <strong>1900 xxxx</strong> (7:00 – 22:00 hàng ngày)</p>
                      <p style={{ margin: 0 }}>Email: <strong>support@vexeaz.vn</strong></p>
                    </div>
                  </div>
                )}

                {/* ── Tab: Hình ảnh ── */}
                {activeTab === 'images' && allImages.length > 0 && (
                  <>
                    <div style={{ position: 'relative' }}>
                      <img
                        src={resolveUrl(pick(allImages[imgIdx], ['imageURL', 'ImageURL']))}
                        alt="Xe"
                        style={{ width: '100%', height: 300, objectFit: 'cover', borderRadius: 10 }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                      {allImages.length > 1 && (
                        <>
                          <button onClick={() => setImgIdx(i => (i - 1 + allImages.length) % allImages.length)}
                            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,.4)', border: 'none', color: '#fff', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 16 }}>
                            ‹
                          </button>
                          <button onClick={() => setImgIdx(i => (i + 1) % allImages.length)}
                            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,.4)', border: 'none', color: '#fff', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 16 }}>
                            ›
                          </button>
                          <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                            {allImages.map((_, i) => (
                              <button key={i} onClick={() => setImgIdx(i)}
                                style={{ width: 8, height: 8, borderRadius: '50%', border: 'none', cursor: 'pointer', background: i === imgIdx ? '#fff' : 'rgba(255,255,255,.5)', padding: 0 }} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    {allImages.length > 1 && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto' }}>
                        {allImages.map((img, i) => (
                          <img key={i} src={resolveUrl(pick(img, ['imageURL', 'ImageURL']))} alt=""
                            onClick={() => setImgIdx(i)}
                            style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: i === imgIdx ? '2px solid #2563eb' : '2px solid transparent', flexShrink: 0 }}
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}

              </div>
            </div>
          </>
        )}
      </div>
    </UserLayout>
  );
}
