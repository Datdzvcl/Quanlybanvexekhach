import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserLayout from '../layouts/UserLayout';
import { formatVND, pick } from '../api';
import { tripApi } from '../services/tripApi';
import BookingSteps from '../components/BookingSteps';

const PENDING_BOOKING_KEY = 'pendingBooking';
const ROUND_TRIP_KEY = 'roundTripBooking';

function readPendingBooking() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_BOOKING_KEY) || 'null');
  } catch {
    return null;
  }
}

function readRoundTripBooking() {
  try {
    return JSON.parse(localStorage.getItem(ROUND_TRIP_KEY) || 'null');
  } catch {
    return null;
  }
}

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

function normalizeStops(response) {
  const pickupStops = response?.pickupStops || response?.PickupStops || [];
  const dropoffStops = response?.dropoffStops || response?.DropoffStops || [];
  const items = response?.items || response?.Items || [];

  return {
    pickupStops: pickupStops.length
      ? pickupStops
      : items.filter((item) => { const t = Number(pick(item, ['stopType', 'StopType'])); return t === 1 || t === 3; }),
    dropoffStops: dropoffStops.length
      ? dropoffStops
      : items.filter((item) => { const t = Number(pick(item, ['stopType', 'StopType'])); return t === 2 || t === 3; }),
  };
}

function addMinutes(dateStr, minutes) {
  if (!dateStr || minutes == null) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  d.setMinutes(d.getMinutes() + Number(minutes));
  return d;
}

function formatTime(date, departureDate) {
  if (!date) return null;
  const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (departureDate) {
    const startOfDep = new Date(departureDate);
    startOfDep.setHours(0, 0, 0, 0);
    const startOfEst = new Date(date);
    startOfEst.setHours(0, 0, 0, 0);
    const dayDiff = Math.round((startOfEst - startOfDep) / 86400000);
    if (dayDiff > 0) return `${timeStr} (+${dayDiff} ngày)`;
  }
  return timeStr;
}

function StopOption({ stop, checked, name, onChange, departureTime }) {
  const id = Number(pick(stop, ['stopPointID', 'StopPointID', 'id', 'Id']));
  const stopName = pick(stop, ['stopName', 'StopName'], 'Điểm dừng');
  const stopAddress = pick(stop, ['stopAddress', 'StopAddress'], '');
  const stopOrder = pick(stop, ['stopOrder', 'StopOrder'], '');
  const arrivalOffset = pick(stop, ['arrivalOffset', 'ArrivalOffset']);

  const estimatedTime = departureTime != null && arrivalOffset != null
    ? formatTime(addMinutes(departureTime, arrivalOffset), departureTime)
    : null;

  return (
    <label className={`stop-option ${checked ? 'selected' : ''}`}>
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={() => onChange(id)}
      />
      <span className="stop-radio-mark" />
      <span className="stop-option-body">
        <strong>{stopName}</strong>
        {stopAddress && <small>{stopAddress}</small>}
        <span className="stop-option-meta">
          {stopOrder !== '' && <em>Thứ tự dừng: {stopOrder}</em>}
          {estimatedTime && <em className="stop-estimated-time">⏱ Dự kiến: {estimatedTime}</em>}
        </span>
      </span>
    </label>
  );
}

