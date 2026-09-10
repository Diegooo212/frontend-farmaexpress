import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Home.module.css';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className={styles.hero}>
      <h1 className={styles.title}>Retira tus recetas sin filas</h1>
      <p className={styles.subtitle}>
        FarmaExpress conecta tus recetas médicas con la farmacia más cercana. Revisa el estado
        de tu pedido y retíralo cuando esté listo.
      </p>
      <div className={styles.actions}>
        <button className={styles.secondaryButton} onClick={() => navigate('/catalogo')}>
          Ver catálogo
        </button>
        {isAuthenticated ? (
          <button className={styles.primaryButton} onClick={() => navigate('/mis-recetas')}>
            Ir a mis recetas
          </button>
        ) : (
          <button className={styles.primaryButton} onClick={() => navigate('/login')}>
            Iniciar sesión para pedir una receta
          </button>
        )}
      </div>
    </div>
  );
}