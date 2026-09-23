import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useDialog } from '../../hooks/useDialog';
import styles from './Drawer.module.css';

export default function Drawer({ isOpen, onClose, title, children, footer, wide = false }) {
  useDialog(isOpen, onClose);

  // Se monta en <body>: si quedara dentro del header (que usa backdrop-filter),
  // position: fixed se mediría contra el header y el panel quedaría recortado.
  return createPortal(
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`}
        onClick={onClose}
      />
      {/* Contenedor fijo que recorta el panel cerrado: así no ensancha la página */}
      <div className={styles.viewport}>
        <aside
          className={`${styles.drawer} ${wide ? styles.wide : ''} ${isOpen ? styles.drawerOpen : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          inert={!isOpen}
        >
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
              <X size={22} />
            </button>
          </div>
          <div className={styles.body}>{children}</div>
          {footer && <div className={styles.footer}>{footer}</div>}
        </aside>
      </div>
    </>,
    document.body
  );
}
