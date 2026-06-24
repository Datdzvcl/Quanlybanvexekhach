import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function DriverRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const role = Number(user?.role ?? 0);

  if (role === 3) return children || <Outlet />;
  if (role === 2) return <Navigate to="/admin/dashboard" replace />;
  if (role === 1) return <Navigate to="/operator/dashboard" replace />;
  return <Navigate to="/" replace />;
}
