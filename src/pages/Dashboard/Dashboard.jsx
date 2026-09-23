import { useState } from 'react';
import { FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePrescriptions } from '../../context/PrescriptionsContext';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import PrescriptionDetailDrawer from '../../components/PrescriptionDetailDrawer/PrescriptionDetailDrawer';
import { NEXT_STATUS } from '../../utils/prescriptionStatus';
import { formatDate } from '../../utils/format';
import styles from './Dashboard.module.css';

const COLUMNS = [
  { status: 'INGRESADA', title: 'Por validar', empty: 'No hay recetas esperando validación.' },
  { status: 'VALIDADA', title: 'Validadas', empty: 'Nada validado pendiente de preparar.' },
  { status: 'EN_PREPARACION', title: 'En preparación', empty: 'No hay recetas en preparación.' },
  { status: 'LISTA_RETIRO', title: 'Listas para entregar', empty: 'No hay recetas esperando retiro.' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { recetas, loading, usingMock, updateStatus } = usePrescriptions();
  const [selectedId, setSelectedId] = useState(null);
  const selectedReceta = recetas.find((r) => r.id === selectedId) || null;

  const staffName = user?.nombre || 'Farmacia';

  const handleAdvance = async (receta, nota) => {
    const next = NEXT_STATUS[receta.status];
    if (!next) return;
    await updateStatus(receta.id, next, { nota, por: staffName });
    setSelectedId(null);
  };

  const handleReject = async (receta, nota) => {
    await updateStatus(receta.id, 'RECHAZADA', { nota, por: staffName });
    setSelectedId(null);
  };

  if (loading) {
    return <p className={styles.state}>Cargando la cola de trabajo…</p>;
  }

  const pendientes = recetas.filter((r) => r.status === 'INGRESADA').length;

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1 className={styles.title}>Cola de trabajo</h1>
        <p className={styles.lead}>
          {pendientes === 0
            ? 'No hay recetas nuevas por validar.'
            : `${pendientes} ${pendientes === 1 ? 'receta espera' : 'recetas esperan'} validación.`}
        </p>
      </header>

      {usingMock && (
        <p className="alert alert-info">
          Datos de ejemplo: el servicio de recetas todavía no está conectado.
        </p>
      )}

      <div className={styles.board}>
        {COLUMNS.map((column) => {
          const items = recetas.filter((r) => r.status === column.status);
          return (
            <section key={column.status} className={styles.column} aria-label={column.title}>
              <h2 className={styles.columnTitle}>
                {column.title}
                <span className={styles.count}>{items.length}</span>
              </h2>
              {items.length === 0 && <p className={styles.empty}>{column.empty}</p>}
              {items.map((receta) => (
                <button
                  key={receta.id}
                  className={styles.ticket}
                  onClick={() => setSelectedId(receta.id)}
                >
                  <span className={styles.patient}>{receta.pacienteNombre}</span>
                  {receta.rut && <span className={styles.meta}>RUT {receta.rut}</span>}
                  <span className={styles.meta}>
                    {formatDate(receta.fechaCreacion)}
                    {receta.metodoDespacho === 'DESPACHO_DOMICILIO' ? ', despacho' : receta.farmacia ? `, ${receta.farmacia}` : ''}
                  </span>
                  <span className={styles.ticketFoot}>
                    <StatusBadge status={receta.status} />
                    {receta.archivoNombre && (
                      <span className={styles.attachment} title={receta.archivoNombre}>
                        <FileText size={15} aria-hidden="true" /> Receta adjunta
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </section>
          );
        })}
      </div>

      <PrescriptionDetailDrawer
        key={selectedId}
        receta={selectedReceta}
        isOpen={!!selectedReceta}
        onClose={() => setSelectedId(null)}
        canManage
        onAdvance={handleAdvance}
        onReject={handleReject}
      />
    </div>
  );
}
