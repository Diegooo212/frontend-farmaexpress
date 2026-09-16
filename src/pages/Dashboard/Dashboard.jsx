import { useState } from 'react';
import { usePrescriptions } from '../../context/PrescriptionsContext';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import PrescriptionDetailDrawer from '../../components/PrescriptionDetailDrawer/PrescriptionDetailDrawer';
import styles from './Dashboard.module.css';

const NEXT_STATUS_MAP = {
  INGRESADA: 'VALIDADA',
  VALIDADA: 'EN_PREPARACION',
  EN_PREPARACION: 'LISTA_RETIRO',
  LISTA_RETIRO: 'DISPENSADA',
};

export default function Dashboard() {
  const { recetas, loading, usingMock, updateStatus } = usePrescriptions();
  const [selectedReceta, setSelectedReceta] = useState(null);

  const porValidar = recetas.filter((r) => r.status === 'INGRESADA');
  const enPreparacion = recetas.filter((r) => r.status === 'EN_PREPARACION');

  const handleAdvance = async (receta) => {
    const next = NEXT_STATUS_MAP[receta.status];
    if (!next) return;
    await updateStatus(receta.id, next);
    setSelectedReceta(null);
  };

  const handleReject = async (receta) => {
    await updateStatus(receta.id, 'RECHAZADA');
    setSelectedReceta(null);
  };

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
            <button key={receta.id} className={styles.card} onClick={() => setSelectedReceta(receta)}>
              <div className={styles.cardHeader}>
                <span className={styles.patientName}>{receta.pacienteNombre}</span>
                <StatusBadge status={receta.status} />
              </div>
              <span className={styles.cardHint}>Click para ver la receta completa y validar</span>
            </button>
          ))}
        </section>

        <section className={styles.column}>
          <h2 className={styles.columnTitle}>En preparación ({enPreparacion.length})</h2>
          {enPreparacion.length === 0 && (
            <p className={styles.empty}>No hay recetas en preparación.</p>
          )}
          {enPreparacion.map((receta) => (
            <button key={receta.id} className={styles.card} onClick={() => setSelectedReceta(receta)}>
              <div className={styles.cardHeader}>
                <span className={styles.patientName}>{receta.pacienteNombre}</span>
                <StatusBadge status={receta.status} />
              </div>
              <span className={styles.cardHint}>Click para ver detalle</span>
            </button>
          ))}
        </section>
      </div>

      <PrescriptionDetailDrawer
        receta={selectedReceta}
        isOpen={!!selectedReceta}
        onClose={() => setSelectedReceta(null)}
        canManage
        onAdvance={handleAdvance}
        onReject={handleReject}
      />
    </div>
  );
}