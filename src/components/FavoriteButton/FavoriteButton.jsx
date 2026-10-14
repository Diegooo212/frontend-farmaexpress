import { Heart } from 'lucide-react';
import { useFavorites } from '../../context/FavoritesContext';
import styles from './FavoriteButton.module.css';

// Corazón para marcar o quitar un producto de favoritos (solo con sesión iniciada).
export default function FavoriteButton({ medicamento, className = '' }) {
  const { esFavorito, alternar, puedeUsar } = useFavorites();
  if (!puedeUsar) return null;
  const activo = esFavorito(medicamento.id);

  return (
    <button
      type="button"
      className={`${styles.boton} ${activo ? styles.activo : ''} ${className}`}
      onClick={() => alternar(medicamento.id)}
      aria-pressed={activo}
      aria-label={activo ? `Quitar ${medicamento.nombre} de favoritos` : `Agregar ${medicamento.nombre} a favoritos`}
      title={activo ? 'Quitar de favoritos' : 'Agregar a favoritos'}
    >
      <Heart size={19} fill={activo ? 'currentColor' : 'none'} />
    </button>
  );
}
