import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Guard de rutas: exige sesión de Entra ID y, si se indican, alguno de los roles de la persona.
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  // MSAL todavía procesa la vuelta desde Microsoft, o (si la ruta exige un rol) aún no llegan los roles
  // desde el BFF: no se decide nada todavía.
  if (loading && (!isAuthenticated || roles?.length)) {
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
