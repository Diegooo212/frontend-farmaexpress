import { usePrescriptions } from '../../context/PrescriptionsContext';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { recetas, loading, usingMock, updateStatus } = usePrescriptions();

  const porValidar = recetas.filter((r) => r.status === 'INGRESADA');
  const enPreparacion = recetas.filter((r) => r.status === 'EN_PREPARACION');

  if (loading) {
    return <div className={styles.state}>Cargando cola de trabajo...</div>;
  }

  return (
    <div className={styles.dashboard}>
      <h1 className={styles.title}>Cola de trabajo</h1>
      {usingMock && (
        <p className={styles.mockNotice}>
          Mostrando datos de ejemplo — prescriptions-svc todavía no está desplegado.
        </p>
      )}
      <div className={styles.columns}>
        <section className={styles.column}>
          <h2 className={styles.columnTitle}>Recetas por validar ({porValidar.length})</h2>
          {porValidar.length === 0 && <p className={styles.empty}>No hay recetas pendientes.</p>}
          {porValidar.map((receta) => (
            <div key={receta.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.patientName}>{receta.pacienteNombre}</span>
                <StatusBadge status={receta.status} />
              </div>
              <button
                className={styles.actionButton}
                onClick={() => updateStatus(receta.id, 'VALIDADA')}
              >
                Validar
              </button>
            </div>
          ))}
        </section>

        <section className={styles.column}>
          <h2 className={styles.columnTitle}>En preparación ({enPreparacion.length})</h2>
          {enPreparacion.length === 0 && (
            <p className={styles.empty}>No hay recetas en preparación.</p>
          )}
          {enPreparacion.map((receta) => (
            <div key={receta.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.patientName}>{receta.pacienteNombre}</span>
                <StatusBadge status={receta.status} />
              </div>
              <button
                className={styles.actionButton}
                onClick={() => updateStatus(receta.id, 'LISTA_RETIRO')}
              >
                Marcar lista para retiro
              </button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}