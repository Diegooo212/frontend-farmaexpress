import { useState } from 'react';
import MedBox from '../MedBox/MedBox';
import styles from './ProductImage.module.css';

// Foto del producto si el Admin cargó una URL; si no hay o no carga, la caja dibujada (MedBox).
export default function ProductImage({ medicamento, size = 'md', shape = 'standard', className = '' }) {
  const [fallo, setFallo] = useState(false);
  if (!medicamento?.imagenUrl || fallo) {
    return <MedBox medicamento={medicamento} size={size} shape={shape} className={className} />;
  }
  return (
    <div className={`${styles.foto} ${styles[size]} ${className}`}>
      <img src={medicamento.imagenUrl} alt="" loading="lazy" onError={() => setFallo(true)} />
    </div>
  );
}
