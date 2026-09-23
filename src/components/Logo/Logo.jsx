import { Link } from 'react-router-dom';
import styles from './Logo.module.css';

export default function Logo({ to = '/', inverted = false }) {
  return (
    <Link to={to} className={`${styles.logo} ${inverted ? styles.inverted : ''}`}>
      <svg className={styles.mark} viewBox="0 0 40 20" aria-hidden="true">
        <rect x="1" y="1" width="38" height="18" rx="9" className={styles.shell} />
        <path d="M20 1h10a9 9 0 0 1 0 18H20z" className={styles.fill} />
      </svg>
      <span>FarmaExpress</span>
    </Link>
  );
}
