import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from './Navbar';
import { useAuth } from '../contexts/AuthContext';
import { isAdminRole } from '../api';

export default function Header({ simple = false }) {
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const closeMenus = () => {
    setMenuOpen(false);
    setAccountOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMenus();
    navigate('/');
  };

  useEffect(() => {
    const handleClick = (event) => {
      if (!event.target.closest('.user-header')) {
        closeMenus();
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

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
            <div className="account-menu">
              <button
                className="account-trigger"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setAccountOpen((value) => !value);
                }}
              >
                <i className="fa-solid fa-user" />
                <span>{user.fullName || user.email}</span>
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
