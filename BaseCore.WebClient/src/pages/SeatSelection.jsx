import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import UserLayout from '../layouts/UserLayout';
import { formatVND, labelSeatStatus, pick } from '../api';
import { tripApi } from '../services/tripApi';
import { seatApi } from '../services/seatApi';
import BookingSteps from '../components/BookingSteps';

const SESSION_STORAGE_KEY = 'seatSessionId';
const HOLD_STORAGE_KEY = 'currentSeatHold';
const ROUND_TRIP_KEY = 'roundTripBooking';
const COOLDOWN_STORAGE_KEY = 'seatCooldown';
const COOLDOWN_MINUTES = 5;

function ensureSessionId() {
  const existing = localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const value = crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(SESSION_STORAGE_KEY, value);
  return value;
}

function getSeatLabel(seat) {
  return pick(seat, ['seatLabel', 'SeatLabel', 'label', 'Label']);
}

function getSeatStatus(seat) {
  return pick(seat, ['status', 'Status'], 'Available');
}

function getSeatHoldExpiresAt(seat) {
  return pick(seat, ['holdExpiresAt', 'HoldExpiresAt']);
}

function normalizeTrip(data) {
  const bus = data?.bus || data?.Bus || {};
  const operator = data?.operator || data?.Operator || {};
  return {
    id: pick(data, ['tripID', 'TripID', 'tripId', 'id']),
    operatorName: pick(data, ['operatorName', 'OperatorName'], pick(operator, ['name', 'Name'], 'Nhà xe')),
    busType: pick(data, ['busType', 'BusType'], pick(bus, ['busType', 'BusType'], 'Xe khách')),
    licensePlate: pick(data, ['licensePlate', 'LicensePlate'], pick(bus, ['licensePlate', 'LicensePlate'])),
    departureLocation: pick(data, ['departureLocation', 'DepartureLocation']),
    arrivalLocation: pick(data, ['arrivalLocation', 'ArrivalLocation']),
    departureTime: pick(data, ['departureTime', 'DepartureTime']),
    arrivalTime: pick(data, ['arrivalTime', 'ArrivalTime']),
    price: Number(pick(data, ['price', 'Price'], 0)),
    capacity: Number(pick(data, ['capacity', 'Capacity'], pick(bus, ['capacity', 'Capacity'], 0))),
  };
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

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function SeatSelection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tripId = Number(id);
  const [sessionId] = useState(() => ensureSessionId());
  const [trip, setTrip] = useState(null);
  const [seats, setSeats] = useState([]);
  const [layout, setLayout] = useState(null); // parsed SeatCell[] from API
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [busySeat, setBusySeat] = useState('');
  const [error, setError] = useState('');
  const [showExitModal, setShowExitModal] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(() => {
    try {
      const raw = localStorage.getItem(COOLDOWN_STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return new Date(data.until).getTime() > Date.now() ? data.until : null;
    } catch { return null; }
  });

  const pendingNavRef = useRef(null);
  const cancelingRef = useRef(false);
  const hasSeats = selectedSeats.length > 0;

  // Chặn nút Back trình duyệt — chỉ chạy khi hasSeats thay đổi (0↔>0)
  useEffect(() => {
    if (!hasSeats) return;
    window.history.pushState(null, '', window.location.href);
    const handler = () => {
      if (cancelingRef.current) { cancelingRef.current = false; return; }
      pendingNavRef.current = () => navigate(-1);
      setShowExitModal(true);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [hasSeats, navigate]);

  // Chặn đóng tab / F5
  useEffect(() => {
    const handler = (e) => {
      if (hasSeats) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasSeats]);

  const handleConfirmExit = async () => {
    setReleasing(true);
    try {
      if (selectedSeats.length > 0)
        await seatApi.release({ tripId, seatLabels: selectedSeats, sessionId });
      localStorage.removeItem(HOLD_STORAGE_KEY);
      window.dispatchEvent(new Event('holdSeatUpdated'));
    } catch { /* ignore */ } finally {
      setReleasing(false);
      setShowExitModal(false);
      pendingNavRef.current?.();
      pendingNavRef.current = null;
    }
  };

  const handleCancelExit = () => {
    setShowExitModal(false);
    pendingNavRef.current = null;
    // Đẩy lại guard entry để back tiếp theo vẫn bị chặn
    cancelingRef.current = true;
    window.history.go(1);
  };

  const loadSeats = useCallback(async () => {
    const response = await seatApi.getByTrip(tripId, { sessionId });
    const nextSeats = response?.seats || response?.Seats || [];
    const rawLayout = response?.layout || response?.Layout || null;
    try {
      setLayout(rawLayout ? JSON.parse(rawLayout) : null);
    } catch { setLayout(null); }
    const myHeldSeats = nextSeats.filter((seat) => getSeatStatus(seat) === 'HoldingByMe');
    const myHoldExpiresAt = myHeldSeats
      .map(getSeatHoldExpiresAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    setSeats(nextSeats);
    setSelectedSeats(myHeldSeats.map(getSeatLabel));
    if (myHoldExpiresAt) {
      setHoldExpiresAt(myHoldExpiresAt);
      localStorage.setItem(HOLD_STORAGE_KEY, JSON.stringify({
        tripId,
        sessionId,
        seatLabels: myHeldSeats.map(getSeatLabel),
        holdExpiresAt: myHoldExpiresAt,
      }));
    } else {
      setHoldExpiresAt(null);
      localStorage.removeItem(HOLD_STORAGE_KEY);
    }
  }, [sessionId, tripId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tripData] = await Promise.all([
        tripApi.getById(tripId),
        loadSeats(),
      ]);
      setTrip(normalizeTrip(tripData));

      const storedHold = JSON.parse(localStorage.getItem(HOLD_STORAGE_KEY) || 'null');
      if (storedHold?.tripId === tripId && storedHold?.sessionId === sessionId && new Date(storedHold.holdExpiresAt).getTime() > Date.now()) {
        setHoldExpiresAt(storedHold.holdExpiresAt);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu chọn ghế.');
    } finally {
      setLoading(false);
    }
  }, [loadSeats, sessionId, tripId]);

  useEffect(() => {
    if (!tripId) {
      navigate('/search-results', { replace: true });
      return;
    }
    loadData();
  }, [loadData, navigate, tripId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!holdExpiresAt) return;
    const expiresMs = new Date(holdExpiresAt).getTime();
    if (expiresMs > now) return;

    localStorage.removeItem(HOLD_STORAGE_KEY);
    window.dispatchEvent(new Event('holdSeatUpdated'));
    setHoldExpiresAt(null);
    setSelectedSeats([]);
    // Lưu cooldown 5 phút
    const until = new Date(Date.now() + COOLDOWN_MINUTES * 60 * 1000).toISOString();
    localStorage.setItem(COOLDOWN_STORAGE_KEY, JSON.stringify({ until }));
    setCooldownUntil(until);
    loadSeats().catch(() => {});
  }, [holdExpiresAt, loadSeats, now]);

  const seatByLabel = useMemo(() => {
    const map = new Map();
    seats.forEach((seat) => map.set(getSeatLabel(seat), seat));
    return map;
  }, [seats]);

  const total = useMemo(() => Number(trip?.price || 0) * selectedSeats.length, [selectedSeats.length, trip?.price]);
  const remainingMs = holdExpiresAt ? new Date(holdExpiresAt).getTime() - now : 0;
  const canContinue = selectedSeats.length > 0 && holdExpiresAt && remainingMs > 0;

  const floors = useMemo(() => {
    // Custom layout từ nhà xe
    if (Array.isArray(layout) && layout.length > 0) {
      const floorNums = [...new Set(layout.map(c => c.floor ?? 1))].sort((a, b) => a - b);
      return floorNums.map(f => {
        const floorCells = layout.filter(c => (c.floor ?? 1) === f);
        const rows = Math.max(...floorCells.map(c => c.row ?? 0)) + 1;
        const cols = Math.max(...floorCells.map(c => c.col ?? 0)) + 1;
        const grid = Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            const cell = floorCells.find(fc => fc.row === r && fc.col === c);
            if (!cell || cell.type !== 'seat' || !cell.label) return { type: cell?.type || 'empty', label: null, status: null };
            const seat = seatByLabel.get(cell.label);
            return {
              type: 'seat', label: cell.label,
              status: seat ? getSeatStatus(seat) : 'Available',
              holdExpiresAt: seat ? getSeatHoldExpiresAt(seat) : null,
            };
          })
        );
        return { name: floorNums.length > 1 ? `Tầng ${f}` : 'Sơ đồ ghế', grid, cols };
      });
    }

    // Fallback: lưới mặc định
    const allSeats = seats.map((seat) => ({
      label: getSeatLabel(seat),
      status: getSeatStatus(seat),
    }));
    if ((trip?.capacity || allSeats.length) > 40) {
      const half = Math.ceil(allSeats.length / 2);
      return [
        { name: 'Tầng 1', seats: allSeats.slice(0, half) },
        { name: 'Tầng 2', seats: allSeats.slice(half) },
      ];
    }
    return [{ name: 'Sơ đồ ghế', seats: allSeats }];
  }, [layout, seats, seatByLabel, trip?.capacity]);

  const holdSeat = async (seatLabel) => {
    setBusySeat(seatLabel);
    try {
      const nextSeats = Array.from(new Set([...selectedSeats, seatLabel]));
      const result = await seatApi.hold({
        tripId,
        seatLabels: nextSeats,
        sessionId,
      });

      const expiresAt = result?.holdExpiresAt || result?.HoldExpiresAt;
      setSelectedSeats(nextSeats);
      if (expiresAt) {
        setHoldExpiresAt(expiresAt);
        localStorage.setItem(HOLD_STORAGE_KEY, JSON.stringify({
          tripId,
          sessionId,
          seatLabels: nextSeats,
          holdExpiresAt: expiresAt,
        }));
        window.dispatchEvent(new Event('holdSeatUpdated'));
      }
      await loadSeats();
    } catch (err) {
      alert(err.message || 'Không thể giữ ghế này.');
      await loadSeats().catch(() => {});
    } finally {
      setBusySeat('');
    }
  };

  const releaseSeat = async (seatLabel) => {
    setBusySeat(seatLabel);
    try {
      await seatApi.release({
        tripId,
        seatLabels: [seatLabel],
        sessionId,
      });

      const nextSeats = selectedSeats.filter((item) => item !== seatLabel);
      setSelectedSeats(nextSeats);
      if (nextSeats.length === 0) {
        setHoldExpiresAt(null);
        localStorage.removeItem(HOLD_STORAGE_KEY);
      } else {
        const storedHold = JSON.parse(localStorage.getItem(HOLD_STORAGE_KEY) || 'null');
        localStorage.setItem(HOLD_STORAGE_KEY, JSON.stringify({
          ...(storedHold || {}),
          tripId,
          sessionId,
          seatLabels: nextSeats,
        }));
      }
      window.dispatchEvent(new Event('holdSeatUpdated'));
      await loadSeats();
    } catch (err) {
      alert(err.message || 'Không thể nhả ghế này.');
      await loadSeats().catch(() => {});
    } finally {
      setBusySeat('');
    }
  };

  const toggleSeat = (seatLabel) => {
    const status = getSeatStatus(seatByLabel.get(seatLabel));
    if (status === 'Booked' || status === 'HoldingByOther') return;

    if (selectedSeats.includes(seatLabel) || status === 'HoldingByMe') {
      releaseSeat(seatLabel);
      return;
    }

    holdSeat(seatLabel);
  };

  const continueBooking = () => {
    if (selectedSeats.length === 0) {
      alert('Vui lòng chọn ít nhất 1 ghế.');
      return;
    }

    if (!holdExpiresAt || remainingMs <= 0) {
      alert('Đã hết thời gian giữ ghế. Vui lòng chọn lại.');
      loadSeats().catch(() => {});
      return;
    }

    let bookingLeg = 'single';
    try {
      const roundTrip = JSON.parse(localStorage.getItem(ROUND_TRIP_KEY) || 'null');
      if (roundTrip?.returnDate) {
        bookingLeg = roundTrip.stage === 'return' ? 'return' : 'outbound';
      }
    } catch {
      bookingLeg = 'single';
    }

    localStorage.setItem('pendingBooking', JSON.stringify({
      tripId,
      sessionId,
      seatLabels: selectedSeats,
      holdExpiresAt,
      trip,
      pricePerSeat: trip?.price || 0,
      totalPrice: total,
      bookingLeg,
    }));

    navigate('/booking/pickup-dropoff');
  };

  // Tự xóa cooldown khi hết hạn
  useEffect(() => {
    if (!cooldownUntil) return;
    const ms = new Date(cooldownUntil).getTime() - Date.now();
    if (ms <= 0) { setCooldownUntil(null); localStorage.removeItem(COOLDOWN_STORAGE_KEY); return; }
    const t = setTimeout(() => { setCooldownUntil(null); localStorage.removeItem(COOLDOWN_STORAGE_KEY); }, ms);
    return () => clearTimeout(t);
  }, [cooldownUntil]);

  if (loading) {
    return (
      <UserLayout>
        <div className="loading">Đang tải sơ đồ ghế...</div>
      </UserLayout>
    );
  }

  if (error || !trip) {
    return (
      <UserLayout>
        <div className="container seat-page-error">
          <h1>Không thể mở trang chọn ghế</h1>
          <p>{error || 'Không tìm thấy chuyến xe.'}</p>
        </div>
      </UserLayout>
    );
  }

  if (cooldownUntil && new Date(cooldownUntil).getTime() > Date.now()) {
    const remainSec = Math.max(0, Math.ceil((new Date(cooldownUntil).getTime() - now) / 1000));
    const mm = String(Math.floor(remainSec / 60)).padStart(2, '0');
    const ss = String(remainSec % 60).padStart(2, '0');
    return (
      <UserLayout>
        <section className="seat-page-hero">
          <div className="container">
            <span>Chọn ghế</span>
            <h1>{trip.departureLocation} → {trip.arrivalLocation}</h1>
            <BookingSteps step={1} />
          </div>
        </section>
        <div className="container" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <h2 style={{ marginBottom: 8 }}>Tạm thời không thể chọn ghế</h2>
          <p style={{ color: '#64748b', marginBottom: 24 }}>
            Bạn đã để hết thời gian giữ ghế mà không hoàn tất đặt vé.<br />
            Vui lòng đợi trước khi thử lại.
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: '#fef2f2', border: '1.5px solid #fecaca',
            borderRadius: 12, padding: '16px 32px',
          }}>
            <i className="fa-solid fa-clock" style={{ color: '#ef4444', fontSize: 20 }} />
            <span style={{ fontSize: 28, fontWeight: 700, color: '#ef4444', letterSpacing: 2 }}>
              {mm}:{ss}
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>
            Chức năng sẽ tự động mở lại sau {mm}:{ss}
          </p>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <section className="seat-page-hero">
        <div className="container">
          <button type="button" className="booking-back-btn" onClick={() => {
            if (selectedSeats.length > 0) {
              pendingNavRef.current = () => navigate(-1);
              setShowExitModal(true);
            } else {
              navigate(-1);
            }
          }}>
            <i className="fa-solid fa-arrow-left" /> Quay lại
          </button>
          <span>Chọn ghế</span>
          <h1>{trip.departureLocation} → {trip.arrivalLocation}</h1>
          <p>{trip.operatorName} · {trip.busType} · {formatDateTime(trip.departureTime)}</p>
          <BookingSteps step={1} />
        </div>
      </section>

      <section className="container seat-selection-layout">
        <div className="seat-selection-main">
          <div className="seat-toolbar">
            <div>
              <h2>Sơ đồ ghế</h2>
              <p>Chọn ghế còn trống để giữ chỗ trong 10 phút.</p>
            </div>
            {holdExpiresAt && remainingMs > 0 && (
              <div className="hold-countdown-box">
                <span>Thời gian giữ ghế</span>
                <strong>{formatCountdown(remainingMs)}</strong>
              </div>
            )}
          </div>

          <div className="seat-status-legend">
            <span><b className="legend-available" /> Còn trống</span>
            <span><b className="legend-selected" /> Đang chọn/Bạn đang giữ</span>
            <span><b className="legend-booked" /> Đã đặt</span>
            <span><b className="legend-other" /> Người khác đang giữ</span>
          </div>

          <div className={`bus-floor-wrapper ${floors.length > 1 ? 'two-floor' : ''}`}>
            {floors.map((floor) => {
              const seatCount = floor.grid
                ? floor.grid.flat().filter(c => c.type === 'seat').length
                : floor.seats?.length ?? 0;
              return (
                <div className="bus-floor" key={floor.name}>
                  <div className="bus-floor-head">
                    <strong>{floor.name}</strong>
                    <span>{seatCount} ghế</span>
                  </div>
                  <div className="driver-row">
                    <i className="fa-solid fa-steering-wheel" />
                    <span>Tài xế</span>
                  </div>
                  {floor.grid ? (
                    // Custom layout — render theo grid từ nhà xe
                    <div style={{
                      display: 'inline-grid',
                      gridTemplateColumns: `repeat(${floor.cols}, 44px)`,
                      gap: 8,
                    }}>
                      {floor.grid.flat().map((cell, idx) => {
                        if (cell.type === 'aisle') return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '1.1rem' }}>↕</div>
                        );
                        if (cell.type === 'empty' || !cell.label) return <div key={idx} />;
                        const isSelected = selectedSeats.includes(cell.label) || cell.status === 'HoldingByMe';
                        const disabled = cell.status === 'Booked' || cell.status === 'HoldingByOther' || busySeat === cell.label;
                        return (
                          <button
                            type="button"
                            key={idx}
                            disabled={disabled}
                            onClick={() => toggleSeat(cell.label)}
                            className={`seat-v2 status-${(cell.status || 'available').toLowerCase()} ${isSelected ? 'selected' : ''}`}
                            title={`${cell.label} - ${labelSeatStatus(cell.status || 'Available')}`}
                          >
                            {busySeat === cell.label ? <i className="fa-solid fa-spinner fa-spin" /> : cell.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    // Lưới mặc định
                    <div className="seat-grid-v2">
                      {floor.seats.map((seat) => {
                        const isSelected = selectedSeats.includes(seat.label) || seat.status === 'HoldingByMe';
                        const disabled = seat.status === 'Booked' || seat.status === 'HoldingByOther' || busySeat === seat.label;
                        return (
                          <button
                            type="button"
                            key={seat.label}
                            disabled={disabled}
                            onClick={() => toggleSeat(seat.label)}
                            className={`seat-v2 status-${seat.status.toLowerCase()} ${isSelected ? 'selected' : ''}`}
                            title={`${seat.label} - ${labelSeatStatus(seat.status)}`}
                          >
                            {busySeat === seat.label ? <i className="fa-solid fa-spinner fa-spin" /> : seat.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="seat-summary-panel">
          <h2>Thông tin giữ ghế</h2>
          <div className="seat-summary-trip">
            <strong>{trip.operatorName}</strong>
            <span>{trip.busType}</span>
            <p>{trip.departureLocation} → {trip.arrivalLocation}</p>
          </div>

          <div className="seat-summary-line">
            <span>Ghế đã chọn</span>
            <strong>{selectedSeats.length ? selectedSeats.join(', ') : 'Chưa chọn'}</strong>
          </div>
          <div className="seat-summary-line">
            <span>Số lượng ghế</span>
            <strong>{selectedSeats.length}</strong>
          </div>
          <div className="seat-summary-line">
            <span>Giá mỗi ghế</span>
            <strong>{formatVND(trip.price)}</strong>
          </div>
          <div className="seat-summary-total">
            <span>Tổng tiền</span>
            <strong>{formatVND(total)}</strong>
          </div>

          <button type="button" className="btn btn-primary seat-continue-btn" onClick={continueBooking} disabled={!canContinue}>
            Tiếp tục
            <i className="fa-solid fa-chevron-right" />
          </button>
        </aside>
      </section>

      {showExitModal && (
        <div className="modal-overlay" onClick={handleCancelExit}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 8 }}>⚠️</div>
            <h3 style={{ textAlign: 'center', marginBottom: 8 }}>Bạn muốn thoát?</h3>
            <p style={{ textAlign: 'center', color: '#64748b', marginBottom: 20 }}>
              Nếu thoát, các ghế bạn đang giữ ({selectedSeats.join(', ')}) sẽ được giải phóng cho người khác.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={handleCancelExit}
                disabled={releasing}
              >
                Ở lại
              </button>
              <button
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={handleConfirmExit}
                disabled={releasing}
              >
                {releasing
                  ? <><i className="fa-solid fa-spinner fa-spin" /> Đang giải phóng...</>
                  : 'Thoát & giải phóng ghế'}
              </button>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}
