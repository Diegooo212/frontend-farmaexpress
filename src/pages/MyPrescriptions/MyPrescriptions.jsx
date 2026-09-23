import { useMemo, useRef, useState } from 'react';
import { FileUp, FileText, X, Store, Truck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePrescriptions } from '../../context/PrescriptionsContext';
import { formatRut, isValidRut } from '../../utils/rut';
import { formatDate } from '../../utils/format';
import { compressImage } from '../../utils/compressImage';
import { apiErrorMessage } from '../../api/httpClient';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import StatusTrack from '../../components/StatusTrack/StatusTrack';
import RecetaTimeline from '../../components/RecetaTimeline/RecetaTimeline';
import { getHistorial, isOwnReceta, lastNote } from '../../utils/prescriptionStatus';
import styles from './MyPrescriptions.module.css';

const FARMACIAS = ['Farmacia Centro', 'Farmacia Norte', 'Farmacia Sur'];
const MAX_COMENTARIOS = 250;
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export default function MyPrescriptions() {
  const { user } = useAuth();
  const { recetas, loading, createReceta } = usePrescriptions();
  const fileInputRef = useRef(null);

  const [nombre, setNombre] = useState(user?.nombre || '');
  const [rut, setRut] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [telefono, setTelefono] = useState('');
  const [metodoDespacho, setMetodoDespacho] = useState('RETIRO_TIENDA');
  const [farmacia, setFarmacia] = useState(FARMACIAS[0]);
  const [direccion, setDireccion] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [dragging, setDragging] = useState(false);

  const [errors, setErrors] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [envioError, setEnvioError] = useState('');

  const misRecetas = useMemo(
    () =>
      recetas
        .filter((r) => isOwnReceta(r, user))
        .sort((a, b) => String(b.fechaCreacion).localeCompare(String(a.fechaCreacion))),
    [recetas, user]
  );

  const handleRutChange = (e) => {
    setRut(formatRut(e.target.value));
  };

  const fileError = (message) => setErrors((prev) => ({ ...prev, archivo: message }));

  const selectFile = async (file) => {
    if (!file) return;

    if (/\.hei[cf]$/i.test(file.name)) {
      fileError('Las fotos HEIC del iPhone no se pueden abrir en el navegador. Envía una captura de pantalla de la foto o cambia la cámara a "Más compatible".');
      return;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      fileError('Solo se aceptan fotos (JPG, PNG, WEBP) o PDF.');
      return;
    }

    let final;
    try {
      final = await compressImage(file);
    } catch {
      fileError('No pudimos leer la foto. Prueba con otra imagen o con un PDF.');
      return;
    }
    if (final.size > MAX_FILE_SIZE) {
      fileError('El archivo pesa más de 3 MB. Si es un PDF, prueba escaneándolo con menos resolución.');
      return;
    }

    setErrors((prev) => ({ ...prev, archivo: undefined }));
    setArchivo(final);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    selectFile(e.dataTransfer.files?.[0]);
  };

  const handleRemoveFile = () => {
    setArchivo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = () => {
    const newErrors = {};
    if (!isValidRut(rut)) newErrors.rut = 'Revisa el RUT: el dígito verificador no coincide.';
    if (metodoDespacho === 'DESPACHO_DOMICILIO' && !direccion.trim()) {
      newErrors.direccion = 'Escribe la dirección donde quieres recibir la receta.';
    }
    if (!archivo) newErrors.archivo = 'Adjunta la receta médica para poder validarla.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setConfirmado(false);
    if (!validate()) return;

    setEnviando(true);
    setEnvioError('');
    try {
      await createReceta(
        {
          pacienteNombre: nombre,
          rut,
          email,
          telefono,
          tiempoEntrega: 'NORMAL',
          metodoDespacho,
          farmacia: metodoDespacho === 'RETIRO_TIENDA' ? farmacia : undefined,
          direccion: metodoDespacho === 'DESPACHO_DOMICILIO' ? direccion : undefined,
          comentarios,
          // Cuenta que envía la receta: así solo esta cuenta la ve y recibe sus avisos.
          cuentaEmail: user?.email,
          cuentaNombre: user?.nombre,
        },
        archivo
      );
      setComentarios('');
      handleRemoveFile();
      setConfirmado(true);
    } catch (err) {
      setEnvioError(apiErrorMessage(err, 'No pudimos enviar la receta. Intenta de nuevo.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Mis recetas</h1>
        <p className={styles.subtitle}>
          Envía tu receta médica y retírala en la farmacia que elijas, o recíbela en tu domicilio.
        </p>
      </header>

      <div className={styles.grid}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <h2 className={styles.formTitle}>Enviar una receta</h2>

          <fieldset className={styles.fieldset}>
            <legend>Paciente</legend>
            <div className={styles.row}>
              <label className="field">
                Nombre completo
                <input
                  className="input"
                  autoComplete="name"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                RUT
                <input
                  className="input"
                  value={rut}
                  onChange={handleRutChange}
                  placeholder="12.345.678-9"
                  maxLength={12}
                  aria-invalid={!!errors.rut}
                  required
                />
                {errors.rut && <span className="field-error">{errors.rut}</span>}
              </label>
            </div>
            <div className={styles.row}>
              <label className="field">
                Correo electrónico
                <input
                  className="input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                Teléfono
                <input
                  className="input"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+56 9 1234 5678"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  required
                />
              </label>
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend>Entrega</legend>
            <p className="field-hint">Plazo normal: máximo 6 días hábiles.</p>
            <div className={styles.options}>
              <label
                className={`${styles.option} ${metodoDespacho === 'RETIRO_TIENDA' ? styles.optionOn : ''}`}
              >
                <input
                  type="radio"
                  name="metodoDespacho"
                  checked={metodoDespacho === 'RETIRO_TIENDA'}
                  onChange={() => setMetodoDespacho('RETIRO_TIENDA')}
                />
                <Store size={22} aria-hidden="true" />
                <span className={styles.optionText}>
                  <strong>Retiro en farmacia</strong>
                  <span>Sin costo de despacho</span>
                </span>
              </label>
              <label
                className={`${styles.option} ${metodoDespacho === 'DESPACHO_DOMICILIO' ? styles.optionOn : ''}`}
              >
                <input
                  type="radio"
                  name="metodoDespacho"
                  checked={metodoDespacho === 'DESPACHO_DOMICILIO'}
                  onChange={() => setMetodoDespacho('DESPACHO_DOMICILIO')}
                />
                <Truck size={22} aria-hidden="true" />
                <span className={styles.optionText}>
                  <strong>Despacho a domicilio</strong>
                  <span>Algunas comunas de la Región Metropolitana</span>
                </span>
              </label>
            </div>

            {metodoDespacho === 'RETIRO_TIENDA' ? (
              <label className="field">
                Farmacia
                <select className="input" value={farmacia} onChange={(e) => setFarmacia(e.target.value)}>
                  {FARMACIAS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="field">
                Dirección de despacho
                <input
                  className="input"
                  autoComplete="street-address"
                  placeholder="Calle, número y comuna"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  aria-invalid={!!errors.direccion}
                />
                {errors.direccion && <span className="field-error">{errors.direccion}</span>}
              </label>
            )}
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend>Receta médica</legend>
            {archivo ? (
              <div className={styles.fileChosen}>
                <FileText size={22} aria-hidden="true" />
                <span className={styles.fileName}>{archivo.name}</span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={handleRemoveFile}
                  aria-label="Quitar archivo"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <label
                className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <FileUp size={28} aria-hidden="true" />
                <span>
                  <strong>Elige un archivo</strong> o arrástralo aquí
                </span>
                <span className="field-hint">Foto (JPG, PNG, WEBP) o PDF. Las fotos grandes se ajustan solas.</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => selectFile(e.target.files?.[0])}
                  className="visually-hidden"
                />
              </label>
            )}
            {errors.archivo && <span className="field-error">{errors.archivo}</span>}
            <p className="field-hint">
              Adjunta una receta por solicitud. Si tienes más de una, envía cada una por separado.
            </p>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend>Comentarios</legend>
            <label className="field">
              <span className="visually-hidden">Comentarios para la farmacia</span>
              <textarea
                className="input"
                rows={3}
                maxLength={MAX_COMENTARIOS}
                placeholder="Algo que la farmacia deba saber (opcional)"
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
              />
              <span className={`field-hint ${styles.count}`}>
                {comentarios.length}/{MAX_COMENTARIOS}
              </span>
            </label>
          </fieldset>

          <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
            {enviando ? 'Enviando receta…' : 'Enviar receta'}
          </button>

          {envioError && (
            <p className="alert alert-error" role="alert">
              {envioError}
            </p>
          )}

          {confirmado && (
            <p className="alert alert-success" role="status">
              Receta enviada. Puedes seguir su avance en la lista.
            </p>
          )}
        </form>

        <section className={styles.history} aria-labelledby="historial-title">
          <h2 id="historial-title" className={styles.formTitle}>
            Enviadas
            {misRecetas.length > 0 && <span className={styles.count}> {misRecetas.length}</span>}
          </h2>
          {loading && <p className={styles.muted}>Cargando tus recetas…</p>}
          {!loading && misRecetas.length === 0 && (
            <p className={styles.muted}>
              Todavía no has enviado recetas. Cuando envíes una, aquí verás en qué paso va.
            </p>
          )}
          <ul className={styles.historyList}>
            {misRecetas.map((receta) => (
              <li key={receta.id} className={styles.historyItem}>
                <div className={styles.historyHead}>
                  <span className={styles.historyDate}>{formatDate(receta.fechaCreacion)}</span>
                  <StatusBadge status={receta.status} />
                </div>
                <StatusTrack status={receta.status} motivo={lastNote(receta, 'RECHAZADA')} />
                <dl className={styles.historyFacts}>
                  {receta.farmacia && (
                    <div>
                      <dt>Retiro</dt>
                      <dd>{receta.farmacia}</dd>
                    </div>
                  )}
                  {receta.direccion && (
                    <div>
                      <dt>Despacho</dt>
                      <dd>{receta.direccion}</dd>
                    </div>
                  )}
                  {receta.archivoNombre && (
                    <div>
                      <dt>Archivo</dt>
                      <dd>{receta.archivoNombre}</dd>
                    </div>
                  )}
                </dl>
                {receta.comentarios && <p className={styles.comment}>{receta.comentarios}</p>}
                {getHistorial(receta).length > 1 && (
                  <details className={styles.details}>
                    <summary>Ver avisos de la farmacia</summary>
                    <RecetaTimeline receta={receta} />
                  </details>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
