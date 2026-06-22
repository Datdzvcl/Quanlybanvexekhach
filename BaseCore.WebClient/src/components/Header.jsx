import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import Navbar from './Navbar';
import { useAuth } from '../contexts/AuthContext';
import { isAdminRole } from '../api';
import { notificationApi } from '../services/notificationApi';

const AVATAR_COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#9333ea', '#dc2626',
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatNotifTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return date.toLocaleDateString('vi-VN');
}

function notifLink(notif) {
  if (notif.type === 4 && notif.bookingID) return `/review/${notif.bookingID}`;
  if (notif.bookingID) return `/my-tickets/${notif.bookingID}`;
  return '/my-tickets';
}

export default function Header({ simple = false }) {
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  const closeMenus = () => {
    setMenuOpen(false);
    setAccountOpen(false);
    setNotifOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMenus();
    navigate('/');
  };

  const loadNotifications = async () => {
    if (!token) return;
    try {
      const result = await notificationApi.getMyNotifications(1, 10);
      setNotifications(result.items || []);
      setUnreadCount(result.unreadCount || 0);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!event.target.closest('.user-header')) closeMenus();
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleNotifClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await notificationApi.markRead(notif.notificationID);
        setNotifications((prev) =>
          prev.map((n) => n.notificationID === notif.notificationID ? { ...n, isRead: true } : n)
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch { }
    }
    setNotifOpen(false);
    navigate(notifLink(notif));
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { }
  };

  const displayName = user?.fullName || user?.email || '';
  const initials = getInitials(displayName);
  const avatarColor = getAvatarColor(displayName);

  return (
    <header className="user-header">
      <div className="container user-header-inner">
        <Link to="/" className="site-logo" onClick={closeMenus}>
          <span className="site-logo-mark">
            <i className="fa-solid fa-bus" />
          </span>
          <span>VéXeAZ</span>
        </Link>

        {!simple && (
          <>
            <button
              className="mobile-nav-toggle"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((value) => !value);
              }}
              aria-label="Mở menu"
            >
              <i className={`fa-solid ${menuOpen ? 'fa-xmark' : 'fa-bars'}`} />
            </button>

            <div className={`user-header-center ${menuOpen ? 'open' : ''}`}>
              <Navbar onNavigate={closeMenus} />
            </div>
          </>
        )}

        <div className="user-header-actions">
          {token && user ? (
            <div className="header-user-group">
              {/* Notification bell */}
              <div className="notif-bell-wrap" ref={notifRef}>
                <button
                  className="notif-bell-btn"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotifOpen((v) => !v);
                    setAccountOpen(false);
                    if (!notifOpen) loadNotifications();
                  }}
                  aria-label="Thông báo"
                >
                  <i className="fa-solid fa-bell" />
                  {unreadCount > 0 && (
                    <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </button>

                {notifOpen && (
                  <div className="notif-dropdown">
                    <div className="notif-dropdown-head">
                      <span className="notif-dropdown-title">Thông báo</span>
                      <button type="button" className="notif-mark-all-btn" onClick={handleMarkAllRead}>
                        Đã đọc tất cả
                      </button>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="notif-empty">
                        <p>Chưa có thông báo.</p>
                      </div>
                    ) : (
                      <div className="notif-list">
                        {notifications.map((notif) => (
                          <button
                            key={notif.notificationID}
                            type="button"
                            className={`notif-item${notif.isRead ? '' : ' unread'}`}
                            onClick={() => handleNotifClick(notif)}
                          >
                            <div className="notif-item-body">
                              <span className="notif-item-title">{notif.title}</span>
                              <span className="notif-item-msg">{notif.message}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Account menu */}
              <div className="account-menu">
                <button
                  className="account-trigger"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setAccountOpen((value) => !value);
                    setNotifOpen(false);
                  }}
                >
                  <div
                    className="user-avatar-circle"
                    style={{ background: avatarColor }}
                    aria-hidden="true"
                  >
                    {initials}
                  </div>
                  <span>{displayName}</span>
                  <i className={`fa-solid fa-chevron-${accountOpen ? 'up' : 'down'}`} />
                </button>

                {accountOpen && (
                  <div className="account-dropdown">
                    <Link to="/profile" onClick={closeMenus}>
                      <i className="fa-solid fa-user-pen" />
                      Thông tin cá nhân
                    </Link>
                    <Link to="/my-tickets" onClick={closeMenus}>
                      <i className="fa-solid fa-ticket" />
                      Vé của tôi
                    </Link>
                    <Link to="/order-history" onClick={closeMenus}>
                      <i className="fa-solid fa-clock-rotate-left" />
                      Lịch sử đơn hàng
                    </Link>
                    {isAdminRole(user.role) && (
                      <Link to="/admin" onClick={closeMenus}>
                        <i className="fa-solid fa-gauge-high" />
                        Xem trang quản trị
                      </Link>
                    )}
                    <button type="button" onClick={handleLogout}>
                      <i className="fa-solid fa-right-from-bracket" />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="guest-actions">
              <Link to="/login" className="btn btn-outline">Đăng nhập</Link>
              <Link to="/register" className="btn btn-primary">Đăng ký</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
