import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import UserLayout from '../layouts/UserLayout';
import { formatVND, pick } from '../api';
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

function stopText(stop) {
  if (!stop) return '--';
  const name = pick(stop, ['stopName', 'StopName'], '');
  const address = pick(stop, ['stopAddress', 'StopAddress'], '');
  return address ? `${name} - ${address}` : name || '--';
}

function statusClass(status) {
  return `ticket-status status-${String(status || '').toLowerCase()}`;
}

function qrValue(booking) {
  const qrCodes = booking?.qrCodes || booking?.QrCodes || [];
  const ticketSeats = booking?.ticketSeats || booking?.TicketSeats || [];
  return qrCodes[0] || ticketSeats[0]?.qrCode || ticketSeats[0]?.QRCode || `BOOKING:${pick(booking, ['bookingID', 'BookingID', 'bookingId', 'id'])}`;
}

function PseudoQrCode({ value }) {
  const cells = useMemo(() => {
    let seed = 0;
    const source = String(value || 'ticket');
    for (let i = 0; i < source.length; i += 1) seed = (seed * 31 + source.charCodeAt(i)) >>> 0;
    return Array.from({ length: 121 }, (_, index) => {
      const row = Math.floor(index / 11);
      const col = index % 11;
      const finder = (row < 3 && col < 3) || (row < 3 && col > 7) || (row > 7 && col < 3);
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return finder || seed % 3 === 0;
    });
  }, [value]);

  return (
    <div className="pseudo-qr">
      {cells.map((filled, index) => <span key={index} className={filled ? 'filled' : ''} />)}
    </div>
  );
}

export default function MyTicketDetail() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadBooking = async () => {
    setLoading(true);
    setError('');
    try {
      setBooking(await bookingApi.getById(id));
    } catch (err) {
      setError(err.message || 'Không tải được chi tiết vé.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooking();
  }, [id]);

  const requestCancel = async () => {
    const reason = window.prompt('Nhập lý do yêu cầu hủy vé:', 'Khách yêu cầu hủy vé');
    if (reason === null) return;

    setActionLoading(true);
    try {
      await bookingApi.requestCancel(id, { cancelReason: reason });
      await loadBooking();
      alert('Đã gửi yêu cầu hủy vé.');
    } catch (err) {
      alert(err.message || 'Không thể gửi yêu cầu hủy vé.');
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
          <Link className="btn btn-primary" to="/my-tickets">Quay lại Vé của tôi</Link>
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
  const canRequestCancel = !['Cancelled', 'CancelRequested'].includes(String(bookingStatus));
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
              <span className={statusClass(paymentStatus)}>{paymentStatus}</span>
              <span className={statusClass(bookingStatus)}>{bookingStatus}</span>
            </div>
          </div>

          <div className="ticket-detail-grid">
            <div><span>Nhà xe</span><strong>{pick(booking, ['operatorName', 'OperatorName'], pick(operator, ['name', 'Name'], '--'))}</strong></div>
            <div><span>Loại xe</span><strong>{pick(bus, ['busType', 'BusType'], pick(booking, ['busType', 'BusType'], '--'))}</strong></div>
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
            <div><span>Phương thức thanh toán</span><strong>{pick(booking, ['paymentMethod', 'PaymentMethod'], '--')}</strong></div>
          </div>
        </main>

        <aside className="ticket-detail-side">
          <h2>QR code</h2>
          <PseudoQrCode value={code} />
          <p>{code}</p>
          <Link className="btn btn-outline" to="/my-tickets">Quay lại danh sách</Link>
          <button
            type="button"
            className="btn btn-danger"
            disabled={!canRequestCancel || actionLoading}
            onClick={requestCancel}
          >
            {bookingStatus === 'CancelRequested' ? 'Đã yêu cầu hủy' : 'Yêu cầu hủy vé'}
          </button>
        </aside>
      </section>
    </UserLayout>
  );
}
