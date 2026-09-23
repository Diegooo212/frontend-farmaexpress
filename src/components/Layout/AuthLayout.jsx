import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCatalog } from '../../context/CatalogContext';
import Logo from '../Logo/Logo';
import MedBox from '../MedBox/MedBox';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import styles from './AuthLayout.module.css';

export default function AuthLayout({ title, subtitle, children, backTo = '/', backLabel = 'Volver al inicio' }) {
  const { medicamentos } = useCatalog();
  const boxes = medicamentos.slice(0, 4);

  return (
    <div className={styles.page}>
      <aside className={styles.aside}>
        <Logo inverted />
        <p className={styles.tagline}>Compra medicamentos y sigue tus recetas desde un solo lugar.</p>
        <div className={styles.boxes} aria-hidden="true">
          {boxes.map((m) => (
            <MedBox key={m.id} medicamento={m} size="sm" shape="tall" />
          ))}
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.topbar}>
          <Link to={backTo} className={styles.back}>
            <ArrowLeft size={18} /> {backLabel}
          </Link>
          <ThemeToggle />
        </div>

        <div className={styles.panel}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}
