import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import './App.css';
import Home from './pages/Home';
import Search from './pages/Search';
import SearchResults from './pages/SearchResults';
import Booking from './pages/Booking';
import SeatSelection from './pages/SeatSelection';
import PickupDropoffPlaceholder from './pages/PickupDropoffPlaceholder';
import Login from './pages/Login';
import Register from './pages/Register';
import Payment from './pages/Payment';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import MyTickets from './pages/MyTickets';
import ChangePassword from './pages/ChangePassword';
import { formatVND } from './api';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';

// Component hiển thị thông báo giữ chỗ toàn cục
function HoldSeatNotification() {
  const [holdInfo, setHoldInfo] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [visible, setVisible] = useState(false);

  const loadHold = useCallback(() => {
    try {
      const raw = localStorage.getItem('holdSeat');
      if (!raw) { setHoldInfo(null); setVisible(false); return; }
      const data = JSON.parse(raw);
      const remaining = Math.ceil((data.expireAt - Date.now()) / 1000);
      if (remaining <= 0) {
        localStorage.removeItem('holdSeat');
        setHoldInfo(null);
        setVisible(false);
        return;
      }
      setHoldInfo(data);
      setSecondsLeft(remaining);
      setVisible(true);
    } catch {
      setHoldInfo(null);
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    loadHold();
    const onUpdate = () => loadHold();
    window.addEventListener('holdSeatUpdated', onUpdate);
    return () => window.removeEventListener('holdSeatUpdated', onUpdate);
  }, [loadHold]);

  // Đếm ngược
  useEffect(() => {
    if (!holdInfo) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((holdInfo.expireAt - Date.now()) / 1000);
      if (remaining <= 0) {
        localStorage.removeItem('holdSeat');
        setHoldInfo(null);
        setVisible(false);
        clearInterval(interval);
        return;
      }
      setSecondsLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [holdInfo]);

  const handleCancel = (e) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc muốn hủy giữ chỗ này không?')) {
      localStorage.removeItem('holdSeat');
      setHoldInfo(null);
      setVisible(false);
      window.dispatchEvent(new Event('holdSeatUpdated'));
    }
  };

  const handleClick = () => {
    if (holdInfo) {
      window.location.href = `/payment?bookingId=${holdInfo.bookingId}`;
    }
  };

  if (!visible || !holdInfo) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const urgency = secondsLeft <= 60 ? 'urgent' : secondsLeft <= 180 ? 'warning' : '';

  return (
    <div className={`hold-seat-notification ${urgency}`} onClick={handleClick} title="Bấm để thanh toán">
      <div className="hold-notif-icon">
        <i className="fa-solid fa-clock" />
      </div>
      <div className="hold-notif-body">
        <div className="hold-notif-title">
          <i className="fa-solid fa-couch" /> Đang giữ chỗ #{holdInfo.bookingId}
        </div>
        <div className="hold-notif-meta">
          {holdInfo.seatCount} ghế · {holdInfo.amount ? formatVND(holdInfo.amount) : ''}
        </div>
        <div className={`hold-notif-countdown ${urgency}`}>
          Hết hạn sau <span className="hold-countdown-time">{timeStr}</span>
        </div>
      </div>
      <button
        className="hold-notif-cancel"
        onClick={handleCancel}
        title="Hủy giữ chỗ"
      >
        <i className="fa-solid fa-xmark" />
      </button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <HoldSeatNotification />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/search-results" element={<SearchResults />} />
        <Route path="/trips/:id/seats" element={<SeatSelection />} />
        <Route path="/booking/pickup-dropoff" element={<PickupDropoffPlaceholder />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/my-tickets" element={<ProtectedRoute><MyTickets /></ProtectedRoute>} />
        <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
