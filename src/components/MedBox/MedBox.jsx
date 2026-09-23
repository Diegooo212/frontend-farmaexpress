import styles from './MedBox.module.css';

const DOSE_PATTERN = /\s*(\d+(?:[.,]\d+)?\s?(?:mg|mcg|g|ml|ui|%))\s*$/i;
const TONES = 6;

// Separa "Paracetamol 500mg" en nombre y dosis para componer la cara de la caja.
function splitName(nombre = '') {
  const match = nombre.match(DOSE_PATTERN);
  if (!match) return { name: nombre, dose: null };
  return { name: nombre.slice(0, match.index), dose: match[1].replace(/\s/g, ' ') };
}

// Cada producto recibe siempre el mismo color de envase, derivado de su SKU.
function toneFor(medicamento) {
  const key = String(medicamento.sku || medicamento.id || medicamento.nombre);
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % TONES) + 1;
}

export default function MedBox({ medicamento, size = 'md', shape = 'standard', className = '' }) {
  const { name, dose } = splitName(medicamento.nombre);
  const tone = toneFor(medicamento);
  const soldOut = medicamento.stock === 0;

  return (
    <div
      className={`${styles.box} ${styles[size]} ${styles[shape]} ${soldOut ? styles.soldOut : ''} ${className}`}
      style={{ '--tone': `var(--box-${tone})` }}
      aria-hidden="true"
    >
      <span className={styles.name}>{name}</span>
      {dose && <span className={styles.dose}>{dose}</span>}
      <span className={styles.capsule} />
      {soldOut && <span className={styles.stamp}>Agotado</span>}
    </div>
  );
}
