// import { useEffect, useMemo, useState } from 'react';
// import Navbar from '../components/Navbar';
// import { apiFetch, formatVND, pick } from '../api';

// const readStoredUser = () => JSON.parse(localStorage.getItem('user') || '{}');

// const formatDateTime = (value) => {
//   if (!value) return 'Chưa có';
//   const date = new Date(value);
//   if (Number.isNaN(date.getTime())) return value;
//   return date.toLocaleString('vi-VN');
// };

// export default function MyTickets() {
//   const user = useMemo(readStoredUser, []);
//   const [bookings, setBookings] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   const userId = String(user.userId || user.UserID || user.id || user.Id || '');
//   const email = String(user.email || user.Email || '').toLowerCase();

//   useEffect(() => {
//     apiFetch('/api/bookings')
//       .then((data) => {
//         const rows = Array.isArray(data) ? data : [];
//         setBookings(rows.filter((item) => {
//           const bookingUserId = String(pick(item, ['userID', 'UserID', 'userId'], ''));
//           const bookingEmail = String(pick(item, ['customerEmail', 'CustomerEmail'], '')).toLowerCase();
//           return (userId && bookingUserId === userId) || (email && bookingEmail === email);
//         }));
//       })
//       .catch((err) => setError(err.message || 'Không tải được danh sách vé.'))
//       .finally(() => setLoading(false));
//   }, [email, userId]);

//   return (
//     <>
//       <Navbar />
//       <main className="account-page">
//         <section className="account-panel">
//           <div className="account-head">
//             <div>
//               <h1>Vé của tôi</h1>
//               <p>Theo dõi các vé đã đặt bằng tài khoản hiện tại.</p>
//             </div>
//           </div>

//           {loading && <p className="muted">Đang tải vé...</p>}
//           {error && <p className="profile-status">{error}</p>}

//           {!loading && !error && bookings.length === 0 && (
//             <div className="empty-state">
//               <i className="fa-solid fa-ticket" />
//               <h3>Chưa có vé nào</h3>
//               <p>Các vé đặt bằng email hoặc tài khoản này sẽ hiển thị tại đây.</p>
//             </div>
//           )}

//           <div className="ticket-list">
//             {bookings.map((item) => {
//               const id = pick(item, ['bookingID', 'BookingID', 'bookingId', 'id']);
//               return (
//                 <article className="ticket-card" key={id}>
//                   <div>
//                     <h3>Vé #{id}</h3>
//                     <p>{pick(item, ['customerName', 'CustomerName'], 'Khách hàng')}</p>
//                   </div>
//                   <div className="ticket-meta">
//                     <span><i className="fa-solid fa-calendar-days" /> {formatDateTime(pick(item, ['bookingDate', 'BookingDate']))}</span>
//                     <span><i className="fa-solid fa-chair" /> {pick(item, ['totalSeats', 'TotalSeats'], 0)} ghế</span>
//                     <span><i className="fa-solid fa-credit-card" /> {pick(item, ['paymentStatus', 'PaymentStatus'], 'Pending')}</span>
//                   </div>
//                   <strong>{formatVND(pick(item, ['totalPrice', 'TotalPrice'], 0))}</strong>
//                 </article>
//               );
//             })}
//           </div>
//         </section>
//       </main>
//     </>
//   );
// }
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { apiFetch, formatVND, pick, AUTH_BASE } from '../api';

const readStoredUser = () => JSON.parse(localStorage.getItem('user') || '{}');

const formatDateTime = (value) => {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
};

const STATUS_COLORS = {
  'Paid': { bg: '#dcfce7', color: '#16a34a' },
  'Pending': { bg: '#fef9c3', color: '#854d0e' },
  'Cancelled': { bg: '#fee2e2', color: '#dc2626' },
};

