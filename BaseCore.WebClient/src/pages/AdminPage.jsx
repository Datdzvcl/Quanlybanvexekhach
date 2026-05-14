import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import Admin from './Admin';

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

  useEffect(() => {
    if (location.pathname === '/admin') {
      navigate('/admin/dashboard', { replace: true });
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
      <Admin active={active} />
    </AdminLayout>
  );
}
