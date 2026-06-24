import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import { seatApi } from './services/seatApi';
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
import ForgotPassword from './pages/ForgotPassword';
import Payment from './pages/Payment';
import AdminPage from './pages/AdminPage';
import Profile from './pages/Profile';
import MyTickets from './pages/MyTickets';
import MyTicketDetail from './pages/MyTicketDetail';
import ChangePassword from './pages/ChangePassword';
import { formatVND } from './api';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';
import OperatorRoute from './routes/OperatorRoute';
import DriverRoute from './routes/DriverRoute';
import DriverPage from './pages/DriverPage';
import OrderHistory from './pages/OrderHistory';
import OperatorProfile from './pages/OperatorProfile';

// Component hiển thị thông báo giữ chỗ toàn cục
function HoldSeatNotification() {
  const navigate = useNavigate();
  const [holdInfo, setHoldInfo] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const loadHold = useCallback(() => {
    try {
      const raw = localStorage.getItem('currentSeatHold');
      if (!raw) { setHoldInfo(null); return; }
      const data = JSON.parse(raw);
      const expiresAt = new Date(data.holdExpiresAt).getTime();
      const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
      if (remaining <= 0) {
        localStorage.removeItem('currentSeatHold');
        setHoldInfo(null);
        return;
      }
      setHoldInfo(data);
      setSecondsLeft(remaining);
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
    const interval = setInterval(() => {
      const expiresAt = new Date(holdInfo.holdExpiresAt).getTime();
      const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
      if (remaining <= 0) {
        localStorage.removeItem('currentSeatHold');
        setHoldInfo(null);
        clearInterval(interval);
        window.dispatchEvent(new Event('holdSeatUpdated'));
        return;
      }
      setSecondsLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [holdInfo]);

  const handleCancelConfirm = async () => {
    setShowCancelConfirm(false);
    try {
      await seatApi.release({
        tripId: holdInfo.tripId,
        seatLabels: holdInfo.seatLabels,
        sessionId: holdInfo.sessionId,
      });
    } catch {}
    localStorage.removeItem('currentSeatHold');
    localStorage.removeItem('pendingBooking');
    localStorage.removeItem('roundTripBooking');
    setHoldInfo(null);
    window.dispatchEvent(new Event('holdSeatUpdated'));
    navigate('/');
  };

  if (!holdInfo) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const urgency = secondsLeft <= 60 ? 'urgent' : secondsLeft <= 180 ? 'warning' : '';
  const seatLabels = holdInfo.seatLabels || [];

  return (
    <>
      <div
        className={`hold-seat-notification ${urgency}`}
        onClick={() => navigate('/booking/payment')}
        title="Bấm để tiếp tục thanh toán"
      >
        <div className="hold-notif-icon">
          <i className="fa-solid fa-clock" />
        </div>
        <div className="hold-notif-body">
          <div className="hold-notif-title">
            <i className="fa-solid fa-couch" /> Đang giữ ghế {seatLabels.join(', ')}
          </div>
          <div className={`hold-notif-countdown ${urgency}`}>
            Hết hạn sau <span className="hold-countdown-time">{timeStr}</span>
          </div>
        </div>
        <button
          className="hold-notif-cancel"
          onClick={(e) => { e.stopPropagation(); setShowCancelConfirm(true); }}
          title="Hủy giữ chỗ"
        >
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      {showCancelConfirm && (
        <div className="modal-overlay" onClick={() => setShowCancelConfirm(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f59e0b', fontSize: '1.5rem' }} />
              <h3>Hủy giữ chỗ?</h3>
            </div>
            <p style={{ color: '#475569', lineHeight: 1.6, margin: '10px 0 18px' }}>
              Ghế <b>{seatLabels.join(', ')}</b> sẽ được trả lại và bạn sẽ được chuyển về trang chủ.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowCancelConfirm(false)}>
                Tiếp tục giữ chỗ
              </button>
              <button type="button" className="btn btn-danger" onClick={handleCancelConfirm}>
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Chặn driver truy cập các trang không phải của họ
function DriverGuard({ children }) {
  const { user } = useAuth();
  if (Number(user?.role) === 3) return <Navigate to="/driver" replace />;
  return children;
}

export default function App() {
  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', localStorage.getItem('adminDarkMode') === 'true');
  }, []);

  return (
    <BrowserRouter>
      <HoldSeatNotification />
      <Routes>
        <Route path="/" element={<DriverGuard><Home /></DriverGuard>} />
        <Route path="/search" element={<DriverGuard><Search /></DriverGuard>} />
        <Route path="/search-results" element={<DriverGuard><SearchResults /></DriverGuard>} />
        <Route path="/trips/:id/seats" element={<DriverGuard><SeatSelection /></DriverGuard>} />
        <Route path="/booking/pickup-dropoff" element={<DriverGuard><PickupDropoff /></DriverGuard>} />
        <Route path="/booking/contact" element={<DriverGuard><BookingContact /></DriverGuard>} />
        <Route path="/booking/payment" element={<DriverGuard><BookingPayment /></DriverGuard>} />
        <Route path="/booking/success/:id" element={<DriverGuard><BookingSuccess /></DriverGuard>} />
        <Route path="/booking" element={<DriverGuard><Booking /></DriverGuard>} />
        <Route path="/payment" element={<DriverGuard><Payment /></DriverGuard>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<DriverGuard><Register /></DriverGuard>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/my-tickets" element={<DriverGuard><ProtectedRoute><MyTickets /></ProtectedRoute></DriverGuard>} />
        <Route path="/my-tickets/:id" element={<DriverGuard><ProtectedRoute><MyTicketDetail /></ProtectedRoute></DriverGuard>} />
        <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
        <Route path="/order-history" element={<DriverGuard><OrderHistory /></DriverGuard>} />
        <Route path="/nha-xe/:id" element={<DriverGuard><OperatorProfile /></DriverGuard>} />
        <Route path="/admin/*" element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="/operator/*" element={<OperatorRoute><AdminPage /></OperatorRoute>} />
        <Route path="/driver" element={<DriverRoute><DriverPage /></DriverRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
