// import { useEffect, useState } from 'react';
// import { Link } from 'react-router-dom';
// import UserLayout from '../layouts/UserLayout';
// import { bookingApi } from '../services/bookingApi';
// import { formatVND, labelBookingStatus, pick } from '../api';

// const STATUS_TABS = [
//   { label: 'Tất cả',        value: null },
//   // { label: 'Chờ xác nhận',  value: 0 },
//   // { label: 'Đã xác nhận',   value: 1 },
//   { label: 'Hoàn thành',    value: 3 },
//   { label: 'Đã hủy',        value: 2 },
// ];

// function formatDateTime(value) {
//   if (!value) return '--';
//   return new Intl.DateTimeFormat('vi-VN', {
//     hour: '2-digit', minute: '2-digit',
//     day: '2-digit', month: '2-digit', year: 'numeric',
//   }).format(new Date(value));
// }

// export default function OrderHistory() {
//   const [bookings, setBookings] = useState([]);
//   const [loading, setLoading]   = useState(true);
//   const [error, setError]       = useState('');
//   const [activeTab, setActiveTab] = useState(null); // null = tất cả

//   // useEffect(() => {
//   //   (async () => {
//   //     try {
//   //       const data = await bookingApi.my(); // gọi API lấy tất cả đơn
//   //       setBookings(Array.isArray(data) ? data : data.items ?? []);
//   //     } catch (err) {
//   //       setError(err.message || 'Không tải được lịch sử đơn hàng.');
//   //     } finally {
//   //       setLoading(false);
//   //     }
//   //   })();
//   // }, []);
//   useEffect(() => {
//   (async () => {
//     try {
//       const data = await bookingApi.my();
//       const all = Array.isArray(data) ? data : [];
//       const finished = all.filter(b => {
//         const bs = Number(b.bookingStatus ?? b.BookingStatus ?? 0);
//         return bs === 2 || bs === 3 || bs === 4;
//       });
//       setBookings(finished);
//     } catch (err) {
//       setError(err.message || 'Không tải được lịch sử đơn hàng.');
//     } finally {
//       setLoading(false);
//     }
//   })();
// }, []);

//   const filtered = activeTab === null
//     ? bookings
//     : bookings.filter(b => Number(b.bookingStatus ?? b.BookingStatus) === activeTab);

//   return (
//     <UserLayout>
//       <section className="ticket-detail-hero">
//         <div className="container">
//           <h1>Lịch sử đơn hàng</h1>
//         </div>
//       </section>

//       <div className="container" style={{ padding: '1.5rem 0' }}>
//         {/* Tabs lọc theo trạng thái */}
//         <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
//           {STATUS_TABS.map(tab => (
//             <button
//               key={tab.label}
//               onClick={() => setActiveTab(tab.value)}
//               className={`btn ${activeTab === tab.value ? 'btn-primary' : 'btn-outline'}`}
//               style={{ borderRadius: 20, padding: '0.35rem 1rem', fontSize: '0.875rem' }}
//             >
//               {tab.label}
//             </button>
//           ))}
//         </div>

//         {loading && <p>Đang tải...</p>}
//         {error   && <p style={{ color: 'red' }}>{error}</p>}

//         {!loading && !error && filtered.length === 0 && (
//           <p className="muted">Không có đơn hàng nào.</p>
//         )}

//         <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
//           {filtered.map(b => {
//             const id = pick(b, ['bookingID','BookingID','bookingId','id']);
//             const bs = Number(pick(b, ['bookingStatus','BookingStatus'], 0));
//             // const hasReview = !!b.review;
//             const hasReview = Boolean(pick(b, ['hasReview', 'HasReview'], false));
//             const canReview = !hasReview && bs === 3; // chỉ Completed

//             return (
//               <div key={id} style={{
//                 border: '1px solid #e5e7eb', borderRadius: 10,
//                 padding: '1rem 1.25rem', background: '#fff',
//                 display: 'flex', justifyContent: 'space-between',
//                 alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
//               }}>
//                 {/* Thông tin đơn */}
//                 <div style={{ flex: 1, minWidth: 220 }}>
//                   <div style={{ fontWeight: 700, marginBottom: 4 }}>
//                     Đơn #{id} &nbsp;
//                     <span style={{
//                       fontSize: '0.75rem', padding: '2px 8px', borderRadius: 12,
//                       background: bs === 3 ? '#d1fae5' : bs === 2 ? '#fee2e2' : '#dbeafe',
//                       color:      bs === 3 ? '#065f46' : bs === 2 ? '#991b1b' : '#1e40af',
//                     }}>
//                       {labelBookingStatus(bs)}
//                     </span>
//                   </div>
//                   <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
//                     {pick(b, ['departureLocation','DepartureLocation'], '--')} → {pick(b, ['arrivalLocation','ArrivalLocation'], '--')}
//                   </div>
//                   <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
//                     🕐 {formatDateTime(pick(b, ['departureTime','DepartureTime']))}
//                   </div>
//                   <div style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: 4 }}>
//                     {formatVND(pick(b, ['totalPrice','TotalPrice'], 0))}
//                   </div>
//                 </div>

