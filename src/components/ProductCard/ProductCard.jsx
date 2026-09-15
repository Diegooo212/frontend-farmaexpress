import { useState } from 'react';
import { useCart } from '../../context/CartContext';
import styles from './ProductCard.module.css';

function getStockLevel(stock) {
  if (stock === 0) return 'out';
  if (stock <= 10) return 'low';
  return 'in';
}

const STOCK_LABEL = {
  out: 'Sin stock',
  low: 'Stock bajo',
  in: 'En stock',
};

export default function ProductCard({ medicamento, isAdmin, onSave, onViewDetail }) {
  const { addItem, items } = useCart();
  const [isEditing, setIsEditing] = useState(false);
  const [precio, setPrecio] = useState(medicamento.precio);
  const [stock, setStock] = useState(medicamento.stock);
  const [added, setAdded] = useState(false);

  const stockLevel = getStockLevel(medicamento.stock);
  const isOutOfStock = stockLevel === 'out';

  const cartQty = items.find((i) => i.id === medicamento.id)?.cantidad || 0;
  const available = medicamento.stock - cartQty;
  const allInCart = !isOutOfStock && available <= 0;

  const handleSave = (e) => {
    e.stopPropagation();
    onSave(medicamento.id, { precio: Number(precio), stock: Number(stock) });
    setIsEditing(false);
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setPrecio(medicamento.precio);
    setStock(medicamento.stock);
    setIsEditing(false);
  };

  const handleAgregar = (e) => {
    e.stopPropagation();
    if (available <= 0) return;
    addItem(medicamento, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const buyLabel = added
    ? 'Agregado ✓'
    : isOutOfStock
    ? 'Sin stock'
    : allInCart
    ? 'Todo en el carrito'
    : 'Agregar al carrito';

  return (
    <div className={styles.card} onClick={() => onViewDetail(medicamento)}>
      <div className={styles.imagePlaceholder}>💊</div>

      <div className={styles.info}>
        <span className={styles.sku}>{medicamento.sku}</span>
        <h3 className={styles.name}>{medicamento.nombre}</h3>

        {isEditing ? (
          <div className={styles.editRow} onClick={(e) => e.stopPropagation()}>
            <input
              className={styles.editInput}
              type="number"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
            <input
              className={styles.editInput}
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>
        ) : (
          <div className={styles.priceRow}>
            <span className={styles.price}>${medicamento.precio}</span>
            <span className={`${styles.stockBadge} ${styles[stockLevel]}`}>
              {STOCK_LABEL[stockLevel]} ({medicamento.stock})
            </span>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {isAdmin ? (
          isEditing ? (
            <>
              <button className={styles.saveButton} onClick={handleSave}>
                Guardar
              </button>
              <button className={styles.cancelButton} onClick={handleCancel}>
                Cancelar
              </button>
            </>
          ) : (
            <button className={styles.editButton} onClick={handleEditClick}>
              Editar
            </button>
          )
        ) : (
          <button
            className={styles.buyButton}
            disabled={isOutOfStock || allInCart}
            onClick={handleAgregar}
          >
            {buyLabel}
          </button>
        )}
      </div>
    </div>
  );
}