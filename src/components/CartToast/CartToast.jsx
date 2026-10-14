import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import styles from './CartToast.module.css';

const DURACION = 3500;

// Aviso breve al agregar al carrito, con acceso directo para abrirlo.
export default function CartToast({ aviso, onVerCarrito, onCerrar }) {
  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(onCerrar, DURACION);
    return () => clearTimeout(t);
  }, [aviso, onCerrar]);

  if (!aviso) return null;

  return (
    <div className={styles.toast} role="status" aria-live="polite" key={aviso.key}>
      <CheckCircle2 size={22} className={styles.icono} aria-hidden="true" />
      <p className={styles.texto}>
        <strong>Agregado al carrito</strong>
        <span>
          {aviso.cantidad > 1 ? `${aviso.cantidad} × ` : ''}
          {aviso.nombre}
        </span>
      </p>
      <button type="button" className="btn btn-primary btn-sm" onClick={onVerCarrito}>
        Ver carrito
      </button>
      <button type="button" className="icon-btn" aria-label="Cerrar aviso" onClick={onCerrar}>
        <X size={18} />
      </button>
    </div>
  );
}