//                 {/* Actions */}
//                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
//                   <Link className="btn btn-outline" to={`/my-tickets/${id}`}
//                     style={{ fontSize: '0.85rem', padding: '0.35rem 1rem' }}>
//                     Xem chi tiết
//                   </Link>

//                   {canReview && (
//                     <Link className="btn btn-primary" to={`/my-tickets/${id}#review`}
//                       style={{ fontSize: '0.85rem', padding: '0.35rem 1rem' }}>
//                       ⭐ Đánh giá
//                     </Link>
//                   )}

//                   {hasReview && (
//                     <span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>
//                       {'★'.repeat(Number(pick(b.review, ['rating','Rating'], 0)))} Đã đánh giá
//                     </span>
//                   )}
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       </div>
//     </UserLayout>
//   );
// }
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import UserLayout from '../layouts/UserLayout';
import { bookingApi } from '../services/bookingApi';
import { formatVND, labelBookingStatus, pick } from '../api';

const STATUS_TABS = [
  { label: 'Tất cả',     value: null },
  { label: 'Hoàn thành', value: 3 },
  { label: 'Đã hủy',     value: 2 },
  { label: 'Hoàn tiền',  value: 4 },
];

function formatDateTime(value) {
  if (!value) return '--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(value));
}

function statusClass(bs) {
  if (bs === 3) return 'ticket-status status-confirmed';   // Hoàn thành - xanh
  if (bs === 2) return 'ticket-status status-cancelled';   // Đã hủy - đỏ
  if (bs === 4) return 'ticket-status status-pending';     // Hoàn tiền - vàng
  return 'ticket-status';
}

export default function OrderHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [activeTab, setActiveTab] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await bookingApi.my();
        const all = Array.isArray(data) ? data : [];
        const finished = all.filter(b => {
          const bs = Number(b.bookingStatus ?? b.BookingStatus ?? 0);
          return bs === 2 || bs === 3 || bs === 4;
        });
        setBookings(finished);
      } catch (err) {
        setError(err.message || 'Không tải được lịch sử đơn hàng.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = activeTab === null
    ? bookings
    : bookings.filter(b => Number(pick(b, ['bookingStatus', 'BookingStatus'], 0)) === activeTab);

  return (
    <UserLayout>
      <main className="account-page">
        <section className="account-panel my-ticket-panel">
          <div className="account-head">
            <div>
              <h1>Lịch sử đơn hàng</h1>
              <p>Các đơn đã hoàn thành, đã hủy hoặc được hoàn tiền.</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '1rem 0 1.5rem' }}>
            {STATUS_TABS.map(tab => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(tab.value)}
                className={`btn ${activeTab === tab.value ? 'btn-primary' : 'btn-outline'}`}
                style={{ borderRadius: 20, padding: '0.35rem 1rem', fontSize: '0.875rem' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading && <p className="muted">Đang tải...</p>}
          {error && <p className="profile-status">{error}</p>}

          {!loading && !error && filtered.length === 0 && (
            <div className="empty-state">
              <i className="fa-solid fa-clock-rotate-left" />
              <h3>Chưa có đơn nào</h3>
              <p>Các đơn đã hoàn thành, đã hủy hoặc hoàn tiền sẽ hiển thị tại đây.</p>
            </div>
          )}

          <div className="my-ticket-list">
            {filtered.map((item) => {
              const bookingId = pick(item, ['bookingID', 'BookingID', 'bookingId', 'id']);
              const bs = Number(pick(item, ['bookingStatus', 'BookingStatus'], 0));
              const seatLabels = pick(item, ['seatLabels', 'SeatLabels'], []);
              const cancelReason = pick(item, ['cancelReason', 'CancelReason'], '');
              const refundAmount = pick(item, ['refundAmount', 'RefundAmount'], null);
              const hasReview = Boolean(pick(item, ['hasReview', 'HasReview'], false));
              const reviewRating = pick(item, ['reviewRating', 'ReviewRating'], 0);
              const canReview = !hasReview && bs === 3;

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
                    <span className={statusClass(bs)}>{labelBookingStatus(bs)}</span>
                    {cancelReason && <small>Lý do hủy: {cancelReason}</small>}
                    {refundAmount !== null && refundAmount !== undefined && bs === 4 && (
                      <small>Đã hoàn: {formatVND(refundAmount)}</small>
                    )}

                    <Link className="btn btn-outline" to={`/my-tickets/${bookingId}`}>Xem chi tiết</Link>

                    {hasReview ? (
                      <span className="ticket-status status-confirmed">
                        {'★'.repeat(Number(reviewRating))} Đã đánh giá
                      </span>
                    ) : canReview ? (
                      <Link className="btn btn-primary" to={`/my-tickets/${bookingId}#review`}>Đánh giá</Link>
                    ) : null}
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