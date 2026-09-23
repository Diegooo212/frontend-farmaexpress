import PublicHeader from './PublicHeader';
import Logo from '../Logo/Logo';
import styles from './PublicLayout.module.css';

const FARMACIAS = ['Farmacia Centro', 'Farmacia Norte', 'Farmacia Sur'];

export default function PublicLayout({ children }) {
  return (
    <div className={styles.layout}>
      <PublicHeader />
      <main className={styles.content}>{children}</main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Logo inverted />
            <p>Medicamentos y recetas médicas sin filas.</p>
          </div>

          <div>
            <h2 className={styles.footerTitle}>Retira en</h2>
            <ul className={styles.footerList}>
              {FARMACIAS.map((farmacia) => (
                <li key={farmacia}>{farmacia}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={styles.footerTitle}>Despacho</h2>
            <p className={styles.footerText}>
              Despacho a domicilio disponible para algunas comunas de la Región Metropolitana.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
