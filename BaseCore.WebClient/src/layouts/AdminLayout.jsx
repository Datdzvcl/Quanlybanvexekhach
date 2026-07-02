// import { useEffect, useRef, useState } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext';

// export const ADMIN_MENU = [
//   { id: 'dashboard', label: 'Thống kê', icon: 'fa-chart-line' },
//   { id: 'promotions', label: 'Quản lý mã giảm giá', icon: 'fa-tags' },
//   { id: 'payments', label: 'Lịch sử thanh toán', icon: 'fa-credit-card' },
//   { id: 'reviews', label: 'Quản lý đánh giá', icon: 'fa-star' },
//   { id: 'buses', label: 'Quản lý xe', icon: 'fa-bus' },
//   { id: 'trips', label: 'Quản lý chuyến xe', icon: 'fa-route' },
//   { id: 'operators', label: 'Quản lý nhà xe', icon: 'fa-building' },
//   { id: 'users', label: 'Quản lý người dùng', icon: 'fa-users' },
//   { id: 'orders', label: 'Quản lý đơn đặt vé', icon: 'fa-ticket' },
//   { id: 'settings', label: 'Cài đặt', icon: 'fa-gear' },
// ];

// export default function AdminLayout({ active, onActiveChange, children }) {
//   const { user, logout } = useAuth();
//   const navigate = useNavigate();
//   const [open, setOpen] = useState(false);
//   const dropdownRef = useRef(null);
//   const title = ADMIN_MENU.find((item) => item.id === active)?.label || 'Quản trị';
//   const displayName = user?.fullName || user?.email || 'Admin';

//   useEffect(() => {
//     const close = (event) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//         setOpen(false);
//       }
//     };
//     document.addEventListener('mousedown', close);
//     return () => document.removeEventListener('mousedown', close);
//   }, []);

//   const handleLogout = () => {
//     logout();
//     navigate('/login', { replace: true });
//   };

//   return (
//     <div className="admin-layout">
//       <aside className="admin-layout-sidebar">
//         <Link className="admin-layout-brand" to="/admin/dashboard" onClick={() => onActiveChange('dashboard')}>
//           <span><i className="fa-solid fa-bus" /></span>
//           <strong>VéXeAZ</strong>
//         </Link>

//         <nav className="admin-layout-nav">
//           {ADMIN_MENU.map((item) => (
//             <button
//               key={item.id}
//               type="button"
//               className={active === item.id ? 'active' : ''}
//               onClick={() => onActiveChange(item.id)}
//             >
//               <i className={`fa-solid ${item.icon}`} />
//               <span>{item.label}</span>
//             </button>
//           ))}
//         </nav>

//         <div className="admin-layout-sidebar-actions">
//           <Link to="/" className="admin-layout-link">
//             <i className="fa-solid fa-house" />
//             <span>Xem trang chủ</span>
//           </Link>
//           <button type="button" className="admin-layout-link danger" onClick={handleLogout}>
//             <i className="fa-solid fa-right-from-bracket" />
//             <span>Đăng xuất</span>
//           </button>
//         </div>
//       </aside>

//       <div className="admin-layout-main">
//         <header className="admin-layout-header">
//           <div>
//             <h1>{title}</h1>
//             <p>Quản trị hệ thống đặt vé xe khách</p>
//           </div>

//           <div className="admin-layout-user" ref={dropdownRef}>
//             <button type="button" className="admin-layout-user-button" onClick={() => setOpen((value) => !value)}>
//               <span className="admin-layout-avatar">{displayName.slice(0, 1).toUpperCase()}</span>
//               <span>{displayName}</span>
//               <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} />
//             </button>

//             {open && (
//               <div className="admin-layout-dropdown">
//                 <Link to="/profile" onClick={() => setOpen(false)}>
//                   <i className="fa-regular fa-user" />
//                   <span>Thông tin cá nhân</span>
//                 </Link>
//                 <button
//                   type="button"
//                   onClick={() => {
//                     onActiveChange('settings');
//                     setOpen(false);
//                   }}
//                 >
//                   <i className="fa-solid fa-gear" />
//                   <span>Cài đặt</span>
//                 </button>
//                 <button type="button" className="danger" onClick={handleLogout}>
//                   <i className="fa-solid fa-right-from-bracket" />
//                   <span>Đăng xuất</span>
//                 </button>
//               </div>
//             )}
//           </div>
//         </header>

//         <main className="admin-layout-content">{children}</main>
//       </div>
//     </div>
//   );
// }
import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/httpClient';

const ALL_MENU = [
  { id: 'dashboard',  label: 'Thống kê',            icon: 'fa-chart-line',           roles: [1, 2] },
  { id: 'promotions', label: 'Quản lý mã giảm giá', icon: 'fa-tags',                 roles: [1] },
  { id: 'payments',   label: 'Lịch sử thanh toán',  icon: 'fa-credit-card',          roles: [1] },
  { id: 'reviews',    label: 'Quản lý đánh giá',    icon: 'fa-star',                 roles: [1] },
  { id: 'buses',      label: 'Quản lý xe',           icon: 'fa-bus',                  roles: [1] },
  { id: 'trips',      label: 'Quản lý chuyến xe',   icon: 'fa-route',                roles: [1] },
  { id: 'operators',  label: 'Quản lý nhà xe',       icon: 'fa-building',             roles: [2] },
  { id: 'users',      label: 'Quản lý người dùng',  icon: 'fa-users',                roles: [2] },
  { id: 'orders',     label: 'Quản lý đơn đặt vé',  icon: 'fa-ticket',               roles: [1, 2] },
  { id: 'incidents',  label: 'Sự cố',                icon: 'fa-triangle-exclamation', roles: [1] },
  // { id: 'stations',   label: 'Danh mục bến xe',      icon: 'fa-map-location-dot',     roles: [2] },
  { id: 'settings',   label: 'Cài đặt',              icon: 'fa-gear',                 roles: [1, 2] },
  // Driver
  { id: 'my-trips',   label: 'Lịch chạy của tôi',   icon: 'fa-route',                roles: [3] },
  { id: 'profile',    label: 'Thông tin cá nhân',    icon: 'fa-user',                 roles: [3] },
];

