import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isOperatorRole } from '../api';

export default function OperatorRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isOperatorRole(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children || <Outlet />;
}
