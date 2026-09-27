import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Pencil, Trash2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatCLP } from '../../utils/format';
import { apiErrorMessage } from '../../api/httpClient';
import { getStockLevel, stockLabel } from '../../utils/stock';
import MedBox from '../MedBox/MedBox';
import styles from './ProductCard.module.css';

export default function ProductCard({ medicamento, isAdmin, onSave, onDelete, onViewDetail }) {
  const { addItem, updateQty, items, canUseCart } = useCart();
  const [isEditing, setIsEditing] = useState(false);
  const [precio, setPrecio] = useState(medicamento.precio);
  const [stock, setStock] = useState(medicamento.stock);
  const [saveError, setSaveError] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const level = getStockLevel(medicamento.stock);
  const cartQty = items.find((i) => i.id === medicamento.id)?.cantidad || 0;
  const canAddMore = cartQty < medicamento.stock;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError('');
    try {
      await onSave(medicamento.id, { precio: Number(precio), stock: Number(stock) });
      setIsEditing(false);
    } catch (err) {
      setSaveError(apiErrorMessage(err, 'No se pudieron guardar los cambios.'));
    }
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

  const handleCancel = () => {
    setPrecio(medicamento.precio);
    setStock(medicamento.stock);
    setIsEditing(false);
  };

  return (
    <article className={styles.card}>
      <button
        className={styles.boxButton}
        onClick={() => onViewDetail(medicamento)}
        aria-label={`Ver detalle de ${medicamento.nombre}`}
      >
        <MedBox medicamento={medicamento} />
      </button>

      <div className={styles.info}>
        <h3 className={styles.name}>{medicamento.nombre}</h3>
        <div className={styles.meta}>
          <span className={styles.price}>{formatCLP(medicamento.precio)}</span>
          <span className={`${styles.stock} ${styles[level]}`}>{stockLabel(medicamento.stock)}</span>
        </div>
      </div>

      {isAdmin ? (
        isEditing ? (
          <form className={styles.editForm} onSubmit={handleSave}>
            <label className="field">
              Precio
              <input
                className="input"
                type="number"
                min="0"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                required
              />
            </label>
            <label className="field">
              Stock
              <input
                className="input"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                required
              />
            </label>
            {saveError && (
              <p className={`alert alert-error ${styles.editActions}`} role="alert">
                {saveError}
              </p>
            )}
            <div className={styles.editActions}>
              <button type="submit" className="btn btn-primary btn-sm">
                Guardar
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleCancel}>
                Cancelar
              </button>
            </div>
          </form>
        ) : (
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
              onClick={() => addItem(medicamento, 1)}
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
          onClick={() => addItem(medicamento, 1)}
        >
          {level === 'out' ? 'Agotado' : 'Agregar al carrito'}
        </button>
      )}
    </article>
  );
}
