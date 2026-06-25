// // import { useEffect, useState } from 'react';
// // import { useLocation, useNavigate } from 'react-router-dom';
// // import AdminLayout from '../layouts/AdminLayout';
// // import Admin, { AdminBookingDetail, AdminTripDetail } from './Admin';

// // const adminPaths = {
// //   dashboard: '/admin/dashboard',
// //   buses: '/admin/buses',
// //   trips: '/admin/trips',
// //   operators: '/admin/operators',
// //   users: '/admin/users',
// //   orders: '/admin/bookings',
// //   promotions: '/admin/promotions',
// //   payments: '/admin/payments',
// //   reviews: '/admin/reviews',
// //   settings: '/admin/settings',
// // };

// // const pathToTab = Object.entries(adminPaths).reduce((result, [tab, path]) => {
// //   result[path] = tab;
// //   return result;
// // }, {});

// // export default function AdminPage() {
// //   const [active, setActive] = useState('dashboard');
// //   const location = useLocation();
// //   const navigate = useNavigate();
// //   const tripDetailMatch = location.pathname.match(/^\/admin\/trips\/(\d+)$/);
// //   const tripDetailId = tripDetailMatch?.[1] || null;
// //   const bookingDetailMatch = location.pathname.match(/^\/admin\/bookings\/(\d+)$/);
// //   const bookingDetailId = bookingDetailMatch?.[1] || null;

// //   useEffect(() => {
// //     if (location.pathname === '/admin') {
// //       navigate('/admin/dashboard', { replace: true });
// //       return;
// //     }

// //     if (location.pathname.startsWith('/admin/trips/')) {
// //       setActive('trips');
// //       return;
// //     }

// //     if (location.pathname.startsWith('/admin/bookings/')) {
// //       setActive('orders');
// //       return;
// //     }

// //     setActive(pathToTab[location.pathname] || 'dashboard');
// //   }, [location.pathname, navigate]);

// //   const handleActiveChange = (tab) => {
// //     setActive(tab);
// //     navigate(adminPaths[tab] || '/admin/dashboard');
// //   };

// //   return (
// //     <AdminLayout active={active} onActiveChange={handleActiveChange}>
// //       {tripDetailId ? (
// //         <AdminTripDetail tripId={tripDetailId} />
// //       ) : bookingDetailId ? (
// //         <AdminBookingDetail bookingId={bookingDetailId} />
// //       ) : (
// //         <Admin active={active} />
// //       )}
// //     </AdminLayout>
// //   );
// // }
// import { useEffect, useState } from 'react';
// import { useLocation, useNavigate } from 'react-router-dom';
// import AdminLayout from '../layouts/AdminLayout';
// import Admin, { AdminBookingDetail, AdminTripDetail } from './Admin';
// import { useAuth } from '../contexts/AuthContext';  // ← thêm

// // const adminPaths = {
// //   dashboard: '/admin/dashboard',
// //   buses: '/admin/buses',
// //   trips: '/admin/trips',
// //   operators: '/admin/operators',   // chỉ admin
// //   users: '/admin/users',           // chỉ admin
// //   orders: '/admin/bookings',
// //   promotions: '/admin/promotions',
// //   payments: '/admin/payments',
// //   reviews: '/admin/reviews',
// //   settings: '/admin/settings',
// // };
// const isOperator = Number(user?.role) === 1;
// const basePath = isOperator ? '/operator' : '/admin';

// const adminPaths = {
//   dashboard:  `${basePath}/dashboard`,
//   buses:      `${basePath}/buses`,
//   trips:      `${basePath}/trips`,
//   orders:     `${basePath}/bookings`,
//   promotions: `${basePath}/promotions`,
//   payments:   `${basePath}/payments`,
//   reviews:    `${basePath}/reviews`,
//   settings:   `${basePath}/settings`,
//   // chỉ admin:
//   operators:  `/admin/operators`,
//   users:      `/admin/users`,
// };

// const pathToTab = Object.entries(adminPaths).reduce((result, [tab, path]) => {
//   result[path] = tab;
//   return result;
// }, {});
//   const tabs = isOperator ? OPERATOR_TABS : ADMIN_TABS;
// // ─── Tabs admin thấy đủ ───────────────────────────────────────────────────────
// const ADMIN_TABS = [
//   ['dashboard',   'Tổng quan',    'fa-chart-line'],
//   ['trips',       'Chuyến xe',    'fa-route'],
//   ['orders',      'Đơn hàng',     'fa-file-invoice'],
//   ['promotions',  'Khuyến mãi',   'fa-tags'],
//   ['payments',    'Thanh toán',   'fa-credit-card'],
//   ['reviews',     'Đánh giá',     'fa-star'],
//   ['buses',       'Xe',           'fa-bus'],
//   ['operators',   'Nhà xe',       'fa-building'],   // ← chỉ admin
//   ['users',       'Người dùng',   'fa-users'],      // ← chỉ admin
//   ['settings',    'Cài đặt',      'fa-gear'],
// ];

// // ─── Tabs operator thấy (bỏ operators + users) ───────────────────────────────
// const OPERATOR_TABS = ADMIN_TABS.filter(
//   ([key]) => key !== 'operators' && key !== 'users'
// );

// export default function AdminPage() {
//   const [active, setActive] = useState('dashboard');
//   const location  = useLocation();
//   const navigate  = useNavigate();
//   const { user }  = useAuth();                              // ← lấy role

//   const isOperator = Number(user?.role ?? 0) === 1;        // role 1 = Operator
//   const tabs = isOperator ? OPERATOR_TABS : ADMIN_TABS;    // ← tabs theo role

