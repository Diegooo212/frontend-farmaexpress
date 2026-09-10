import { useState } from 'react';
import Modal from '../Modal/Modal';
import { useCart } from '../../context/CartContext';
import styles from './ProductDetailModal.module.css';

export default function ProductDetailModal({ medicamento, isOpen, onClose }) {
  const { addItem } = useCart();
  const [cantidad, setCantidad] = useState(1);
  const [added, setAdded] = useState(false);

  if (!medicamento) return null;

  const isOutOfStock = medicamento.stock === 0;

  const handleAdd = () => {
    addItem(medicamento, cantidad);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={medicamento.nombre}>
      <div className={styles.imagePlaceholder}>💊</div>
      <span className={styles.sku}>SKU: {medicamento.sku}</span>
      <p className={styles.price}>${medicamento.precio}</p>
      <p className={styles.stock}>
        {isOutOfStock ? 'Sin stock disponible' : `${medicamento.stock} unidades disponibles`}
      </p>

      {!isOutOfStock && (
        <div className={styles.qtyRow}>
          <label htmlFor="detail-qty">Cantidad</label>
          <div className={styles.qtyControls}>
            <button onClick={() => setCantidad((q) => Math.max(1, q - 1))}>-</button>
            <input
              id="detail-qty"
              type="number"
              min="1"
              max={medicamento.stock}
              value={cantidad}
              onChange={(e) =>
                setCantidad(Math.min(medicamento.stock, Math.max(1, Number(e.target.value))))
              }
            />
            <button onClick={() => setCantidad((q) => Math.min(medicamento.stock, q + 1))}>
              +
            </button>
          </div>
        </div>
      )}

      <button className={styles.addButton} onClick={handleAdd} disabled={isOutOfStock}>
        {added ? 'Agregado ✓' : isOutOfStock ? 'Sin stock' : 'Agregar al carrito'}
      </button>
    </Modal>
  );
}