import { useState } from 'react';
import Modal from '../Modal/Modal';
import { useCart } from '../../context/CartContext';
import styles from './ProductDetailModal.module.css';

export default function ProductDetailModal({ medicamento, isOpen, onClose }) {
  const { addItem, items } = useCart();
  const [cantidad, setCantidad] = useState(1);
  const [added, setAdded] = useState(false);

  if (!medicamento) return null;

  const cartQty = items.find((i) => i.id === medicamento.id)?.cantidad || 0;
  const available = medicamento.stock - cartQty;
  const isOutOfStock = medicamento.stock === 0;
  const allInCart = !isOutOfStock && available <= 0;

  const handleAdd = () => {
    if (available <= 0) return;
    addItem(medicamento, Math.min(cantidad, available));
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const addLabel = added
    ? 'Agregado ✓'
    : isOutOfStock
    ? 'Sin stock'
    : allInCart
    ? 'Ya tienes todo el stock en el carrito'
    : 'Agregar al carrito';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={medicamento.nombre}>
      <div className={styles.imagePlaceholder}>💊</div>
      <span className={styles.sku}>SKU: {medicamento.sku}</span>
      <p className={styles.price}>${medicamento.precio}</p>
      <p className={styles.stock}>
        {isOutOfStock ? 'Sin stock disponible' : `${medicamento.stock} unidades disponibles`}
      </p>

      {!isOutOfStock && !allInCart && (
        <div className={styles.qtyRow}>
          <label htmlFor="detail-qty">Cantidad</label>
          <div className={styles.qtyControls}>
            <button type="button" onClick={() => setCantidad((q) => Math.max(1, q - 1))}>
              -
            </button>
            <input
              id="detail-qty"
              type="number"
              min="1"
              max={available}
              value={cantidad}
              onChange={(e) =>
                setCantidad(Math.min(available, Math.max(1, Number(e.target.value))))
              }
            />
            <button
              type="button"
              onClick={() => setCantidad((q) => Math.min(available, q + 1))}
            >
              +
            </button>
          </div>
        </div>
      )}

      <button className={styles.addButton} onClick={handleAdd} disabled={isOutOfStock || allInCart}>
        {addLabel}
      </button>
    </Modal>
  );
}