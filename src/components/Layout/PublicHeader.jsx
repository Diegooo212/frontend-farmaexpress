import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CartButton from '../CartButton/CartButton';
import NotificationsButton from '../NotificationsButton/NotificationsButton';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import Logo from '../Logo/Logo';
import styles from './PublicHeader.module.css';

export default function PublicHeader() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const roles = user?.roles || [];
  const isStaff = roles.includes('Operador') || roles.includes('Admin');
  const firstName = user?.nombre?.split(' ')[0];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Logo />

        <nav className={styles.nav} aria-label="Principal">
          <Link to="/#catalogo" className={styles.link}>
            Catálogo
          </Link>
          <Link to="/#recetas" className={styles.link}>
            Cómo funcionan las recetas
          </Link>
          {isAuthenticated && (
            <NavLink
              to="/mis-recetas"
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
            >
              Mis recetas
            </NavLink>
          )}
          {isStaff && (
            <NavLink to="/dashboard" className={styles.link}>
              Panel de farmacia
            </NavLink>
          )}
          {isAuthenticated && (
            <NavLink
              to="/mi-cuenta"
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
            >
              Mi cuenta
            </NavLink>
          )}
        </nav>

        <div className={styles.actions}>
          <ThemeToggle />
          {isAuthenticated && !isStaff && <NotificationsButton />}
          {isAuthenticated && <CartButton />}
          {isAuthenticated ? (
            <div className={styles.account}>
              {firstName && <span className={styles.greeting}>Hola, {firstName}</span>}
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                <span className={styles.long}>Cerrar sesión</span>
                <span className={styles.short}>Salir</span>
              </button>
            </div>
          ) : (
            <Link to="/login" state={{ from: location }} className="btn btn-primary btn-sm">
              <span className={styles.long}>Iniciar sesión</span>
              <span className={styles.short}>Entrar</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
