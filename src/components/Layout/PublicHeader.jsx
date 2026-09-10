import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CartButton from '../CartButton/CartButton';
import styles from './PublicHeader.module.css';

export default function PublicHeader() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const roles = user?.roles || [];

  const goToPanel = () => {
    const isStaff = roles.includes('Operador') || roles.includes('Admin');
    navigate(isStaff ? '/dashboard' : '/mis-recetas');
  };

  return (
    <header className={styles.header}>
      <div className={styles.brand} onClick={() => navigate('/')}>
        FarmaExpress
      </div>
      <nav className={styles.links}>
        <button className={styles.linkButton} onClick={() => navigate('/')}>
          Inicio
        </button>
        <button className={styles.linkButton} onClick={() => navigate('/catalogo')}>
          Catálogo
        </button>
      </nav>
      <div className={styles.actions}>
        <CartButton />
        {isAuthenticated ? (
          <>
            <button className={styles.secondaryButton} onClick={goToPanel}>
              Mi panel
            </button>
            <button className={styles.secondaryButton} onClick={logout}>
              Cerrar sesión
            </button>
          </>
        ) : (
          <button className={styles.primaryButton} onClick={() => navigate('/login')}>
            Iniciar sesión
          </button>
        )}
      </div>
    </header>
  );
}