import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import styles from './Navbar.module.css';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/recetas', label: 'Recetas' },
  { to: '/catalogo', label: 'Ver catálogo' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const userName = user?.nombre || 'Usuario';

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandRow}>
        <div className={styles.brand}>FarmaExpress</div>
        <ThemeToggle />
      </div>
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? `${styles.link} ${styles.linkActive}` : styles.link
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className={styles.footer}>
        <span className={styles.userName}>{userName}</span>
        <button className={styles.logoutButton} onClick={logout}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}