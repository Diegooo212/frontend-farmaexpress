import { STATUS_FLOW, STATUS_LABELS } from '../../utils/prescriptionStatus';
import styles from './StatusTrack.module.css';

const VISIBLE_STEPS = STATUS_FLOW.slice(0, 4);

// Barra de avance de una receta: muestra en qué paso va y cuáles ya pasaron.
export default function StatusTrack({ status, motivo }) {
  if (status === 'RECHAZADA') {
    return (
      <div className={styles.rejected}>
        <p>Esta receta fue rechazada.</p>
        <p className={styles.reason}>
          {motivo ? `Motivo: ${motivo}` : 'Revisa que la imagen sea legible y envíala de nuevo.'}
        </p>
      </div>
    );
  }

  const current = STATUS_FLOW.indexOf(status);

  return (
    <ol className={styles.track} aria-label={`Estado: ${STATUS_LABELS[status] || status}`}>
      {VISIBLE_STEPS.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'pending';
        return (
          <li key={step} className={`${styles.step} ${styles[state]}`}>
            <span className={styles.bar} />
            <span className={styles.label}>{STATUS_LABELS[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}
