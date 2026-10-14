import styles from './Skeleton.module.css';

// Bloques grises con brillo que ocupan el lugar del contenido mientras carga.
// Así la página no "salta" cuando llegan los datos.
export default function Skeleton({ filas = 3, alto = 88, etiqueta = 'Cargando…', columnas = 1 }) {
  return (
    <div
      className={styles.lista}
      style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}
      role="status"
      aria-live="polite"
    >
      <span className="visually-hidden">{etiqueta}</span>
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className={styles.bloque} style={{ height: alto }} aria-hidden="true">
          <span className={styles.linea} style={{ width: '45%' }} />
          <span className={styles.linea} style={{ width: '70%' }} />
          {alto >= 110 && <span className={styles.linea} style={{ width: '30%' }} />}
        </div>
      ))}
    </div>
  );
}
