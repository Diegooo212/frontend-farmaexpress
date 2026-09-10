import styles from './Drawer.module.css';

export default function Drawer({ isOpen, onClose, title, children }) {
  return (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`}
        onClick={onClose}
      />
      <aside className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </aside>
    </>
  );
}