export default function MyTickets() {
  const user = useMemo(readStoredUser, []);
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const userId = String(user.userId || user.UserID || user.id || user.Id || '');
  const email = String(user.email || user.Email || '').toLowerCase();

  const loadBookings = () => {
    setLoading(true);
    apiFetch('/api/bookings')
      .then((data) => {
        const rows = Array.isArray(data) ? data : [];
        setBookings(rows.filter((item) => {
          const bookingUserId = String(pick(item, ['userID', 'UserID', 'userId'], ''));
          const bookingEmail = String(pick(item, ['customerEmail', 'CustomerEmail'], '')).toLowerCase();
          return (userId && bookingUserId === userId) || (email && bookingEmail === email);
        }).sort((a, b) => new Date(pick(b, ['bookingDate','BookingDate'])) - new Date(pick(a, ['bookingDate','BookingDate']))));
      })
      .catch((err) => setError(err.message || 'Không tải được danh sách vé.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBookings(); }, []);

  const cancelBooking = async (id) => {
    if (!confirm(`Bạn có chắc muốn hủy vé #${id}?\nGhế sẽ được hoàn lại cho chuyến xe.`)) return;
    setActionLoading(true);
    try {
      // Gọi endpoint /cancel — hoàn ghế + đổi status "Cancelled"
      await apiFetch(`/api/bookings/${id}/cancel`, { method: 'PUT' });
      alert('Đã hủy vé thành công! Ghế đã được hoàn lại.');
      loadBookings();
      setSelectedBooking(null);
    } catch (e) {
      alert(e.message || 'Không thể hủy vé.');
    } finally {
      setActionLoading(false);
    }
  };

  const payBooking = (id) => {
    navigate(`/payment?bookingId=${id}`);
  };

  // Chi tiết vé modal
  if (selectedBooking) {
    const id = pick(selectedBooking, ['bookingID', 'BookingID']);
    const status = pick(selectedBooking, ['paymentStatus', 'PaymentStatus'], 'Pending');
    const statusStyle = STATUS_COLORS[status] || STATUS_COLORS['Pending'];

    return (
      <>
        <Header />
        <main className="account-page">
          <section className="account-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <button className="btn btn-outline" onClick={() => setSelectedBooking(null)}>← Quay lại</button>
              <h2 style={{ margin: 0 }}>Chi tiết vé #{id}</h2>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 24, marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 16px 0', color: '#2563eb' }}>Thông tin đặt vé</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  ['Mã vé', `#${id}`],
                  ['Khách hàng', pick(selectedBooking, ['customerName', 'CustomerName'])],
                  ['SĐT', pick(selectedBooking, ['customerPhone', 'CustomerPhone'])],
                  ['Email', pick(selectedBooking, ['customerEmail', 'CustomerEmail'])],
                  ['Số ghế', pick(selectedBooking, ['totalSeats', 'TotalSeats'], 0)],
                  ['Phương thức', pick(selectedBooking, ['paymentMethod', 'PaymentMethod'], '')],
                  ['Ngày đặt', formatDateTime(pick(selectedBooking, ['bookingDate', 'BookingDate']))],
                  ['Tổng tiền', formatVND(pick(selectedBooking, ['totalPrice', 'TotalPrice'], 0))],
                ].map(([label, value]) => (
                  <div key={label} style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#666' }}>Trạng thái:</span>
                <span style={{ padding: '4px 16px', borderRadius: 20, fontWeight: 700, ...statusStyle }}>{status}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {status === 'Pending' && (
                <>
                  <button
                    className="btn btn-primary"
                    disabled={actionLoading}
                    onClick={() => payBooking(id)}
                    style={{ background: '#16a34a', borderColor: '#16a34a' }}
                  >
                    <i className="fa-solid fa-credit-card" /> Thanh toán ngay
                  </button>
                  <button
                    className="btn btn-danger"
                    disabled={actionLoading}
                    onClick={() => cancelBooking(id)}
                  >
                    <i className="fa-solid fa-xmark" /> Hủy vé
                  </button>
                </>
              )}
              {status === 'Paid' && (
                <button
                  className="btn btn-outline"
                  onClick={() => window.print()}
                >
                  <i className="fa-solid fa-print" /> In vé
                </button>
              )}
              {status === 'Cancelled' && (
                <p style={{ color: '#dc2626', fontWeight: 600 }}>
                  <i className="fa-solid fa-ban" /> Vé này đã bị hủy
                </p>
              )}
            </div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="account-page">
        <section className="account-panel">
          <div className="account-head">
            <div>
              <h1>Vé của tôi</h1>
              <p>Theo dõi và quản lý các vé đã đặt.</p>
            </div>
          </div>

          {loading && <p className="muted">Đang tải vé...</p>}
          {error && <p className="profile-status">{error}</p>}

          {!loading && !error && bookings.length === 0 && (
            <div className="empty-state">
              <i className="fa-solid fa-ticket" />
              <h3>Chưa có vé nào</h3>
              <p>Các vé đặt bằng email hoặc tài khoản này sẽ hiển thị tại đây.</p>
            </div>
          )}

          <div className="ticket-list">
            {bookings.map((item) => {
              const id = pick(item, ['bookingID', 'BookingID', 'bookingId', 'id']);
              const status = pick(item, ['paymentStatus', 'PaymentStatus'], 'Pending');
              const statusStyle = STATUS_COLORS[status] || STATUS_COLORS['Pending'];

              return (
                <article className="ticket-card" key={id} style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedBooking(item)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0' }}>Vé #{id}</h3>
                      <p style={{ margin: 0, color: '#666' }}>{pick(item, ['customerName', 'CustomerName'], 'Khách hàng')}</p>
                      {pick(item, ['route', 'Route']) && (
                        <p style={{ margin: '4px 0 0', color: '#2563eb', fontWeight: 600 }}>
                          <i className="fa-solid fa-route" /> {pick(item, ['route', 'Route'])}
                        </p>
                      )}
                    </div>
                    <span style={{ padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: 13, ...statusStyle }}>
                      {status}
                    </span>
                  </div>

                  <div className="ticket-meta" style={{ marginTop: 12 }}>
                    <span><i className="fa-solid fa-calendar-days" /> {formatDateTime(pick(item, ['bookingDate', 'BookingDate']))}</span>
                    <span><i className="fa-solid fa-chair" /> {pick(item, ['totalSeats', 'TotalSeats'], 0)} ghế</span>
                    <span><i className="fa-solid fa-money-bill" /> {formatVND(pick(item, ['totalPrice', 'TotalPrice'], 0))}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-outline" style={{ fontSize: 13, padding: '6px 12px' }}
                      onClick={() => setSelectedBooking(item)}>
                      <i className="fa-solid fa-eye" /> Chi tiết
                    </button>
                    {status === 'Pending' && (
                      <>
                        <button className="btn btn-primary" style={{ fontSize: 13, padding: '6px 12px', background: '#16a34a', borderColor: '#16a34a' }}
                          onClick={() => payBooking(id)}>
                          <i className="fa-solid fa-credit-card" /> Thanh toán
                        </button>
                        <button className="btn btn-danger" style={{ fontSize: 13, padding: '6px 12px' }}
                          onClick={() => cancelBooking(id)}>
                          <i className="fa-solid fa-xmark" /> Hủy
                        </button>
                      </>
                    )}
                    {status === 'Paid' && (
                      <button className="btn btn-outline" style={{ fontSize: 13, padding: '6px 12px' }}
                        onClick={() => window.print()}>
                        <i className="fa-solid fa-print" /> In vé
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
