import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import UserLayout from '../layouts/UserLayout';
import { formatVND, labelBookingStatus, labelPaymentMethod, pick } from '../api';
import { bookingApi } from '../services/bookingApi';
import { useAuth } from '../contexts/AuthContext';
import { QRCodeSVG } from 'qrcode.react';

const LAST_SEARCH_KEY = 'lastTripSearchQuery';
const SUCCESS_BOOKINGS_KEY = 'lastSuccessfulBookingIds';

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

function getQrText(booking) {
  const qrCodes = booking?.qrCodes || booking?.QrCodes || [];
  const ticketSeats = booking?.ticketSeats || booking?.TicketSeats || [];
  return qrCodes[0] || ticketSeats[0]?.qrCode || ticketSeats[0]?.QRCode || `BOOKING:${booking?.bookingID || booking?.BookingID}`;
}

function getSuccessMode(bookings) {
  const methods = bookings.map((booking) =>
    String(pick(booking, ['paymentMethod', 'PaymentMethod'], '')).toLowerCase()
  );
  const hasCash = methods.some((method) => method === 'cash' || method.includes('tiền mặt') || method.includes('tien mat'));
  const hasOnline = methods.some((method) =>
    method === 'banktransfer' ||
    method === 'ewallet' ||
    method === 'vnpay' ||
    method.includes('chuyển khoản') ||
    method.includes('chuyen khoan') ||
    method.includes('ví điện tử') ||
    method.includes('vi dien tu')
  );

  if (hasCash && !hasOnline) return 'cash';
  if (hasOnline && !hasCash) return 'online';
  return 'mixed';
}

function readSuccessBookingIds(currentId) {
  try {
    const ids = JSON.parse(localStorage.getItem(SUCCESS_BOOKINGS_KEY) || '[]')
      .map((item) => String(item))
      .filter(Boolean);

    if (ids.includes(String(currentId))) {
      return Array.from(new Set(ids));
    }
  } catch {
    return [String(currentId)];
  }

  return [String(currentId)];
}


function SuccessTicketBlock({ booking, title }) {
  const trip = booking.trip || booking.Trip || {};
  const operator = booking.operatorInfo || booking.OperatorInfo || {};
  const pickupStop = booking.pickupStop || booking.PickupStop;
  const dropoffStop = booking.dropoffStop || booking.DropoffStop;
  const seatLabels = booking.seatLabels || booking.SeatLabels || [];

  return (
    <section className="success-ticket-block">
      {title && <h3>{title}</h3>}
      <div className="success-info-grid">
        <div><span>Nhà xe</span><strong>{pick(booking, ['operatorName', 'OperatorName'], pick(operator, ['name', 'Name'], '--'))}</strong></div>
        <div><span>Tuyến</span><strong>{pick(trip, ['departureLocation', 'DepartureLocation'], pick(booking, ['departureLocation', 'DepartureLocation'], '--'))} → {pick(trip, ['arrivalLocation', 'ArrivalLocation'], pick(booking, ['arrivalLocation', 'ArrivalLocation'], '--'))}</strong></div>
        <div><span>Giờ đi</span><strong>{formatDateTime(pick(trip, ['departureTime', 'DepartureTime'], pick(booking, ['departureTime', 'DepartureTime'])))}</strong></div>
        <div><span>Giờ đến dự kiến</span><strong>{formatDateTime(pick(trip, ['arrivalTime', 'ArrivalTime'], pick(booking, ['arrivalTime', 'ArrivalTime'])))}</strong></div>
        <div><span>Ghế</span><strong>{seatLabels.join(', ') || '--'}</strong></div>
        <div><span>Điểm đón</span><strong>{pick(pickupStop, ['stopName', 'StopName'], '--')}</strong></div>
        <div><span>Điểm trả</span><strong>{pick(dropoffStop, ['stopName', 'StopName'], '--')}</strong></div>
        <div><span>Người đặt</span><strong>{pick(booking, ['customerName', 'CustomerName'], '--')}</strong></div>
        <div><span>Số điện thoại</span><strong>{pick(booking, ['customerPhone', 'CustomerPhone'], '--')}</strong></div>
        <div><span>Email</span><strong>{pick(booking, ['customerEmail', 'CustomerEmail'], '--')}</strong></div>
        <div><span>Phương thức</span><strong>{labelPaymentMethod(pick(booking, ['paymentMethod', 'PaymentMethod'], '--'))}</strong></div>
        <div><span>Tổng tiền</span><strong>{formatVND(pick(booking, ['totalPrice', 'TotalPrice'], 0))}</strong></div>
      </div>
    </section>
  );
}

