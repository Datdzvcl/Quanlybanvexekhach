import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ADMIN_MENU = [
  { id: 'dashboard', label: 'Thống kê', icon: 'fa-chart-line' },
  { id: 'buses', label: 'Quản lý xe', icon: 'fa-bus' },
  { id: 'trips', label: 'Quản lý chuyến xe', icon: 'fa-route' },
  { id: 'operators', label: 'Quản lý nhà xe', icon: 'fa-building' },
  { id: 'users', label: 'Quản lý người dùng', icon: 'fa-users' },
  { id: 'orders', label: 'Quản lý đơn đặt vé', icon: 'fa-ticket' },
  { id: 'settings', label: 'Cài đặt', icon: 'fa-gear' },
];

export default function AdminLayout({ active, onActiveChange, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const title = ADMIN_MENU.find((item) => item.id === active)?.label || 'Quản trị';
  const displayName = user?.fullName || user?.email || 'Admin';

  useEffect(() => {
    const close = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="admin-layout">
      <aside className="admin-layout-sidebar">
        <Link className="admin-layout-brand" to="/admin/dashboard" onClick={() => onActiveChange('dashboard')}>
          <span><i className="fa-solid fa-bus" /></span>
          <strong>VéXeAZ</strong>
        </Link>

        <nav className="admin-layout-nav">
          {ADMIN_MENU.map((item) => (
            <button
              key={item.id}
              type="button"
              className={active === item.id ? 'active' : ''}
              onClick={() => onActiveChange(item.id)}
            >
              <i className={`fa-solid ${item.icon}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-layout-sidebar-actions">
          <Link to="/" className="admin-layout-link">
            <i className="fa-solid fa-house" />
            <span>Xem trang chủ</span>
          </Link>
          <button type="button" className="admin-layout-link danger" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="admin-layout-main">
        <header className="admin-layout-header">
          <div>
            <h1>{title}</h1>
            <p>Quản trị hệ thống đặt vé xe khách</p>
          </div>

          <div className="admin-layout-user" ref={dropdownRef}>
            <button type="button" className="admin-layout-user-button" onClick={() => setOpen((value) => !value)}>
              <span className="admin-layout-avatar">{displayName.slice(0, 1).toUpperCase()}</span>
              <span>{displayName}</span>
              <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} />
            </button>

            {open && (
              <div className="admin-layout-dropdown">
                <Link to="/profile" onClick={() => setOpen(false)}>
                  <i className="fa-regular fa-user" />
                  <span>Thông tin cá nhân</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    onActiveChange('settings');
                    setOpen(false);
                  }}
                >
                  <i className="fa-solid fa-gear" />
                  <span>Cài đặt</span>
                </button>
                <button type="button" className="danger" onClick={handleLogout}>
                  <i className="fa-solid fa-right-from-bracket" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="admin-layout-content">{children}</main>
      </div>
    </div>
  );
}
