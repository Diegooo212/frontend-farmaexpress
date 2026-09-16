import Drawer from '../Drawer/Drawer';
import StatusBadge from '../StatusBadge/StatusBadge';
import styles from './PrescriptionDetailDrawer.module.css';

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

export default function PrescriptionDetailDrawer({
  receta,
  isOpen,
  onClose,
  canManage,
  onAdvance,
  onReject,
}) {
  if (!receta) return null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Receta de ${receta.pacienteNombre}`}>
      <div className={styles.statusRow}>
        <StatusBadge status={receta.status} />
        <span className={styles.date}>{receta.fechaCreacion}</span>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>RUT</span>
        <span className={styles.value}>{receta.rut || 'No informado'}</span>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Correo</span>
        <span className={styles.value}>{receta.email || 'No informado'}</span>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Teléfono</span>
        <span className={styles.value}>{receta.telefono || 'No informado'}</span>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Entrega</span>
        <span className={styles.value}>
          {receta.metodoDespacho === 'DESPACHO_DOMICILIO'
            ? `Despacho a domicilio: ${receta.direccion || 'sin dirección informada'}`
            : `Retiro en: ${receta.farmacia || 'farmacia no especificada'}`}
        </span>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Receta adjunta</span>
        <span className={styles.value}>{receta.archivoNombre || 'Sin archivo adjunto'}</span>
      </div>

      {receta.comentarios && (
        <div className={styles.field}>
          <span className={styles.label}>Comentarios del paciente</span>
          <span className={styles.value}>{receta.comentarios}</span>
        </div>
      )}

      {canManage && NEXT_STATUS[receta.status] && (
        <button className={styles.actionButton} onClick={() => onAdvance(receta)}>
          {NEXT_LABEL[receta.status]}
        </button>
      )}

      {canManage && ['INGRESADA', 'VALIDADA'].includes(receta.status) && (
        <button className={styles.rejectButton} onClick={() => onReject(receta)}>
          Rechazar
        </button>
      )}
    </Drawer>
  );
}