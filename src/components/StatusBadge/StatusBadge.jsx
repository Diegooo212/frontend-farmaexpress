import styles from './StatusBadge.module.css';

const STATUS_LABELS = {
  INGRESADA: 'Ingresada',
  VALIDADA: 'Validada',
  EN_PREPARACION: 'En preparación',
  LISTA_RETIRO: 'Lista para retiro',
  DISPENSADA: 'Dispensada',
  RECHAZADA: 'Rechazada',
};

export default function StatusBadge({ status }) {
  const className = `${styles.badge} ${styles[status] || ''}`;
  return <span className={className}>{STATUS_LABELS[status] || status}</span>;
}