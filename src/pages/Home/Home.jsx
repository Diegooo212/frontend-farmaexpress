import { useNavigate } from 'react-router-dom';
import { Pill, Truck, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './Home.module.css';

const FEATURES = [
  {
    icon: Clock,
    title: 'Listo en minutos',
    text: 'Sigue el estado de tu receta en tiempo real, desde que la ingresas hasta que está lista.',
  },
  {
    icon: Truck,
    title: 'Retiro o despacho',
    text: 'Elige recoger en tu farmacia más cercana o recibirla en tu domicilio.',
  },
  {
    icon: ShieldCheck,
    title: 'Farmacia certificada',
    text: 'Químicos farmacéuticos validan cada receta antes de prepararla.',
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <span className={styles.pulseDot} />
          Farmacias abiertas ahora
        </div>

        <div className={styles.heroIcon}>
          <Pill size={40} strokeWidth={2.2} />
        </div>

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
              Ir a mis recetas <ArrowRight size={18} />
            </button>
          ) : (
            <button className={styles.primaryButton} onClick={() => navigate('/login')}>
              Iniciar sesión para pedir una receta <ArrowRight size={18} />
            </button>
          )}
        </div>
      </section>

      <section className={styles.features}>
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <Icon size={22} />
            </div>
            <h3 className={styles.featureTitle}>{title}</h3>
            <p className={styles.featureText}>{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}