import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ClipboardList, Files, KeyRound, Pill, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import Logo from '../Logo/Logo';
import styles from './Navbar.module.css';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Cola de trabajo', icon: ClipboardList },
  { to: '/recetas', label: 'Todas las recetas', icon: Files },
  { to: '/mi-cuenta', label: 'Mi cuenta y token', icon: KeyRound },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const userName = user?.nombre || 'Usuario';
  const role = user?.roles?.includes('Admin') ? 'Administrador' : 'Operador';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandRow}>
        <Logo to="/dashboard" inverted />
        <ThemeToggle inverted />
      </div>

      <nav className={styles.nav} aria-label="Panel de farmacia">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
          >
            <Icon size={19} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
        <Link to="/#catalogo" className={styles.link}>
          <Pill size={19} aria-hidden="true" />
          Catálogo
        </Link>
      </nav>

      <div className={styles.footer}>
        <div className={styles.user}>
          <span className={styles.userName}>{userName}</span>
          <span className={styles.userRole}>{role}</span>
        </div>
        <button className={styles.logout} onClick={handleLogout} aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOut size={19} />
        </button>
      </div>
    </aside>
  );
}
