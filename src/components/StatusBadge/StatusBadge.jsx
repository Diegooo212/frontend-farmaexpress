import { STATUS_LABELS } from '../../utils/prescriptionStatus';
import styles from './StatusBadge.module.css';

export default function StatusBadge({ status }) {
  return (
    <span className={`${styles.badge} ${styles[status] || ''}`}>
      <span className={styles.dot} aria-hidden="true" />
      {STATUS_LABELS[status] || status}
    </span>
  );
}
