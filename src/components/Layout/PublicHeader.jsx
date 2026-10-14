import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Heart, LogOut, Menu, UserRound, X } from 'lucide-react';
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
  // Menú desplegable en celulares (en escritorio los enlaces se ven siempre).
  const [menuAbierto, setMenuAbierto] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    if (!menuAbierto) return undefined;
    const alPresionar = (e) => {
      if (e.key === 'Escape') setMenuAbierto(false);
    };
    const alTocarFuera = (e) => {
      if (!headerRef.current?.contains(e.target)) setMenuAbierto(false);
    };
    document.addEventListener('keydown', alPresionar);
    document.addEventListener('mousedown', alTocarFuera);
    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.removeEventListener('mousedown', alTocarFuera);
    };
  }, [menuAbierto]);

  const cerrarMenu = () => setMenuAbierto(false);

  const handleLogout = () => {
    cerrarMenu();
    logout();
    navigate('/');
  };

  const claseLink = ({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`;

  return (
    <header className={styles.header} ref={headerRef}>
      <div className={styles.inner}>
        <button
          type="button"
          className={`icon-btn ${styles.hamburguesa}`}
          onClick={() => setMenuAbierto((v) => !v)}
          aria-expanded={menuAbierto}
          aria-controls="menu-principal"
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
        >
          {menuAbierto ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Logo />

        <nav
          id="menu-principal"
          className={`${styles.nav} ${menuAbierto ? styles.navAbierto : ''}`}
          aria-label="Principal"
        >
          <NavLink to="/catalogo" className={claseLink} onClick={cerrarMenu}>
            Catálogo
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/mis-pedidos" className={claseLink} onClick={cerrarMenu}>
              Mis pedidos
            </NavLink>
          )}
          {isAuthenticated && (
            <NavLink to="/mis-recetas" className={claseLink} onClick={cerrarMenu}>
              Mis recetas
            </NavLink>
          )}
          {isStaff && (
            <NavLink to="/dashboard" className={styles.link} onClick={cerrarMenu}>
              Panel de farmacia
            </NavLink>
          )}

          {/* Solo en el menú del celular: lo que en escritorio está a la derecha. */}
          <div className={styles.soloMovil}>
            {isAuthenticated && (
              <NavLink to="/mi-cuenta" className={claseLink} onClick={cerrarMenu}>
                Mi cuenta{firstName ? ` (${firstName})` : ''}
              </NavLink>
            )}
            {isAuthenticated && (
              <NavLink to="/favoritos" className={claseLink} onClick={cerrarMenu}>
                Favoritos
              </NavLink>
            )}
            <NavLink to="/ayuda" className={claseLink} onClick={cerrarMenu}>
              Ayuda
            </NavLink>
            {isAuthenticated && (
              <button type="button" className={`${styles.link} ${styles.salir}`} onClick={handleLogout}>
                Cerrar sesión
              </button>
            )}
          </div>
        </nav>

        <div className={styles.actions}>
          <ThemeToggle />
          {isAuthenticated && !isStaff && <NotificationsButton />}
          {isAuthenticated && !isStaff && (
            <Link to="/favoritos" className={`icon-btn ${styles.soloEscritorio}`} aria-label="Favoritos" title="Favoritos">
              <Heart size={20} />
            </Link>
          )}
          {isAuthenticated && <CartButton />}
          {isAuthenticated ? (
            <div className={`${styles.account} ${styles.soloEscritorio}`}>
              {firstName && (
                <Link to="/mi-cuenta" className={styles.greeting} title="Mi cuenta">
                  Hola, {firstName}
                </Link>
              )}
              {/* En pantallas medianas el saludo y "Cerrar sesión" pasan a ser íconos. */}
              <Link to="/mi-cuenta" className={`icon-btn ${styles.soloCompacto}`} aria-label="Mi cuenta" title="Mi cuenta">
                <UserRound size={20} />
              </Link>
              <button className={`btn btn-ghost btn-sm ${styles.salirTexto}`} onClick={handleLogout}>
                Cerrar sesión
              </button>
              <button
                className={`icon-btn ${styles.soloCompacto}`}
                onClick={handleLogout}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut size={20} />
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
