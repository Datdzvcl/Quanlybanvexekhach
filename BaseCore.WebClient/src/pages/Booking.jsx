import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { API_BASE, formatVND, normalizeTrip, pick } from '../api';

const seats = 'ABCDEFGHIJ'.split('').flatMap((row) => [1, 2, 3, 4].map((number) => `${row}${number}`));

export default function Booking() {
  const [params] = useSearchParams();
  const routeParams = useParams();
  const navigate = useNavigate();
  const tripId = params.get('tripId') || routeParams.id;

  const [trip, setTrip] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [passenger, setPassenger] = useState({ fullName: '', phone: '', email: '' });

  useEffect(() => {
    if (!tripId) {
      alert('Không tìm thấy chuyến xe.');
      navigate('/search');
      return;
    }

    Promise.all([
      fetch(`${API_BASE}/api/trips/${tripId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_BASE}/api/buses`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch(`${API_BASE}/api/operators`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      loadBookedSeats(tripId),
    ])
      .then(([tripData, busData, operatorData, seatData]) => {
        if (!tripData) throw new Error('Trip not found');

        const normalized = normalizeTrip(tripData);
        const enriched = enrichTrip(
          normalized,
          Array.isArray(busData) ? busData : [],
          Array.isArray(operatorData) ? operatorData : []
        );

        setTrip(enriched);
        setBookedSeats(Array.isArray(seatData) ? seatData : []);
      })
      .catch(() => {
        alert('Lỗi khi lấy thông tin chuyến xe.');
        navigate('/search');
      });
  }, [tripId, navigate]);

  const total = useMemo(() => Number(trip?.price || 0) * selectedSeats.length, [trip, selectedSeats]);

  const toggleSeat = (seat) => {
    if (bookedSeats.includes(seat)) return;
    if (selectedSeats.includes(seat)) {
      setSelectedSeats((prev) => prev.filter((value) => value !== seat));
      return;
    }
    if (selectedSeats.length >= 6) {
      alert('Bạn chỉ được chọn tối đa 6 ghế.');
      return;
    }
    setSelectedSeats((prev) => [...prev, seat]);
  };

  const submit = async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (selectedSeats.length === 0) {
      alert('Vui lòng chọn ít nhất 1 ghế.');
      return;
    }

    if (!passenger.fullName.trim() || !passenger.phone.trim()) {
      alert('Vui lòng nhập họ tên và số điện thoại.');
      return;
    }

    let bookingId;

    try {
      const latestBookedSeats = await loadBookedSeats(tripId);
      const conflictedSeats = selectedSeats.filter((seat) => latestBookedSeats.includes(seat));

      if (conflictedSeats.length > 0) {
        setBookedSeats((prev) => Array.from(new Set([...prev, ...latestBookedSeats])));
        setSelectedSeats((prev) => prev.filter((seat) => !conflictedSeats.includes(seat)));
        alert(`Ghế ${conflictedSeats.join(', ')} đã có người đặt. Vui lòng chọn ghế khác.`);
        return;
      }

      const bookingResponse = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripID: Number(tripId),
           UserID: Number(user.userId || user.UserID || user.id || 0) || null,
          customerName: passenger.fullName.trim(),
          customerPhone: passenger.phone.trim(),
          customerEmail: passenger.email.trim(),
          totalSeats: selectedSeats.length,
          totalPrice: total,
          paymentMethod: 'Online',
          paymentStatus: 'Pending',
        }),
      });

      if (!bookingResponse.ok) {
        const message = await bookingResponse.text().catch(() => '');
        throw new Error(message || 'Không thể tạo đơn hàng');
      }

      const bookingData = await bookingResponse.json();
      bookingId = bookingData?.bookingID || bookingData?.BookingID || bookingData?.bookingId || bookingData?.id;

      if (!bookingId) {
        throw new Error('Không lấy được mã đơn hàng');
      }

      const seatPayload = selectedSeats.map((seat) => ({
        bookingID: bookingId,
        seatLabel: seat,
        qrCode: '',
      }));

      const seatResponse = await fetch(`${API_BASE}/api/ticketseats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seatPayload),
      });

      if (!seatResponse.ok) {
        const message = await seatResponse.text().catch(() => '');
        throw new Error(message || 'Không thể lưu ghế');
      }

      navigate(`/payment?bookingId=${bookingId}`);
    } catch (error) {
      if (bookingId) {
        try {
          await fetch(`${API_BASE}/api/bookings/${bookingId}`, { method: 'DELETE' });
        } catch {}
      }

      const message = String(error?.message || '');
      const matchedSeats = [...message.matchAll(/Ghế\s+([A-Z]\d+)/gi)].map((match) => match[1].toUpperCase());

      if (matchedSeats.length > 0) {
        setBookedSeats((prev) => Array.from(new Set([...prev, ...matchedSeats])));
        setSelectedSeats((prev) => prev.filter((seat) => !matchedSeats.includes(seat)));
      }

      alert(message || 'Đã xảy ra lỗi khi tạo đơn hàng.');
    }
  };

  if (!trip) {
    return (
      <>
        <Header simple />
        <div className="loading">
          <i className="fa-solid fa-spinner fa-spin fa-2x" />
          <br />
          <br />
          Đang chuẩn bị trang đặt vé...
        </div>
      </>
    );
  }

  const departureTime = new Date(trip.departureTime);

  return (
    <>
      <Header simple={false} />
      <div className="container booking-layout">
        <div className="booking-form-area">
          <div className="booking-card">
            <h3>
              <i className="fa-solid fa-couch" /> 1. Chọn chỗ ngồi
            </h3>
            <p className="center muted">Vui lòng click vào ghế bạn muốn chọn</p>
            <div className="seat-legend">
              <span>
                <b className="empty" /> Còn trống
              </span>
              <span>
                <b className="chosen" /> Đang chọn
              </span>
              <span>
                <b className="sold" /> Đã bán
              </span>
            </div>
            <div className="seat-map">
              {seats.map((seat) => (
                <button
                  key={seat}
                  type="button"
                  onClick={() => toggleSeat(seat)}
                  className={`seat ${bookedSeats.includes(seat) ? 'booked' : ''} ${selectedSeats.includes(seat) ? 'selected' : ''}`}
                >
                  {seat}
                </button>
              ))}
            </div>
          </div>

          <div className="booking-card">
            <h3>
              <i className="fa-regular fa-id-card" /> 2. Thông tin hành khách
            </h3>
            <div className="form-group">
              <label>Họ và tên *</label>
              <input
                value={passenger.fullName}
                onChange={(e) => setPassenger({ ...passenger, fullName: e.target.value })}
                placeholder="VD: Nguyễn Văn A"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Số điện thoại *</label>
                <input
                  value={passenger.phone}
                  onChange={(e) => setPassenger({ ...passenger, phone: e.target.value })}
                  placeholder="VD: 0912345678"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  value={passenger.email}
                  onChange={(e) => setPassenger({ ...passenger, email: e.target.value })}
                  placeholder="VD: email@example.com"
                />
              </div>
            </div>
          </div>
        </div>

        <aside className="booking-summary">
          <h3>THÔNG TIN CHUYẾN ĐI</h3>
          <div className="summary-trip">
            <h4>
              {trip.departureLocation} ➔ {trip.arrivalLocation}
            </h4>
            <p>
              <strong>Ngày đi:</strong>
              <span>{departureTime.toLocaleDateString('vi-VN')}</span>
            </p>
            <p>
              <strong>Giờ khởi hành:</strong>
              <span>{departureTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
            </p>
            <p>
              <strong>Nhà xe:</strong>
              <span>{trip.operator || 'Chưa rõ'}</span>
            </p>
            <p>
              <strong>Loại xe:</strong>
              <span>{trip.busType || 'Chưa rõ'}</span>
            </p>
          </div>

          <p className="line">
            <span>Ghế đã chọn:</span>
            <b>{selectedSeats.length ? selectedSeats.join(', ') : 'Chưa chọn'}</b>
          </p>
          <p className="line">
            <span>Đơn giá:</span>
            <span>{formatVND(trip.price)}</span>
          </p>
          <div className="total-price">
            <span>Tổng cộng:</span>
            <span>{formatVND(total)}</span>
          </div>
          <button className="btn btn-primary btn-checkout" onClick={submit}>
            Tiếp tục thanh toán <i className="fa-solid fa-chevron-right" />
          </button>
        </aside>
      </div>
    </>
  );
}

function enrichTrip(trip, buses, operators) {
  if (trip.operator && trip.busType) return trip;

  const bus = buses.find((item) => String(pick(item, ['busID', 'BusID'])) === String(trip.busId));
  const operatorId = pick(bus, ['operatorID', 'OperatorID']);
  const operator = operators.find((item) => String(pick(item, ['operatorID', 'OperatorID'])) === String(operatorId));

  return {
    ...trip,
    busType: trip.busType || pick(bus, ['busType', 'BusType']),
    operator: trip.operator || pick(bus, ['operatorName', 'OperatorName']) || pick(operator, ['name', 'Name']),
  };
}

async function loadBookedSeats(tripId) {
  const directSeats = await fetch(`${API_BASE}/api/ticketseats/trip/${tripId}`)
    .then((response) => (response.ok ? response.json() : []))
    .catch(() => []);

  const normalizedDirectSeats = normalizeSeatLabels(directSeats);
  if (normalizedDirectSeats.length > 0) {
    return normalizedDirectSeats;
  }

  const adminSeats = await fetch(`${API_BASE}/api/admin/ticket-seats`)
    .then((response) => (response.ok ? response.json() : []))
    .catch(() => []);

  return normalizeSeatLabels(
    Array.isArray(adminSeats)
      ? adminSeats.filter((seat) => String(seat.tripID ?? seat.tripId) === String(tripId))
      : []
  );
}

function normalizeSeatLabels(seatsData) {
  if (!Array.isArray(seatsData)) return [];

  return seatsData
    .map((seat) => seat.SeatLabel || seat.seatLabel)
    .filter(Boolean)
    .map((seat) => String(seat).toUpperCase());
}
