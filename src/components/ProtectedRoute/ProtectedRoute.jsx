import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles?.length) {
    const userRoles = user?.roles || [];
    const hasRole = roles.some((role) => userRoles.includes(role));
    if (!hasRole) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}