export default function AdminLayout({ active, onActiveChange, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notiOpen, setNotiOpen]   = useState(false);
  const [notifs, setNotifs]       = useState([]);
  const [unread, setUnread]       = useState(0);
  const dropdownRef = useRef(null);
  const notiRef     = useRef(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/api/notifications/my?pageSize=20');
      const items = data.items ?? data ?? [];
      setNotifs(items);
      setUnread(items.filter(n => !n.isRead).length);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchNotifs();
    const t = setInterval(fetchNotifs, 30_000);
    return () => clearInterval(t);
  }, [fetchNotifs]);

  const markAllRead = async () => {
    try {
      await apiClient.put('/api/notifications/read-all');
      setNotifs(p => p.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch { /* silent */ }
  };

  // đóng dropdown khi click ngoài
  useEffect(() => {
    const close = (e) => {
      if (notiRef.current && !notiRef.current.contains(e.target)) setNotiOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // Lọc menu theo role
  const role = user?.role ?? 0;
  const ADMIN_MENU = ALL_MENU.filter(item => item.roles.includes(Number(role)));

  const title = ADMIN_MENU.find((item) => item.id === active)?.label || 'Quản trị';
  const displayName = user?.fullName || user?.email || 'Admin';
  const isOperator = Number(role) === 1;
  const isDriver   = Number(role) === 3;
  const basePath   = isDriver ? '/driver' : (isOperator ? '/operator' : '/admin');

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
        <Link className="admin-layout-brand" to={`${basePath}`} onClick={() => onActiveChange(isDriver ? 'my-trips' : 'dashboard')}>
          <span><i className="fa-solid fa-bus" /></span>
          <strong>VéXeAZ</strong>
        </Link>

        <div style={{ padding: '4px 16px 8px', fontSize: '11px', color: '#888' }}>
          {isDriver ? '🚗 Cổng tài xế' : isOperator ? '🚌 Cổng nhà xe' : '🛡️ Quản trị hệ thống'}
        </div>

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
            <p>{isDriver ? 'Cổng quản lý tài xế' : isOperator ? 'Cổng quản lý nhà xe' : 'Quản trị hệ thống đặt vé xe khách'}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Notification bell */}
          <div ref={notiRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => { setNotiOpen(v => !v); if (!notiOpen) fetchNotifs(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '6px 8px', borderRadius: 8, color: '#475569' }}
              title="Thông báo"
            >
              <i className="fa-solid fa-bell" style={{ fontSize: 18 }} />
              {unread > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  background: '#ef4444', color: '#fff',
                  borderRadius: '50%', fontSize: 10, fontWeight: 700,
                  width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{unread > 9 ? '9+' : unread}</span>
              )}
            </button>
            {notiOpen && (
              <div style={{
                position: 'absolute', top: '110%', right: 0, zIndex: 9999,
                width: 340, background: '#fff', borderRadius: 14,
                boxShadow: '0 8px 32px rgba(15,23,42,.18)', border: '1px solid #e8eef7',
                overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                  <strong style={{ fontSize: 14, color: '#0f172a' }}>Thông báo</strong>
                  {unread > 0 && (
                    <button onClick={markAllRead} style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Đọc tất cả
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                  {notifs.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      <i className="fa-solid fa-bell-slash" style={{ fontSize: 24, marginBottom: 8, display: 'block' }} />
                      Không có thông báo
                    </div>
                  ) : notifs.map(n => (
                    <div key={n.notificationID} style={{
                      padding: '12px 16px', borderBottom: '1px solid #f8fafc',
                      background: n.isRead ? '#fff' : '#eff6ff',
                      cursor: n.link ? 'pointer' : 'default',
                    }}
                      onClick={() => { if (n.link) { navigate(n.link); setNotiOpen(false); } }}
                    >
                      <div style={{ fontSize: 13, fontWeight: n.isRead ? 500 : 700, color: '#0f172a', marginBottom: 3 }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>{n.message}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                        {new Date(n.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="admin-layout-user" ref={dropdownRef}>
            <button type="button" className="admin-layout-user-button" onClick={() => setOpen((v) => !v)}>
              <span className="admin-layout-avatar">{displayName.slice(0, 1).toUpperCase()}</span>
              <span>{displayName}</span>
              <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} />
            </button>

            {open && (
              <div className="admin-layout-dropdown">
                {isDriver ? (
                  <button type="button" onClick={() => { onActiveChange('profile'); setOpen(false); }}>
                    <i className="fa-regular fa-user" />
                    <span>Thông tin cá nhân</span>
                  </button>
                ) : (
                  <Link to="/profile" onClick={() => setOpen(false)}>
                    <i className="fa-regular fa-user" />
                    <span>Thông tin cá nhân</span>
                  </Link>
                )}
                {!isDriver && (
                  <button type="button" onClick={() => { onActiveChange('settings'); setOpen(false); }}>
                    <i className="fa-solid fa-gear" />
                    <span>Cài đặt</span>
                  </button>
                )}
                <button type="button" className="danger" onClick={handleLogout}>
                  <i className="fa-solid fa-right-from-bracket" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
          </div>{/* end flex wrapper */}
        </header>

        <main className="admin-layout-content">{children}</main>
      </div>
    </div>
  );
}

export const ADMIN_MENU = ALL_MENU; // export để dùng ở nơi khác nếu cần