//   const tripDetailMatch   = location.pathname.match(/^\/admin\/trips\/(\d+)$/);
//   const tripDetailId      = tripDetailMatch?.[1] || null;
//   const bookingDetailMatch = location.pathname.match(/^\/admin\/bookings\/(\d+)$/);
//   const bookingDetailId   = bookingDetailMatch?.[1] || null;

//   useEffect(() => {
//     if (location.pathname === '/admin') {
//       navigate('/admin/dashboard', { replace: true });
//       return;
//     }
//     if (location.pathname.startsWith('/admin/trips/')) {
//       setActive('trips');
//       return;
//     }
//     if (location.pathname.startsWith('/admin/bookings/')) {
//       setActive('orders');
//       return;
//     }

//     const tab = pathToTab[location.pathname] || 'dashboard';

//     // Operator cố vào trang admin-only → redirect về dashboard
//     if (isOperator && (tab === 'operators' || tab === 'users')) {
//       navigate('/admin/dashboard', { replace: true });
//       return;
//     }

//     setActive(tab);
//   }, [location.pathname, navigate, isOperator]);

//   const handleActiveChange = (tab) => {
//     setActive(tab);
//     navigate(adminPaths[tab] || '/admin/dashboard');
//   };

//   return (
//     <AdminLayout
//       active={active}
//       onActiveChange={handleActiveChange}
//       tabs={tabs}          // ← truyền tabs đã lọc xuống layout
//       isOperator={isOperator}
//     >
//       {tripDetailId ? (
//         <AdminTripDetail tripId={tripDetailId} />
//       ) : bookingDetailId ? (
//         <AdminBookingDetail bookingId={bookingDetailId} />
//       ) : (
//         <Admin active={active} isOperator={isOperator} />  // ← truyền isOperator
//       )}
//     </AdminLayout>
//   );
// }
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import Admin, { AdminBookingDetail, AdminTripDetail } from './Admin';
import { useAuth } from '../contexts/AuthContext';

// ─── Tabs (đặt ngoài component vì không phụ thuộc state) ─────────────────────
const ADMIN_TABS = [
  ['dashboard',  'Tổng quan',  'fa-chart-line'],
  ['trips',      'Chuyến xe',  'fa-route'],
  ['orders',     'Đơn hàng',   'fa-file-invoice'],
  ['promotions', 'Khuyến mãi', 'fa-tags'],
  ['payments',   'Thanh toán', 'fa-credit-card'],
  ['reviews',    'Đánh giá',   'fa-star'],
  ['buses',      'Xe',         'fa-bus'],
  ['operators',  'Nhà xe',     'fa-building'],
  ['users',      'Người dùng', 'fa-users'],
  ['settings',   'Cài đặt',    'fa-gear'],
];

const OPERATOR_TABS = ADMIN_TABS.filter(
  ([key]) => key !== 'operators' && key !== 'users'
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [active, setActive] = useState('dashboard');
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isOperator = Number(user?.role ?? 0) === 1;
  const basePath   = isOperator ? '/operator' : '/admin';

  const adminPaths = {
    dashboard:  `${basePath}/dashboard`,
    buses:      `${basePath}/buses`,
    trips:      `${basePath}/trips`,
    orders:     `${basePath}/bookings`,
    promotions: `${basePath}/promotions`,
    payments:   `${basePath}/payments`,
    reviews:    `${basePath}/reviews`,
    settings:   `${basePath}/settings`,
    operators:  `/admin/operators`,
    users:      `/admin/users`,
  };

  const pathToTab = Object.entries(adminPaths).reduce((acc, [tab, path]) => {
    acc[path] = tab;
    return acc;
  }, {});

  const tabs = isOperator ? OPERATOR_TABS : ADMIN_TABS;

  const tripDetailMatch    = location.pathname.match(/^\/(admin|operator)\/trips\/(\d+)$/);
  const tripDetailId       = tripDetailMatch?.[2] || null;
  const bookingDetailMatch = location.pathname.match(/^\/(admin|operator)\/bookings\/(\d+)$/);
  const bookingDetailId    = bookingDetailMatch?.[2] || null;

  useEffect(() => {
    if (location.pathname === `/${basePath}` || location.pathname === `${basePath}`) {
      navigate(`${basePath}/dashboard`, { replace: true });
      return;
    }
    if (location.pathname.startsWith(`${basePath}/trips/`)) {
      setActive('trips');
      return;
    }
    if (location.pathname.startsWith(`${basePath}/bookings/`)) {
      setActive('orders');
      return;
    }

    const tab = pathToTab[location.pathname] || 'dashboard';

    if (isOperator && (tab === 'operators' || tab === 'users')) {
      navigate(`${basePath}/dashboard`, { replace: true });
      return;
    }

    setActive(tab);
  }, [location.pathname, navigate, isOperator, basePath]);

  const handleActiveChange = (tab) => {
    setActive(tab);
    navigate(adminPaths[tab] || `${basePath}/dashboard`);
  };

  return (
    <AdminLayout
      active={active}
      onActiveChange={handleActiveChange}
      tabs={tabs}
      isOperator={isOperator}
    >
      {tripDetailId ? (
        <AdminTripDetail tripId={tripDetailId} />
      ) : bookingDetailId ? (
        <AdminBookingDetail bookingId={bookingDetailId} />
      ) : (
        <Admin active={active} isOperator={isOperator} />
      )}
    </AdminLayout>
  );
}