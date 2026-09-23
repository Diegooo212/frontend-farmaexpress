import { getHistorial, patientMessage, STATUS_LABELS } from '../../utils/prescriptionStatus';
import { formatDateTime } from '../../utils/format';
import styles from './RecetaTimeline.module.css';

// Historial de cambios de una receta. Para el paciente usa mensajes en lenguaje simple;
// para el personal de farmacia muestra además quién hizo cada cambio.
export default function RecetaTimeline({ receta, forStaff = false }) {
  const historial = [...getHistorial(receta)].reverse();

  return (
    <ol className={styles.timeline}>
      {historial.map((entry, index) => (
        <li key={`${entry.status}-${entry.fecha}-${index}`} className={`${styles.entry} ${styles[entry.status] || ''}`}>
          <span className={styles.dot} aria-hidden="true" />
          <div className={styles.body}>
            <span className={styles.title}>
              {forStaff ? STATUS_LABELS[entry.status] || entry.status : patientMessage(receta, entry.status)}
            </span>
            <span className={styles.meta}>
              {formatDateTime(entry.fecha)}
              {forStaff && entry.por ? `, por ${entry.por}` : ''}
            </span>
            {entry.nota && <p className={styles.note}>{entry.nota}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
