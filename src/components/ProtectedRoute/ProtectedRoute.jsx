import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Guard de rutas: exige sesión de Entra ID y, si se indican, alguno de los roles del token.
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  // MSAL todavía está procesando la vuelta desde Microsoft: no se decide nada aún.
  if (loading && !isAuthenticated) {
    return <p style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>Verificando tu sesión…</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles?.length) {
    const userRoles = user?.roles || [];
    if (!roles.some((role) => userRoles.includes(role))) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
