import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Pencil, Trash2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useCatalog } from '../../context/CatalogContext';
import { formatCLP } from '../../utils/format';
import { apiErrorMessage } from '../../api/httpClient';
import { getStockLevel, limitePorPedido, stockLabel, stockTotal } from '../../utils/stock';
import ProductImage from '../ProductImage/ProductImage';
import ProductBadges from '../ProductBadges/ProductBadges';
import ProductForm from '../ProductForm/ProductForm';
import FavoriteButton from '../FavoriteButton/FavoriteButton';
import { volarAlCarrito } from '../../utils/volarAlCarrito';
import styles from './ProductCard.module.css';

export default function ProductCard({ medicamento, isAdmin, onSave, onDelete, onViewDetail }) {
  const { addItem, updateQty, items, canUseCart } = useCart();
  const { categorias } = useCatalog();
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const level = getStockLevel(medicamento.stock);
  const cartQty = items.find((i) => i.id === medicamento.id)?.cantidad || 0;
  const canAddMore = cartQty < medicamento.stock;
  const mediaRef = useRef(null);

  const agregar = () => {
    addItem(medicamento, 1);
    volarAlCarrito(mediaRef.current?.querySelector('button'));
  };


  const handleDelete = async () => {
    setEliminando(true);
    setSaveError('');
    try {
      await onDelete(medicamento.id);
      // Al recargar el catálogo la tarjeta desaparece.
    } catch (err) {
      setSaveError(apiErrorMessage(err, 'No se pudo eliminar el medicamento.'));
      setEliminando(false);
      setConfirmando(false);
    }
  };


  return (
    <article className={styles.card}>
      <div className={styles.media} ref={mediaRef}>
        <button
          className={styles.boxButton}
          onClick={() => onViewDetail(medicamento)}
          aria-label={`Ver detalle de ${medicamento.nombre}`}
        >
          <ProductImage medicamento={medicamento} />
        </button>
        {!isAdmin && <FavoriteButton medicamento={medicamento} className={styles.favorito} />}
      </div>

      <div className={styles.info}>
        <ProductBadges medicamento={medicamento} compacto />
        <h3 className={styles.name}>{medicamento.nombre}</h3>
        {medicamento.presentacion && <p className={styles.presentacion}>{medicamento.presentacion}</p>}
        <div className={styles.meta}>
          <span className={styles.price}>{formatCLP(medicamento.precio)}</span>
          <span className={`${styles.stock} ${styles[level]}`}>
            {medicamento.stock === 0 ? stockLabel(0) : stockLabel(stockTotal(medicamento))}
          </span>
        </div>
        {limitePorPedido(medicamento) && <span className={styles.limite}>{limitePorPedido(medicamento)}</span>}
      </div>

      {isAdmin ? (
        confirmando ? (
            <div className={styles.confirmar} role="alert">
              <p>¿Eliminar {medicamento.nombre} del catálogo? Esta acción no se puede deshacer.</p>
              <div className={styles.editActions}>
                <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} disabled={eliminando}>
                  {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmando(false)} disabled={eliminando}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.adminActions}>
              <ProductForm
                key={isEditing ? 'abierto' : 'cerrado'}
                isOpen={isEditing}
                onClose={() => setIsEditing(false)}
                medicamento={medicamento}
                categorias={categorias}
                onGuardar={(cambios) => onSave(medicamento.id, cambios)}
              />
              <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(true)}>
                <Pencil size={15} /> Editar
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => setConfirmando(true)}>
                <Trash2 size={15} /> Eliminar
              </button>
              {saveError && (
                <p className={`alert alert-error ${styles.fila}`} role="alert">
                  {saveError}
                </p>
              )}
            </div>
          )
      ) : !canUseCart && level !== 'out' ? (
        <Link to="/login" state={{ from: '/catalogo' }} className="btn btn-outline btn-sm">
          Inicia sesión para comprar
        </Link>
      ) : cartQty > 0 ? (
        <div className={styles.inCart}>
          <div className={styles.stepper}>
            <button
              onClick={() => updateQty(medicamento.id, cartQty - 1, medicamento.stock)}
              aria-label={`Quitar una unidad de ${medicamento.nombre}`}
            >
              <Minus size={16} />
            </button>
            <span aria-live="polite">{cartQty} en el carrito</span>
            <button
              onClick={agregar}
              disabled={!canAddMore}
              aria-label={`Agregar una unidad de ${medicamento.nombre}`}
              title={!canAddMore ? 'No queda más stock disponible' : undefined}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn btn-primary btn-sm"
          disabled={level === 'out'}
          onClick={agregar}
        >
          {level === 'out' ? 'Agotado' : 'Agregar al carrito'}
        </button>
      )}
    </article>
  );
}