export default function BookingSuccess() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const bookingIds = readSuccessBookingIds(id);
        const results = await Promise.allSettled(bookingIds.map((bookingId) => bookingApi.getById(bookingId)));
        const loadedBookings = results
          .filter((r) => r.status === 'fulfilled' && r.value)
          .map((r) => r.value);
        if (loadedBookings.length === 0) {
          setError('Không tìm thấy thông tin đơn đặt vé.');
        } else {
          setBookings(loadedBookings);
        }
      } catch (err) {
        setError(err.message || 'Không thể tải chi tiết đơn.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) {
    return (
      <UserLayout>
        <div className="loading">Đang tải thông tin đặt vé...</div>
      </UserLayout>
    );
  }

  if (error || bookings.length === 0) {
    return (
      <UserLayout>
        <div className="container pickup-placeholder">
          <h1>Không tải được đơn đặt vé</h1>
          <p>{error || 'Không tìm thấy booking.'}</p>
        </div>
      </UserLayout>
    );
  }

  const bookingIds = bookings.map((booking) => pick(booking, ['bookingID', 'bookingId', 'BookingID', 'id'])).filter(Boolean);
  const totalPrice = bookings.reduce((sum, booking) => sum + Number(pick(booking, ['totalPrice', 'TotalPrice'], 0)), 0);
  const continueSearchQuery = localStorage.getItem(LAST_SEARCH_KEY) || '';
  const continueSearchUrl = continueSearchQuery ? `/search-results?${continueSearchQuery}` : '/search-results';
  const isRoundTrip = bookings.length > 1;
  const successMode = getSuccessMode(bookings);
  const heroLabel = successMode === 'cash'
    ? 'Đặt chỗ thành công'
    : successMode === 'online'
      ? 'Thanh toán thành công'
      : 'Đặt vé thành công';
  const heroTitle = successMode === 'cash'
    ? 'Đặt chỗ đang chờ xác nhận'
    : successMode === 'online'
      ? 'Thanh toán đã ghi nhận'
      : 'Đơn đặt vé đã được tạo';
  const heroMessage = successMode === 'cash'
    ? 'Đơn đã được tạo và đang chờ nhân viên/admin xác nhận sau khi thu tiền mặt.'
    : successMode === 'online'
      ? 'Thanh toán đã được ghi nhận, vé sẽ chuyển sang đã xác nhận sau khi admin duyệt đơn.'
      : 'Đơn đã được tạo thành công và đang chờ admin xác nhận.';

  return (
    <UserLayout>
      <section className="success-hero">
        <div className="container success-hero-inner">
          <i className="fa-solid fa-circle-check" />
          <span>{heroLabel}</span>
          <h1>{heroTitle}</h1>
          <p>
            {isRoundTrip
              ? `Các mã đơn #${bookingIds.join(', #')} đã được tạo thành công.`
              : `Mã đơn #${bookingIds[0]} đã được tạo thành công.`}
            {' '}
            {heroMessage}
          </p>
        </div>
      </section>

      <section className="container success-layout">
        <main className="success-detail-card">
          <div className="success-detail-head">
            <h2>{isRoundTrip ? 'Chi tiết đơn khứ hồi' : 'Chi tiết đơn'}</h2>
            <span>{isRoundTrip ? `${bookings.length} vé` : labelBookingStatus(pick(bookings[0], ['bookingStatus', 'BookingStatus'], '--'))}</span>
          </div>

          {bookings.map((booking, index) => {
            const bookingId = pick(booking, ['bookingID', 'bookingId', 'BookingID', 'id']);
            return (
              <SuccessTicketBlock
                key={bookingId || index}
                booking={booking}
                title={isRoundTrip ? `${index === 0 ? 'Vé lượt đi' : 'Vé lượt về'} - Mã đơn #${bookingId}` : ''}
              />
            );
          })}

          {isRoundTrip && (
            <div className="success-roundtrip-total">
              <span>Tổng thanh toán</span>
              <strong>{formatVND(totalPrice)}</strong>
            </div>
          )}
        </main>

        <aside className="success-qr-card">
          <h2>Mã QR vé</h2>
          {bookings.map((booking, index) => {
            const qrText = getQrText(booking);
            const bookingId = pick(booking, ['bookingID', 'bookingId', 'BookingID', 'id']);
            return (
              <div className="success-qr-item" key={bookingId || index}>
                {isRoundTrip && <strong>{index === 0 ? 'Lượt đi' : 'Lượt về'}</strong>}
                <div className="success-qr-wrap">
                  <QRCodeSVG
                    value={qrText}
                    size={160}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                  />
                </div>
                <p>{qrText}</p>
              </div>
            );
          })}

          <div className="success-actions">
            <Link className="btn btn-primary" to="/">Quay lại trang chủ</Link>
            <Link className="btn btn-outline" to={continueSearchUrl}>Tiếp tục đặt vé</Link>
            {isAuthenticated && <Link className="btn btn-outline" to="/my-tickets">Xem vé của tôi</Link>}
          </div>
        </aside>
      </section>
    </UserLayout>
  );
}