function ScrollableStopList({ stops, selected, name, onChange, departureTime, emptyText }) {
  const scrollRef = useRef(null);
  const [showFade, setShowFade] = useState(false);

  const checkFade = () => {
    const el = scrollRef.current;
    if (!el) return;
    const needsScroll = el.scrollHeight > el.clientHeight + 4;
    setShowFade(needsScroll && el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  };

  useEffect(() => { checkFade(); }, [stops]);

  return (
    <div className="stop-list-outer">
      {stops.length > 0 && (
        <div className="stop-list-count">
          <i className="fa-solid fa-map-pin" />
          {stops.length} điểm khả dụng
        </div>
      )}
      <div className="stop-list-wrapper">
        <div className="stop-list-scroll" ref={scrollRef} onScroll={checkFade}>
          <div className="stop-option-list">
            {stops.length === 0 ? (
              <p className="muted">{emptyText}</p>
            ) : (
              stops.map((stop) => {
                const id = Number(pick(stop, ['stopPointID', 'StopPointID', 'id', 'Id']));
                return (
                  <StopOption
                    key={id}
                    stop={stop}
                    name={name}
                    checked={selected === id}
                    onChange={onChange}
                    departureTime={departureTime}
                  />
                );
              })
            )}
          </div>
        </div>
        {showFade && <div className="stop-list-fade" />}
      </div>
      {showFade && (
        <p className="stop-scroll-hint">
          <i className="fa-solid fa-chevron-down" /> Cuộn để xem thêm điểm
        </p>
      )}
    </div>
  );
}

export default function PickupDropoff() {
  const navigate = useNavigate();
  const [pendingBooking, setPendingBooking] = useState(() => readPendingBooking());
  const [pickupStops, setPickupStops] = useState([]);
  const [dropoffStops, setDropoffStops] = useState([]);
  const [pickupStopId, setPickupStopId] = useState(() => Number(readPendingBooking()?.pickupStopId || 0));
  const [dropoffStopId, setDropoffStopId] = useState(() => Number(readPendingBooking()?.dropoffStopId || 0));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const trip = pendingBooking?.trip || {};
  const tripId = pendingBooking?.tripId;
  const departureTime = pick(trip, ['departureTime', 'DepartureTime']);

  useEffect(() => {
    if (!tripId) {
      setLoading(false);
      setError('Không tìm thấy dữ liệu đặt vé tạm. Vui lòng chọn lại chuyến và ghế.');
      return;
    }

    const loadStops = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await tripApi.getStops(tripId);
        const normalized = normalizeStops(response);
        setPickupStops(normalized.pickupStops);
        setDropoffStops(normalized.dropoffStops);
      } catch (err) {
        setError(err.message || 'Không thể tải danh sách điểm đón/trả.');
      } finally {
        setLoading(false);
      }
    };

    loadStops();
  }, [tripId]);

  const selectedPickup = useMemo(
    () => pickupStops.find((stop) => Number(pick(stop, ['stopPointID', 'StopPointID', 'id', 'Id'])) === pickupStopId),
    [pickupStopId, pickupStops]
  );

  const selectedDropoff = useMemo(
    () => dropoffStops.find((stop) => Number(pick(stop, ['stopPointID', 'StopPointID', 'id', 'Id'])) === dropoffStopId),
    [dropoffStopId, dropoffStops]
  );

  const continueBooking = () => {
    if (!pickupStopId) {
      alert('Vui lòng chọn điểm đón.');
      return;
    }

    if (!dropoffStopId) {
      alert('Vui lòng chọn điểm trả.');
      return;
    }

    const nextBooking = {
      ...pendingBooking,
      pickupStopId,
      dropoffStopId,
      pickupStop: selectedPickup,
      dropoffStop: selectedDropoff,
    };

    const roundTrip = readRoundTripBooking();
    if (roundTrip?.returnDate && roundTrip.stage !== 'return') {
      const nextRoundTrip = {
        ...roundTrip,
        outbound: nextBooking,
        stage: 'return',
      };
      localStorage.setItem(ROUND_TRIP_KEY, JSON.stringify(nextRoundTrip));
      localStorage.removeItem(PENDING_BOOKING_KEY);

      const returnQuery = new URLSearchParams();
      returnQuery.set('from', roundTrip.to || pick(trip, ['arrivalLocation', 'ArrivalLocation'], ''));
      returnQuery.set('to', roundTrip.from || pick(trip, ['departureLocation', 'DepartureLocation'], ''));
      returnQuery.set('departureDate', roundTrip.returnDate);
      returnQuery.set('roundTripStage', 'return');
      navigate(`/search-results?${returnQuery.toString()}`);
      return;
    }

    if (roundTrip?.returnDate && roundTrip.stage === 'return') {
      const nextRoundTrip = {
        ...roundTrip,
        returnTrip: nextBooking,
        stage: 'complete',
      };
      localStorage.setItem(ROUND_TRIP_KEY, JSON.stringify(nextRoundTrip));
    }

    localStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify(nextBooking));
    setPendingBooking(nextBooking);
    navigate('/booking/contact');
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="loading">Đang tải điểm đón/trả...</div>
      </UserLayout>
    );
  }

  if (error) {
    return (
      <UserLayout>
        <div className="container pickup-placeholder">
          <h1>Chưa thể chọn điểm đón/trả</h1>
          <p>{error}</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/search-results')}>
            Tìm chuyến khác
          </button>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <section className="pickup-page-hero">
        <div className="container">
          <span>Thông tin hành trình</span>
          <h1>Chọn điểm đón và điểm trả</h1>
          <p>Hoàn tất điểm lên xe và xuống xe trước khi nhập thông tin liên hệ.</p>
          <BookingSteps step={2} />
        </div>
      </section>

      <section className="container pickup-layout">
        <main className="pickup-main">
          <div className="pickup-section-card">
            <div className="pickup-section-head">
              <i className="fa-solid fa-location-dot" />
              <div>
                <h2>Điểm đón</h2>
                <p>Chọn nơi bạn sẽ lên xe.</p>
              </div>
            </div>

            <ScrollableStopList
              stops={pickupStops}
              selected={pickupStopId}
              name="pickupStop"
              onChange={setPickupStopId}
              departureTime={departureTime}
              emptyText="Chuyến này chưa có điểm đón khả dụng."
            />
          </div>

          <div className="pickup-section-card">
            <div className="pickup-section-head">
              <i className="fa-solid fa-flag-checkered" />
              <div>
                <h2>Điểm trả</h2>
                <p>Chọn nơi bạn sẽ xuống xe.</p>
              </div>
            </div>

            <ScrollableStopList
              stops={dropoffStops}
              selected={dropoffStopId}
              name="dropoffStop"
              onChange={setDropoffStopId}
              departureTime={departureTime}
              emptyText="Chuyến này chưa có điểm trả khả dụng."
            />
          </div>
        </main>

        <aside className="pickup-summary">
          <h2>Tóm tắt đặt vé</h2>
          <div className="pickup-summary-route">
            <strong>{pick(trip, ['departureLocation', 'DepartureLocation'], '--')} → {pick(trip, ['arrivalLocation', 'ArrivalLocation'], '--')}</strong>
            <span>{formatDateTime(pick(trip, ['departureTime', 'DepartureTime']))}</span>
          </div>
          <div className="seat-summary-line">
            <span>Ghế đã chọn</span>
            <strong>{pendingBooking?.seatLabels?.join(', ') || 'Chưa chọn'}</strong>
          </div>
          <div className="seat-summary-line">
            <span>Số lượng</span>
            <strong>{pendingBooking?.seatLabels?.length || 0}</strong>
          </div>
          <div className="seat-summary-total">
            <span>Tổng tiền</span>
            <strong>{formatVND(pendingBooking?.totalPrice || 0)}</strong>
          </div>
          <button type="button" className="btn btn-primary pickup-next-btn" onClick={continueBooking}>
            Tiếp tục
            <i className="fa-solid fa-chevron-right" />
          </button>
        </aside>
      </section>
    </UserLayout>
  );
}
