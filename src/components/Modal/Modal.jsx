import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useDialog } from '../../hooks/useDialog';
import styles from './Modal.module.css';

export default function Modal({ isOpen, onClose, title, children, wide = false }) {
  useDialog(isOpen, onClose);

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${wide ? styles.wide : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar" autoFocus>
            <X size={22} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
