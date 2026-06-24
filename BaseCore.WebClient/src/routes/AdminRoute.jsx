// import { Navigate, Outlet, useLocation } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext';
// import { isAdminRole } from '../api';

// export default function AdminRoute({ children }) {
//   const { isAuthenticated, user } = useAuth();
//   const location = useLocation();

//   if (!isAuthenticated) {
//     return <Navigate to="/login" replace state={{ from: location }} />;
//   }

//   if (!isAdminRole(user?.role)) {
//     return <Navigate to="/" replace />;
//   }

//   return children || <Outlet />;
// }
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const role = Number(user?.role ?? 0);

  // Cho phép Admin (2) và Operator (1) vào
  // if (role !== 1 && role !== 2) {
  //   return <Navigate to="/" replace />;
  // }
  if (role === 2) return children || <Outlet />;
if (role === 1) return <Navigate to="/operator/dashboard" replace />;
return <Navigate to="/" replace />;

  return children || <Outlet />;
}