import { useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import Drawer from '../Drawer/Drawer';
import StatusBadge from '../StatusBadge/StatusBadge';
import StatusTrack from '../StatusTrack/StatusTrack';
import RecetaFile from '../RecetaFile/RecetaFile';
import RecetaTimeline from '../RecetaTimeline/RecetaTimeline';
import { NEXT_STATUS, NEXT_LABEL, REJECTABLE } from '../../utils/prescriptionStatus';
import { formatDate } from '../../utils/format';
import { isValidRut } from '../../utils/rut';
import { apiErrorMessage } from '../../api/httpClient';
import styles from './PrescriptionDetailDrawer.module.css';

const MAX_NOTA = 300;

// Panel de revisión para operadores y administradores: receta adjunta, datos del paciente
// y acciones. Usar con key={receta.id} para limpiar el mensaje al cambiar de receta.
export default function PrescriptionDetailDrawer({
  receta,
  isOpen,
  onClose,
  canManage,
  onAdvance,
  onReject,
}) {
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!receta) return null;

  const canAdvance = canManage && NEXT_STATUS[receta.status];
  const canReject = canManage && REJECTABLE.includes(receta.status);
  const rutOk = receta.rut ? isValidRut(receta.rut) : null;

  const run = async (action) => {
    setSaving(true);
    try {
      await action(receta, nota.trim());
    } catch (err) {
      // Por ejemplo, otro operador ya cambió el estado de esta receta.
      setError(apiErrorMessage(err, 'No se pudo cambiar el estado de la receta.'));
    } finally {
      setSaving(false);
    }
  };

  const handleReject = () => {
    if (!nota.trim()) {
      setError('Escribe el motivo del rechazo: el paciente lo verá para saber qué corregir.');
      return;
    }
    run(onReject);
  };

  const footer =
    canAdvance || canReject ? (
      <div className={styles.actions}>
        <label className="field">
          Mensaje para el paciente
          <textarea
            className="input"
            rows={2}
            maxLength={MAX_NOTA}
            placeholder={
              canReject
                ? 'Opcional al avanzar. Obligatorio si rechazas: explica el motivo.'
                : 'Opcional. Por ejemplo: horario de retiro.'
            }
            value={nota}
            onChange={(e) => {
              setNota(e.target.value);
              setError('');
            }}
          />
          <span className="field-hint">El paciente recibe este mensaje junto al cambio de estado.</span>
          {error && <span className="field-error">{error}</span>}
        </label>
        <div className={styles.buttons}>
          {canAdvance && (
            <button className="btn btn-primary" disabled={saving} onClick={() => run(onAdvance)}>
              {NEXT_LABEL[receta.status]}
            </button>
          )}
          {canReject && (
            <button className="btn btn-danger" disabled={saving} onClick={handleReject}>
              Rechazar receta
            </button>
          )}
        </div>
      </div>
    ) : null;

  const entrega =
    receta.metodoDespacho === 'DESPACHO_DOMICILIO'
      ? `Despacho a ${receta.direccion || 'dirección no informada'}`
      : `Retiro en ${receta.farmacia || 'farmacia no especificada'}`;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Receta de ${receta.pacienteNombre}`}
      footer={footer}
      wide
    >
      <div className={styles.statusRow}>
        <StatusBadge status={receta.status} />
        <span className={styles.date}>Enviada el {formatDate(receta.fechaCreacion)}</span>
      </div>

      <div className={styles.layout}>
        <section className={styles.fileColumn} aria-label="Receta adjunta">
          <RecetaFile key={receta.id} receta={receta} />
        </section>

        <div className={styles.infoColumn}>
          <StatusTrack status={receta.status} />

          <section>
            <h3 className={styles.sectionTitle}>Paciente</h3>
            <dl className={styles.fields}>
              <div className={styles.field}>
                <dt>Nombre</dt>
                <dd>{receta.pacienteNombre}</dd>
              </div>
              <div className={styles.field}>
                <dt>RUT</dt>
                <dd>
                  {receta.rut || 'No informado'}
                  {rutOk !== null && (
                    <span className={rutOk ? styles.ok : styles.warn}>
                      {rutOk ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                      {rutOk ? 'Válido' : 'Dígito verificador no coincide'}
                    </span>
                  )}
                </dd>
              </div>
              <div className={styles.field}>
                <dt>Correo</dt>
                <dd>{receta.email || 'No informado'}</dd>
              </div>
              <div className={styles.field}>
                <dt>Teléfono</dt>
                <dd>{receta.telefono || 'No informado'}</dd>
              </div>
              <div className={styles.field}>
                <dt>Entrega</dt>
                <dd>{entrega}</dd>
              </div>
            </dl>
          </section>

          {(receta.cuentaEmail || receta.cuentaNombre) && (
            <section>
              <h3 className={styles.sectionTitle}>Cuenta que la envió</h3>
              <dl className={styles.fields}>
                {receta.cuentaNombre && (
                  <div className={styles.field}>
                    <dt>Usuario</dt>
                    <dd>{receta.cuentaNombre}</dd>
                  </div>
                )}
                {receta.cuentaEmail && (
                  <div className={styles.field}>
                    <dt>Correo de la cuenta</dt>
                    <dd>{receta.cuentaEmail}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {receta.comentarios && (
            <section className={styles.comment}>
              <h3>Comentario del paciente</h3>
              <p>{receta.comentarios}</p>
            </section>
          )}

          <section>
            <h3 className={styles.sectionTitle}>Historial</h3>
            <RecetaTimeline receta={receta} forStaff />
          </section>
        </div>
      </div>
    </Drawer>
  );
}
