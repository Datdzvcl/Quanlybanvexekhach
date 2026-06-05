import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isAdminRole } from '../api';

export default function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isAdminRole(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children || <Outlet />;
}
