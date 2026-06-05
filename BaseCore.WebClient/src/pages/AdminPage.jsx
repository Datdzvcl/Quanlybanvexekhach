import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import Admin, { AdminBookingDetail, AdminTripDetail } from './Admin';

const adminPaths = {
  dashboard: '/admin/dashboard',
  buses: '/admin/buses',
  trips: '/admin/trips',
  operators: '/admin/operators',
  users: '/admin/users',
  orders: '/admin/bookings',
  settings: '/admin/settings',
};

const pathToTab = Object.entries(adminPaths).reduce((result, [tab, path]) => {
  result[path] = tab;
  return result;
}, {});

export default function AdminPage() {
  const [active, setActive] = useState('dashboard');
  const location = useLocation();
  const navigate = useNavigate();
  const tripDetailMatch = location.pathname.match(/^\/admin\/trips\/(\d+)$/);
  const tripDetailId = tripDetailMatch?.[1] || null;
  const bookingDetailMatch = location.pathname.match(/^\/admin\/bookings\/(\d+)$/);
  const bookingDetailId = bookingDetailMatch?.[1] || null;

  useEffect(() => {
    if (location.pathname === '/admin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }

    if (location.pathname.startsWith('/admin/trips/')) {
      setActive('trips');
      return;
    }

    if (location.pathname.startsWith('/admin/bookings/')) {
      setActive('orders');
      return;
    }

    setActive(pathToTab[location.pathname] || 'dashboard');
  }, [location.pathname, navigate]);

  const handleActiveChange = (tab) => {
    setActive(tab);
    navigate(adminPaths[tab] || '/admin/dashboard');
  };

  return (
    <AdminLayout active={active} onActiveChange={handleActiveChange}>
      {tripDetailId ? (
        <AdminTripDetail tripId={tripDetailId} />
      ) : bookingDetailId ? (
        <AdminBookingDetail bookingId={bookingDetailId} />
      ) : (
        <Admin active={active} />
      )}
    </AdminLayout>
  );
}
