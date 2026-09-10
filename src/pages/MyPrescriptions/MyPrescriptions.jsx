import { useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePrescriptions } from '../../context/PrescriptionsContext';
import { formatRut, isValidRut } from '../../utils/rut';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import styles from './MyPrescriptions.module.css';

const FARMACIAS = ['Farmacia Centro', 'Farmacia Norte', 'Farmacia Sur'];
const MAX_COMENTARIOS = 250;
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

export default function MyPrescriptions() {
  const { user } = useAuth();
  const { recetas, loading, usingMock, createReceta } = usePrescriptions();
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

  const [errors, setErrors] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  const misRecetas = useMemo(
    () => recetas.filter((r) => r.pacienteNombre === nombre),
    [recetas, nombre]
  );

  const handleRutChange = (e) => {
    setRut(formatRut(e.target.value));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setErrors((prev) => ({ ...prev, archivo: 'Solo se aceptan archivos JPG, PNG o PDF.' }));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({ ...prev, archivo: 'El archivo no puede superar los 3 MB.' }));
      return;
    }

    setErrors((prev) => ({ ...prev, archivo: undefined }));
    setArchivo(file);
  };

  const handleRemoveFile = () => {
    setArchivo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = () => {
    const newErrors = {};
    if (!isValidRut(rut)) newErrors.rut = 'Ingresa un RUT válido (con dígito verificador).';
    if (metodoDespacho === 'DESPACHO_DOMICILIO' && !direccion.trim()) {
      newErrors.direccion = 'Ingresa la dirección de despacho.';
    }
    if (!archivo) newErrors.archivo = 'Debes adjuntar tu receta médica.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setEnviando(true);
    await createReceta({
      pacienteNombre: nombre,
      rut,
      email,
      telefono,
      tiempoEntrega: 'NORMAL',
      metodoDespacho,
      farmacia: metodoDespacho === 'RETIRO_TIENDA' ? farmacia : undefined,
      direccion: metodoDespacho === 'DESPACHO_DOMICILIO' ? direccion : undefined,
      comentarios,
      archivoNombre: archivo?.name,
    });
    setEnviando(false);
    setComentarios('');
    handleRemoveFile();
    setConfirmado(true);
    setTimeout(() => setConfirmado(false), 3000);
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Solicita tu receta</h1>
        <p className={styles.subtitle}>
          Cotiza tu receta magistral o médica y retírala en la farmacia que elijas, o recíbela en
          tu domicilio.
        </p>
      </div>

      {usingMock && (
        <p className={styles.mockNotice}>
          Mostrando datos de ejemplo — prescriptions-svc todavía no está desplegado.
        </p>
      )}

      <div className={styles.grid}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <h2 className={styles.formTitle}>Nueva solicitud</h2>

          <label className={styles.label}>
            Nombre completo
            <input
              className={styles.input}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </label>

          <label className={styles.label}>
            RUT
            <input
              className={styles.input}
              value={rut}
              onChange={handleRutChange}
              placeholder="12.345.678-9"
              maxLength={12}
              required
            />
            {errors.rut && <span className={styles.errorText}>{errors.rut}</span>}
          </label>

          <label className={styles.label}>
            Correo electrónico
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className={styles.label}>
            Teléfono
            <input
              className={styles.input}
              type="tel"
              placeholder="+56 9 1234 5678"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              required
            />
          </label>

          <div className={styles.divider} />

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Tiempo de entrega:</h3>
            <label className={styles.radioOption}>
              <input type="radio" checked readOnly />
              Normal, máximo 6 días hábiles
            </label>
          </div>

          <div className={styles.divider} />

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Método de despacho:</h3>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="metodoDespacho"
                checked={metodoDespacho === 'RETIRO_TIENDA'}
                onChange={() => setMetodoDespacho('RETIRO_TIENDA')}
              />
              Retiro en tienda
            </label>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="metodoDespacho"
                checked={metodoDespacho === 'DESPACHO_DOMICILIO'}
                onChange={() => setMetodoDespacho('DESPACHO_DOMICILIO')}
              />
              Despacho a domicilio
              <span className={styles.hint}>
                {' '}
                | Solo para algunas comunas de la Región Metropolitana
              </span>
            </label>

            {metodoDespacho === 'RETIRO_TIENDA' ? (
              <select
                className={styles.input}
                value={farmacia}
                onChange={(e) => setFarmacia(e.target.value)}
              >
                {FARMACIAS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input
                  className={styles.input}
                  placeholder="Dirección de despacho"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                />
                {errors.direccion && <span className={styles.errorText}>{errors.direccion}</span>}
              </>
            )}
          </div>

          <div className={styles.divider} />

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Comentarios:</h3>
            <span className={styles.hint}>Hasta {MAX_COMENTARIOS} carácteres</span>
            <textarea
              className={styles.textarea}
              rows={3}
              maxLength={MAX_COMENTARIOS}
              placeholder="Comentarios"
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
            />
            <span className={styles.charCount}>
              {comentarios.length}/{MAX_COMENTARIOS}
            </span>
          </div>

          <div className={styles.divider} />

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Adjuntar receta:</h3>
            <div className={styles.fileRow}>
              <button
                type="button"
                className={styles.fileButton}
                onClick={() => fileInputRef.current?.click()}
              >
                Subir receta
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileChange}
                className={styles.fileInputHidden}
              />
              <p className={styles.fileHelp}>
                Adjunta una receta médica (máximo 1) en formato JPG, PNG o PDF. El tamaño máximo
                permitido por archivo es de 3 MB. Si tienes dos o más recetas médicas, deberás
                generar una cotización adicional para adjuntar la siguiente receta.
              </p>
            </div>
            {archivo && (
              <div className={styles.filePreview}>
                <span>{archivo.name}</span>
                <button type="button" className={styles.removeFileButton} onClick={handleRemoveFile}>
                  ×
                </button>
              </div>
            )}
            {errors.archivo && <span className={styles.errorText}>{errors.archivo}</span>}
          </div>

          <button type="submit" className={styles.submitButton} disabled={enviando}>
            {enviando ? 'Enviando...' : 'Solicitar receta'}
          </button>

          {confirmado && (
            <p className={styles.success}>¡Solicitud enviada! Puedes seguir su estado más abajo.</p>
          )}
        </form>

        <div className={styles.history}>
          <h2 className={styles.formTitle}>Mis recetas ({misRecetas.length})</h2>
          {loading && <p className={styles.state}>Cargando...</p>}
          {!loading && misRecetas.length === 0 && (
            <p className={styles.empty}>Aún no has solicitado ninguna receta.</p>
          )}
          {misRecetas.map((receta) => (
            <div key={receta.id} className={styles.historyCard}>
              <div className={styles.historyHeader}>
                <span className={styles.historyDate}>{receta.fechaCreacion}</span>
                <StatusBadge status={receta.status} />
              </div>
              {receta.farmacia && (
                <p className={styles.historyDetail}>Retiro en: {receta.farmacia}</p>
              )}
              {receta.direccion && (
                <p className={styles.historyDetail}>Despacho a: {receta.direccion}</p>
              )}
              {receta.archivoNombre && (
                <p className={styles.historyDetail}>Receta adjunta: {receta.archivoNombre}</p>
              )}
              {receta.comentarios && (
                <p className={styles.historyDetail}>{receta.comentarios}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}