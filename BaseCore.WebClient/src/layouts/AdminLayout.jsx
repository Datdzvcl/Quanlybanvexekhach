import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ADMIN_MENU = [
  { id: 'dashboard', label: 'Thong ke', icon: 'fa-chart-line' },
  { id: 'buses', label: 'Quan ly xe', icon: 'fa-bus' },
  { id: 'trips', label: 'Quan ly chuyen xe', icon: 'fa-route' },
  { id: 'operators', label: 'Quan ly nha xe', icon: 'fa-building' },
  { id: 'users', label: 'Quan ly nguoi dung', icon: 'fa-users' },
  { id: 'orders', label: 'Quan ly don dat ve', icon: 'fa-ticket' },
  { id: 'promotions', label: 'Khuyen mai', icon: 'fa-tags' },
  { id: 'settings', label: 'Cai dat', icon: 'fa-gear' },
];

export default function AdminLayout({
  active,
  onActiveChange,
  children,
  menu = ADMIN_MENU,
  brandLabel = 'VeXeAZ',
  subtitle = 'Quan tri he thong dat ve xe khach',
  defaultTitle = 'Quan tri',
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const title = menu.find((item) => item.id === active)?.label || defaultTitle;
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
        <Link
          className="admin-layout-brand"
          to="/"
          onClick={(event) => {
            event.preventDefault();
            onActiveChange('dashboard');
          }}
        >
          <span><i className="fa-solid fa-bus" /></span>
          <strong>{brandLabel}</strong>
        </Link>

        <nav className="admin-layout-nav">
          {menu.map((item) => (
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
            <span>Xem trang chu</span>
          </Link>
          <button type="button" className="admin-layout-link danger" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket" />
            <span>Dang xuat</span>
          </button>
        </div>
      </aside>

      <div className="admin-layout-main">
        <header className="admin-layout-header">
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
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
                  <span>Thong tin ca nhan</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    onActiveChange('settings');
                    setOpen(false);
                  }}
                >
                  <i className="fa-solid fa-gear" />
                  <span>Cai dat</span>
                </button>
                <button type="button" className="danger" onClick={handleLogout}>
                  <i className="fa-solid fa-right-from-bracket" />
                  <span>Dang xuat</span>
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
