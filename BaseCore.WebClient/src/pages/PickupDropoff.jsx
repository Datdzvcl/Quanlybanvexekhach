import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserLayout from '../layouts/UserLayout';
import { formatVND, pick } from '../api';
import { tripApi } from '../services/tripApi';

const PENDING_BOOKING_KEY = 'pendingBooking';

function readPendingBooking() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_BOOKING_KEY) || 'null');
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
    pickupStops: pickupStops.length ? pickupStops : items.filter((item) => Number(pick(item, ['stopType', 'StopType'])) === 1),
    dropoffStops: dropoffStops.length ? dropoffStops : items.filter((item) => Number(pick(item, ['stopType', 'StopType'])) === 2),
  };
}

function StopOption({ stop, checked, name, onChange }) {
  const id = Number(pick(stop, ['stopPointID', 'StopPointID', 'id', 'Id']));
  const stopName = pick(stop, ['stopName', 'StopName'], 'Điểm dừng');
  const stopAddress = pick(stop, ['stopAddress', 'StopAddress'], '');
  const stopOrder = pick(stop, ['stopOrder', 'StopOrder'], '');

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
        {stopOrder !== '' && <em>Thứ tự dừng: {stopOrder}</em>}
      </span>
    </label>
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

            <div className="stop-option-list">
              {pickupStops.length === 0 ? (
                <p className="muted">Chuyến này chưa có điểm đón khả dụng.</p>
              ) : (
                pickupStops.map((stop) => {
                  const id = Number(pick(stop, ['stopPointID', 'StopPointID', 'id', 'Id']));
                  return (
                    <StopOption
                      key={id}
                      stop={stop}
                      name="pickupStop"
                      checked={pickupStopId === id}
                      onChange={setPickupStopId}
                    />
                  );
                })
              )}
            </div>
          </div>

          <div className="pickup-section-card">
            <div className="pickup-section-head">
              <i className="fa-solid fa-flag-checkered" />
              <div>
                <h2>Điểm trả</h2>
                <p>Chọn nơi bạn sẽ xuống xe.</p>
              </div>
            </div>

            <div className="stop-option-list">
              {dropoffStops.length === 0 ? (
                <p className="muted">Chuyến này chưa có điểm trả khả dụng.</p>
              ) : (
                dropoffStops.map((stop) => {
                  const id = Number(pick(stop, ['stopPointID', 'StopPointID', 'id', 'Id']));
                  return (
                    <StopOption
                      key={id}
                      stop={stop}
                      name="dropoffStop"
                      checked={dropoffStopId === id}
                      onChange={setDropoffStopId}
                    />
                  );
                })
              )}
            </div>
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
