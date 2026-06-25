import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { seatApi } from '../services/seatApi';

const HOLD_KEY    = 'currentSeatHold';
const PENDING_KEY = 'pendingBooking';

function readHold() {
  try { return JSON.parse(localStorage.getItem(HOLD_KEY) || 'null'); }
  catch { return null; }
}
function readPending() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || 'null'); }
  catch { return null; }
}

function getResumeRoute(hold, pending) {
  if (!hold) return null;
  if (pending?.contact)       return '/booking/payment';
  if (pending?.pickupStopId)  return '/booking/contact';
  if (pending?.tripId)        return '/booking/pickup-dropoff';
  return `/trips/${hold.tripId}/seats`;
}

export default function SeatHoldBanner() {
  const navigate          = useNavigate();
  const { pathname }      = useLocation();
  const [hold, setHold]   = useState(readHold);
  const [secs, setSecs]   = useState(0);
  const [releasing, setReleasing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Countdown: tick every second, remove banner when expired
  useEffect(() => {
    const tick = () => {
      const h = readHold();
      if (!h) { setHold(null); return; }
      const left = Math.max(0, Math.round((new Date(h.holdExpiresAt) - Date.now()) / 1000));
      if (left === 0) {
        localStorage.removeItem(HOLD_KEY);
        localStorage.removeItem(PENDING_KEY);
        setHold(null);
      } else {
        setHold(h);
        setSecs(left);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Sync when another tab updates localStorage
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === HOLD_KEY) setHold(e.newValue ? JSON.parse(e.newValue) : null);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Ẩn banner khi đang ở trong luồng đặt vé
  const onBookingFlow =
    pathname.startsWith('/booking/') ||
    /^\/trips\/\d+\/seats/.test(pathname);

  if (!hold || secs === 0 || onBookingFlow) return null;

  const pending     = readPending();
  const resumeRoute = getResumeRoute(hold, pending);
  const isUrgent    = secs <= 120;
  const min = String(Math.floor(secs / 60)).padStart(2, '0');
  const sec = String(secs % 60).padStart(2, '0');
  const seatText = Array.isArray(hold.seatLabels)
    ? hold.seatLabels.join(', ')
    : String(hold.seatLabels || '');

  const handleResume = () => {
    if (resumeRoute) navigate(resumeRoute);
  };

  const handleCancelConfirm = async () => {
    setReleasing(true);
    try {
      await seatApi.release({
        tripId:     hold.tripId,
        seatLabels: hold.seatLabels,
        sessionId:  hold.sessionId,
      });
    } catch {
      // Bỏ qua lỗi network — vẫn xóa local
    }
    localStorage.removeItem(HOLD_KEY);
    localStorage.removeItem(PENDING_KEY);
    setHold(null);
    setShowConfirm(false);
    setReleasing(false);
    navigate('/');
  };

  return (
    <>
      {/* ── Floating banner ── */}
      <div
        className={`shb-banner${isUrgent ? ' shb-urgent' : ''}`}
        onClick={handleResume}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleResume()}
        aria-label="Tiếp tục đặt vé"
      >
        <div className="shb-icon-wrap">
          <i className="fa-solid fa-couch" />
        </div>

        <div className="shb-body">
          <strong>Đang giữ chỗ: {seatText}</strong>
          <span>
            Còn <b className={`shb-timer${isUrgent ? ' shb-timer--urgent' : ''}`}>{min}:{sec}</b>{' '}
            để hoàn tất
          </span>
        </div>

        <div className="shb-cta">
          <i className="fa-solid fa-arrow-right" /> Tiếp tục
        </div>

        <button
          type="button"
          className="shb-close-btn"
          onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
          aria-label="Hủy giữ chỗ"
        >
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      {/* ── Confirm dialog ── */}
      {showConfirm && (
        <div className="shb-overlay" onClick={() => !releasing && setShowConfirm(false)}>
          <div className="shb-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="shb-dialog-icon">
              <i className="fa-solid fa-triangle-exclamation" />
            </div>
            <h3>Hủy giữ chỗ?</h3>
            <p>
              Ghế <b>{seatText}</b> sẽ được trả lại và người khác có thể đặt.
              Bạn có chắc muốn hủy không?
            </p>
            <div className="shb-dialog-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowConfirm(false)}
                disabled={releasing}
              >
                Không, tiếp tục đặt
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleCancelConfirm}
                disabled={releasing}
              >
                {releasing
                  ? <><i className="fa-solid fa-spinner fa-spin" /> Đang hủy...</>
                  : 'Hủy giữ chỗ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
