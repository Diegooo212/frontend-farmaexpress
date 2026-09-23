import { useEffect, useState } from 'react';
import { ExternalLink, FileWarning, ZoomIn, ZoomOut } from 'lucide-react';
import { getRecetaFile } from '../../utils/fileStore';
import { getPrescriptionFile } from '../../api/prescriptionsApi';
import styles from './RecetaFile.module.css';

function isPdf(tipo, nombre) {
  return tipo === 'application/pdf' || /\.pdf$/i.test(nombre || '');
}

// Muestra la receta adjunta (imagen o PDF) para que el químico farmacéutico la revise.
// Usar con key={receta.id} para que el estado se reinicie al cambiar de receta.
export default function RecetaFile({ receta }) {
  const remoteUrl = receta.archivoUrl && !receta.archivoUrl.startsWith('data:') ? receta.archivoUrl : null;
  const [file, setFile] = useState({ status: 'loading' });
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (remoteUrl) return undefined;
    let objectUrl;
    let cancelled = false;

    const resolve = async () => {
      // Receta guardada en el backend: se descarga con el token del usuario.
      if (receta.tieneArchivo) {
        const blob = await getPrescriptionFile(receta.id);
        return { blob, tipo: receta.archivoTipo || blob.type, nombre: receta.archivoNombre };
      }
      const dataUrl = receta.archivoBase64 || receta.archivoUrl;
      if (dataUrl) {
        const blob = await fetch(dataUrl).then((res) => res.blob());
        return { blob, tipo: receta.archivoTipo || blob.type, nombre: receta.archivoNombre };
      }
      return getRecetaFile(receta.id);
    };

    resolve()
      .then((found) => {
        if (cancelled) return;
        if (!found) {
          setFile({ status: 'missing' });
          return;
        }
        objectUrl = URL.createObjectURL(found.blob);
        setFile({ status: 'ready', url: objectUrl, tipo: found.tipo, nombre: found.nombre });
      })
      .catch(() => {
        if (!cancelled) setFile({ status: 'missing' });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [receta.id, receta.tieneArchivo, receta.archivoBase64, receta.archivoUrl, receta.archivoTipo, receta.archivoNombre, remoteUrl]);

  const current = remoteUrl
    ? { status: 'ready', url: remoteUrl, tipo: receta.archivoTipo, nombre: receta.archivoNombre }
    : file;

  if (current.status === 'loading') {
    return <div className={`${styles.frame} ${styles.placeholder}`}>Cargando la receta adjunta…</div>;
  }

  if (current.status === 'missing') {
    return (
      <div className={`${styles.frame} ${styles.missing}`}>
        <FileWarning size={28} aria-hidden="true" />
        <strong>No hay archivo para revisar</strong>
        <span>
          {receta.tieneArchivo
            ? `No pudimos descargar "${receta.archivoNombre}" desde el servidor. Cierra y vuelve a abrir la receta para intentarlo de nuevo.`
            : receta.archivoNombre
            ? `El paciente adjuntó "${receta.archivoNombre}", pero el archivo no está en este navegador. Sin backend conectado, los archivos quedan guardados solo en el navegador donde se envió la receta. Ábrela ahí o pide al paciente que la envíe de nuevo.`
            : 'El paciente no adjuntó ninguna receta.'}
        </span>
      </div>
    );
  }

  const pdf = isPdf(current.tipo, current.nombre);

  return (
    <div className={styles.viewer}>
      <div className={styles.toolbar}>
        <span className={styles.name}>{current.nombre || 'Receta adjunta'}</span>
        {!pdf && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setZoomed((z) => !z)}
            aria-pressed={zoomed}
          >
            {zoomed ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
            {zoomed ? 'Ajustar' : 'Ampliar'}
          </button>
        )}
        <a className="btn btn-ghost btn-sm" href={current.url} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={16} /> Abrir
        </a>
      </div>

      <div className={`${styles.frame} ${zoomed ? styles.zoomed : ''}`}>
        {pdf ? (
          <iframe className={styles.pdf} src={current.url} title={`Receta de ${receta.pacienteNombre}`} />
        ) : (
          <img
            className={styles.image}
            src={current.url}
            alt={`Receta médica adjunta por ${receta.pacienteNombre}`}
            onClick={() => setZoomed((z) => !z)}
          />
        )}
      </div>
    </div>
  );
}
