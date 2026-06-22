import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import './App.css';
import Home from './pages/Home';
import Search from './pages/Search';
import SearchResults from './pages/SearchResults';
import Booking from './pages/Booking';
import SeatSelection from './pages/SeatSelection';
import PickupDropoff from './pages/PickupDropoff';
import BookingContact from './pages/BookingContact';
import BookingPayment from './pages/BookingPayment';
import BookingSuccess from './pages/BookingSuccess';
import Login from './pages/Login';
import Register from './pages/Register';
import Payment from './pages/Payment';
import AdminPage from './pages/AdminPage';
import OperatorPage from './pages/OperatorPage';
import Profile from './pages/Profile';
import MyTickets from './pages/MyTickets';
import MyTicketDetail from './pages/MyTicketDetail';
import ChangePassword from './pages/ChangePassword';
import ReviewPage from './pages/ReviewPage';
import { formatVND } from './api';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';
import OperatorRoute from './routes/OperatorRoute';
import OrderHistory from './pages/OrderHistory';
import { seatApi } from './services/seatApi';

const HOLD_STORAGE_KEY = 'currentSeatHold';

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function HoldSeatNotificationInner() {
  const navigate = useNavigate();
  const [holdInfo, setHoldInfo] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const loadHold = useCallback(() => {
    try {
      const raw = localStorage.getItem(HOLD_STORAGE_KEY);
      if (!raw) { setHoldInfo(null); return; }
      const data = JSON.parse(raw);
      const expiresMs = new Date(data.holdExpiresAt).getTime();
      if (expiresMs <= Date.now()) {
        localStorage.removeItem(HOLD_STORAGE_KEY);
        setHoldInfo(null);
        return;
      }
      setHoldInfo(data);
    } catch {
      setHoldInfo(null);
    }
  }, []);

  useEffect(() => {
    loadHold();
    const onUpdate = () => loadHold();
    window.addEventListener('holdSeatUpdated', onUpdate);
    return () => window.removeEventListener('holdSeatUpdated', onUpdate);
  }, [loadHold]);

  useEffect(() => {
    if (!holdInfo) return;
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const expiresMs = new Date(holdInfo.holdExpiresAt).getTime();
      if (expiresMs <= t) {
        localStorage.removeItem(HOLD_STORAGE_KEY);
        setHoldInfo(null);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [holdInfo]);

  const handleCancelRequest = (e) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleConfirmCancel = async () => {
    if (!holdInfo) return;
    setCancelling(true);
    try {
      await seatApi.release({
        tripId: holdInfo.tripId,
        seatLabels: holdInfo.seatLabels || [],
        sessionId: holdInfo.sessionId,
      });
    } catch { }
    localStorage.removeItem(HOLD_STORAGE_KEY);
    setHoldInfo(null);
    setShowConfirm(false);
    window.dispatchEvent(new Event('holdSeatUpdated'));
    navigate('/');
    setCancelling(false);
  };

  const handleDismissConfirm = () => setShowConfirm(false);

  if (!holdInfo) return null;

  const expiresMs = new Date(holdInfo.holdExpiresAt).getTime();
  const remainingMs = Math.max(0, expiresMs - now);
  const seatCount = (holdInfo.seatLabels || []).length;
  const urgency = remainingMs <= 60000 ? 'urgent' : remainingMs <= 180000 ? 'warning' : '';

  return (
    <>
      <div className={`hold-seat-notification ${urgency}`}>
        <div className="hold-notif-icon">
          <i className="fa-solid fa-clock" />
        </div>
        <div className="hold-notif-body">
          <div className="hold-notif-title">
            <i className="fa-solid fa-couch" />
            {seatCount > 0
              ? `Đang giữ ${seatCount} ghế: ${holdInfo.seatLabels.join(', ')}`
              : 'Đang giữ ghế'}
          </div>
          <div className={`hold-notif-countdown ${urgency}`}>
            Hết hạn sau <span className="hold-countdown-time">{formatCountdown(remainingMs)}</span>
          </div>
        </div>
        <button
          className="hold-notif-cancel"
          type="button"
          onClick={handleCancelRequest}
          title="Hủy giữ ghế"
        >
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      {showConfirm && (
        <div className="hold-cancel-overlay">
          <div className="hold-cancel-dialog">
            <div className="hold-cancel-icon">
              <i className="fa-solid fa-triangle-exclamation" />
            </div>
            <h3>Hủy giữ ghế?</h3>
            <p>
              Bạn có chắc chắn muốn hủy giữ {seatCount} ghế không?
              Các ghế sẽ trở về trạng thái trống.
            </p>
            <div className="hold-cancel-actions">
              <button type="button" className="btn btn-outline" onClick={handleDismissConfirm} disabled={cancelling}>
                Không, giữ lại
              </button>
              <button type="button" className="btn btn-danger" onClick={handleConfirmCancel} disabled={cancelling}>
                {cancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', localStorage.getItem('adminDarkMode') === 'true');
  }, []);

  return (
    <BrowserRouter>
      <HoldSeatNotificationInner />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/search-results" element={<SearchResults />} />
        <Route path="/trips/:id/seats" element={<SeatSelection />} />
        <Route path="/booking/pickup-dropoff" element={<PickupDropoff />} />
        <Route path="/booking/contact" element={<BookingContact />} />
        <Route path="/booking/payment" element={<BookingPayment />} />
        <Route path="/booking/success/:id" element={<BookingSuccess />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/my-tickets" element={<ProtectedRoute><MyTickets /></ProtectedRoute>} />
        <Route path="/my-tickets/:id" element={<ProtectedRoute><MyTicketDetail /></ProtectedRoute>} />
        <Route path="/order-history" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
        <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
        <Route path="/review/:bookingId" element={<ProtectedRoute><ReviewPage /></ProtectedRoute>} />
        <Route path="/admin/*" element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="/operator/*" element={<OperatorRoute><OperatorPage /></OperatorRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
