// import { Navigate, Outlet, useLocation } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext';

// export default function OperatorRoute({ children }) {
//   const { isAuthenticated, user } = useLocation();
//   const location = useLocation();

//   if (!isAuthenticated) {
//     return <Navigate to="/login" replace state={{ from: location }} />;
//   }

//   if (Number(user?.role) !== 1) {
//     return <Navigate to="/" replace />;
//   }

//   return children || <Outlet />;
// }
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function OperatorRoute({ children }) {
  const { isAuthenticated, user } = useAuth();  // ← phải là useAuth()
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const role = Number(user?.role ?? 0);

  if (role === 1) return children || <Outlet />;
  if (role === 2) return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/" replace />;
}