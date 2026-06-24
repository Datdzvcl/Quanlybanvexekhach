import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import { useAuth } from "../contexts/AuthContext";
import { isAdminRole, isOperatorRole } from "../api";
import { notificationApi } from "../services/notificationApi";

export default function Header({ simple = false }) {
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const closeMenus = () => {
    setMenuOpen(false);
    setAccountOpen(false);
    setNotificationOpen(false);
  };

  const loadNotifications = async () => {
    if (!token || !user) return;
    try {
      const data = await notificationApi.my(8);
      setNotifications(data?.items || data?.Items || []);
      setUnreadCount(Number(data?.unreadCount ?? data?.UnreadCount ?? 0));
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const handleLogout = () => {
    logout();
    closeMenus();
    navigate("/");
  };

  useEffect(() => {
    const handleClick = (event) => {
      if (!event.target.closest(".user-header")) {
        closeMenus();
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    if (!token || !user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    loadNotifications();
    const timer = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(timer);
  }, [token, user?.userId]);

  const openNotifications = async (event) => {
    event.stopPropagation();
    const nextOpen = !notificationOpen;
    setNotificationOpen(nextOpen);
    setAccountOpen(false);
    if (nextOpen) await loadNotifications();
  };

  const markNotificationRead = async (notification) => {
    const id = notification.notificationID || notification.NotificationID;
    const link = notification.link || notification.Link;
    if (!id) return;
    try {
      await notificationApi.markRead(id);
      await loadNotifications();
    } catch {
      // Keep the header usable even if notification sync fails.
    }
    setNotificationOpen(false);
    if (link) navigate(link);
  };

  const markAllNotificationsRead = async (event) => {
    event.stopPropagation();
    try {
      await notificationApi.markAllRead();
      await loadNotifications();
    } catch {
      // Keep the header usable even if notification sync fails.
    }
  };

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
              <i className={`fa-solid ${menuOpen ? "fa-xmark" : "fa-bars"}`} />
            </button>

            <div className={`user-header-center ${menuOpen ? "open" : ""}`}>
              <Navbar onNavigate={closeMenus} />
            </div>
          </>
        )}

        <div className="user-header-actions">
          {!simple && (token && user ? (
            <>
              <div className="notification-menu">
                <button
                  className="notification-trigger"
                  type="button"
                  onClick={openNotifications}
                  aria-label="Thông báo"
                >
                  <i className="fa-regular fa-bell" />
                  {unreadCount > 0 && <span>{unreadCount > 9 ? "9+" : unreadCount}</span>}
                </button>

                {notificationOpen && (
                  <div className="notification-dropdown">
                    <div className="notification-dropdown-head">
                      <strong>Thông báo</strong>
                      <button type="button" onClick={markAllNotificationsRead} disabled={unreadCount <= 0}>
                        Đã đọc tất cả
                      </button>
                    </div>
                    {notifications.length === 0 ? (
                      <p className="notification-empty">Chưa có thông báo.</p>
                    ) : (
                      <div className="notification-list">
                        {notifications.map((item) => {
                          const id = item.notificationID || item.NotificationID;
                          const isRead = Boolean(item.isRead ?? item.IsRead);
                          return (
                            <button
                              type="button"
                              className={`notification-item ${isRead ? "" : "unread"}`}
                              key={id}
                              onClick={() => markNotificationRead(item)}
                              style={{ cursor: (item.link || item.Link) ? 'pointer' : 'default' }}
                            >
                              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                                {item.title || item.Title}
                                {(item.link || item.Link) && <i className="fa-solid fa-chevron-right" style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }} />}
                              </span>
                              <small>{item.message || item.Message}</small>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="account-menu">
                <button
                  className="account-trigger"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setNotificationOpen(false);
                    setAccountOpen((value) => !value);
                  }}
                >
                  <i className="fa-solid fa-user" />
                  <span>{user.fullName || user.email}</span>
                  <i
                    className={`fa-solid fa-chevron-${accountOpen ? "up" : "down"}`}
                  />
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
                     <Link to="/order-history" onClick={closeMenus}>        {/* thêm dòng này */}
                      <i className="fa-solid fa-clock-rotate-left" />
                      Lịch sử đơn hàng
                    </Link>
                    <Link to="/change-password" onClick={closeMenus}>
                      <i className="fa-solid fa-lock" />
                      Đổi mật khẩu
                    </Link>
                    {/* {isAdminRole(user.role) && (
                      <Link to="/admin" onClick={closeMenus}>
                        <i className="fa-solid fa-gauge-high" />
                        Xem trang quản trị
                      </Link>
                    )} */}
                    {(isAdminRole(user.role) || isOperatorRole(user.role)) && (
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
            </>
          ) : (
            <div className="guest-actions">
              <Link to="/login" className="btn btn-outline">Đăng nhập</Link>
              <Link to="/register" className="btn btn-primary">Đăng ký</Link>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
