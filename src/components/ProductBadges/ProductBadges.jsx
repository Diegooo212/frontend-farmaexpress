import { BadgeCheck, FileText } from 'lucide-react';
import styles from './ProductBadges.module.css';

// Distintivos del producto: venta bajo receta y bioequivalencia (como en las farmacias chilenas).
export default function ProductBadges({ medicamento, compacto = false }) {
  if (!medicamento?.requiereReceta && !medicamento?.bioequivalente) return null;
  return (
    <div className={styles.badges}>
      {medicamento.requiereReceta && (
        <span className={`${styles.badge} ${styles.receta}`} title="Necesitas una receta médica validada para comprarlo">
          <FileText size={13} aria-hidden="true" /> {compacto ? 'Receta' : 'Requiere receta'}
        </span>
      )}
      {medicamento.bioequivalente && (
        <span className={`${styles.badge} ${styles.bio}`} title="Bioequivalente certificado: misma eficacia que el original">
          <BadgeCheck size={13} aria-hidden="true" /> Bioequivalente
        </span>
      )}
    </div>
  );
}
