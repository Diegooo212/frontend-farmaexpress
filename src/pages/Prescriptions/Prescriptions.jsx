import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePrescriptions } from '../../context/PrescriptionsContext';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import PrescriptionDetailDrawer from '../../components/PrescriptionDetailDrawer/PrescriptionDetailDrawer';
import { NEXT_STATUS, STATUS_LABELS } from '../../utils/prescriptionStatus';
import { formatDate } from '../../utils/format';
import styles from './Prescriptions.module.css';

export default function Prescriptions() {
  const { user } = useAuth();
  const roles = user?.roles || [];
  const isOperador = roles.includes('Operador') || roles.includes('Admin');

  const { recetas, loading, usingMock, updateStatus } = usePrescriptions();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const selectedReceta = recetas.find((r) => r.id === selectedId) || null;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const cleanTerm = term.replace(/[^0-9k]/g, '');
    return recetas.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!term) return true;
      const rut = (r.rut || '').toLowerCase().replace(/[^0-9k]/g, '');
      return (
        r.pacienteNombre?.toLowerCase().includes(term) ||
        (r.email || '').toLowerCase().includes(term) ||
        (cleanTerm.length > 2 && rut.includes(cleanTerm))
      );
    });
  }, [recetas, statusFilter, search]);

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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Todas las recetas</h1>
        <div className={styles.filters}>
          <label className={styles.search}>
            <span className="visually-hidden">Buscar paciente</span>
            <input
              className="input"
              type="search"
              placeholder="Buscar por nombre, RUT o correo"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className={styles.filter}>
            <span className="visually-hidden">Filtrar por estado</span>
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_LABELS).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {usingMock && (
        <p className="alert alert-info">
          Datos de ejemplo: el servicio de recetas todavía no está conectado.
        </p>
      )}

      {loading ? (
        <p className={styles.state}>Cargando recetas…</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Paciente</th>
                <th scope="col">RUT</th>
                <th scope="col">Contacto</th>
                <th scope="col">Estado</th>
                <th scope="col">Entrega</th>
                <th scope="col">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((receta) => (
                <tr key={receta.id}>
                  <td>
                    <button className={styles.rowButton} onClick={() => setSelectedId(receta.id)}>
                      {receta.pacienteNombre}
                    </button>
                  </td>
                  <td className={styles.nowrap}>{receta.rut || 'Sin RUT'}</td>
                  <td className={styles.muted}>
                    {receta.email || 'Sin correo'}
                    {receta.telefono && <span className={styles.sub}>{receta.telefono}</span>}
                  </td>
                  <td>
                    <StatusBadge status={receta.status} />
                  </td>
                  <td className={styles.muted}>
                    {receta.metodoDespacho === 'DESPACHO_DOMICILIO'
                      ? 'Despacho a domicilio'
                      : receta.farmacia || 'Retiro en farmacia'}
                  </td>
                  <td className={styles.muted}>{formatDate(receta.fechaCreacion)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    No hay recetas que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <PrescriptionDetailDrawer
        key={selectedId}
        receta={selectedReceta}
        isOpen={!!selectedReceta}
        onClose={() => setSelectedId(null)}
        canManage={isOperador}
        onAdvance={handleAdvance}
        onReject={handleReject}
      />
    </div>
  );
}
