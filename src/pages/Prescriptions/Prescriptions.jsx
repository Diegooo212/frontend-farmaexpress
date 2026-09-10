import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePrescriptions } from '../../context/PrescriptionsContext';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Drawer from '../../components/Drawer/Drawer';
import styles from './Prescriptions.module.css';

const STATUS_OPTIONS = [
  'INGRESADA',
  'VALIDADA',
  'EN_PREPARACION',
  'LISTA_RETIRO',
  'DISPENSADA',
  'RECHAZADA',
];

const NEXT_STATUS = {
  INGRESADA: 'VALIDADA',
  VALIDADA: 'EN_PREPARACION',
  EN_PREPARACION: 'LISTA_RETIRO',
  LISTA_RETIRO: 'DISPENSADA',
};

const NEXT_LABEL = {
  INGRESADA: 'Validar',
  VALIDADA: 'Pasar a preparación',
  EN_PREPARACION: 'Marcar lista para retiro',
  LISTA_RETIRO: 'Marcar dispensada',
};

export default function Prescriptions() {
  const { user } = useAuth();
  const roles = user?.roles || [];
  const isOperador = roles.includes('Operador') || roles.includes('Admin');

  const { recetas, loading, usingMock, updateStatus } = usePrescriptions();
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedReceta, setSelectedReceta] = useState(null);

  const filtered = useMemo(
    () => (statusFilter ? recetas.filter((r) => r.status === statusFilter) : recetas),
    [recetas, statusFilter]
  );

  const handleAdvance = async (receta) => {
    const next = NEXT_STATUS[receta.status];
    if (!next) return;
    await updateStatus(receta.id, next);
    setSelectedReceta(null);
  };

  const handleRechazar = async (receta) => {
    await updateStatus(receta.id, 'RECHAZADA');
    setSelectedReceta(null);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Recetas</h1>
      </div>

      {usingMock && (
        <p className={styles.mockNotice}>
          Mostrando datos de ejemplo — prescriptions-svc todavía no está desplegado.
        </p>
      )}

      <div className={styles.filters}>
        <select
          className={styles.select}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className={styles.state}>Cargando recetas...</p>}

      {!loading && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Estado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((receta) => (
              <tr key={receta.id} className={styles.row} onClick={() => setSelectedReceta(receta)}>
                <td>{receta.pacienteNombre}</td>
                <td>
                  <StatusBadge status={receta.status} />
                </td>
                <td>{receta.fechaCreacion}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className={styles.empty}>
                  No hay recetas para este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <Drawer
        isOpen={!!selectedReceta}
        onClose={() => setSelectedReceta(null)}
        title={selectedReceta ? `Receta de ${selectedReceta.pacienteNombre}` : ''}
      >
        {selectedReceta && (
          <>
            <div>
              <StatusBadge status={selectedReceta.status} />
            </div>
            <p className={styles.drawerText}>Fecha: {selectedReceta.fechaCreacion}</p>

            {isOperador && NEXT_STATUS[selectedReceta.status] && (
              <button className={styles.actionButton} onClick={() => handleAdvance(selectedReceta)}>
                {NEXT_LABEL[selectedReceta.status]}
              </button>
            )}

            {isOperador && ['INGRESADA', 'VALIDADA'].includes(selectedReceta.status) && (
              <button className={styles.rejectButton} onClick={() => handleRechazar(selectedReceta)}>
                Rechazar
              </button>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}