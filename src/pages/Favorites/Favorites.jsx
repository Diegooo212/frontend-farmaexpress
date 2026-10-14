import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useCatalog } from '../../context/CatalogContext';
import { useFavorites } from '../../context/FavoritesContext';
import ProductCard from '../../components/ProductCard/ProductCard';
import ProductDetailModal from '../../components/ProductDetailModal/ProductDetailModal';
import Skeleton from '../../components/Skeleton/Skeleton';
import styles from './Favorites.module.css';

export default function Favorites() {
  const { medicamentos, loading } = useCatalog();
  const { favoritos } = useFavorites();
  const [detalle, setDetalle] = useState(null);

  // En el orden en que se marcaron; los que ya no están en el catálogo se omiten.
  const productos = favoritos.map((id) => medicamentos.find((m) => m.id === id)).filter(Boolean);

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>Favoritos</h1>
      <p className={styles.lead}>Los productos que marcaste con el corazón, para comprarlos de nuevo rápido.</p>

      {loading && medicamentos.length === 0 ? (
        <Skeleton filas={3} alto={280} columnas={3} etiqueta="Cargando tus favoritos…" />
      ) : productos.length === 0 ? (
        <div className={styles.vacio}>
          <Heart size={40} aria-hidden="true" />
          <p>Aún no tienes favoritos. Toca el corazón de un producto para guardarlo aquí.</p>
          <Link to="/catalogo" className="btn btn-primary">
            Ver catálogo
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {productos.map((m) => (
            <ProductCard key={m.id} medicamento={m} onViewDetail={setDetalle} />
          ))}
        </div>
      )}

      <ProductDetailModal medicamento={detalle} isOpen={Boolean(detalle)} onClose={() => setDetalle(null)} />
    </section>
  );
}
