import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useCatalog } from '../../context/CatalogContext';
import { useAuth } from '../../context/AuthContext';
import Drawer from '../Drawer/Drawer';
import styles from './CartButton.module.css';

export default function CartButton() {
  const { items, updateQty, removeItem, total, count, clearCart } = useCart();
  const { purchase } = useCatalog();
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCheckout = async () => {
    if (!isAuthenticated) return;
    setConfirming(true);
    await purchase(items.map((i) => ({ id: i.id, cantidad: i.cantidad })));
    clearCart();
    setConfirming(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  };

  return (
    <>
      <button className={styles.cartButton} onClick={() => setIsOpen(true)} aria-label="Carrito">
        <ShoppingCart size={20} />
        {count > 0 && <span className={styles.badge}>{count}</span>}
      </button>

      <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} title="Tu carrito">
        {items.length === 0 ? (
          <p className={styles.empty}>Tu carrito está vacío.</p>
        ) : (
          <>
            {items.map((item) => (
              <div key={item.id} className={styles.item}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{item.nombre}</span>
                  <span className={styles.itemPrice}>${item.precio} c/u</span>
                </div>
                <div className={styles.qtyControls}>
                  <button onClick={() => updateQty(item.id, item.cantidad - 1)}>-</button>
                  <span>{item.cantidad}</span>
                  <button onClick={() => updateQty(item.id, item.cantidad + 1)}>+</button>
                </div>
                <button className={styles.removeButton} onClick={() => removeItem(item.id)}>
                  ×
                </button>
              </div>
            ))}

            <div className={styles.total}>
              <span>Total</span>
              <span>${total}</span>
            </div>

            {!isAuthenticated && (
              <p className={styles.warning}>Inicia sesión para completar la compra.</p>
            )}

            <button
              className={styles.checkoutButton}
              onClick={handleCheckout}
              disabled={!isAuthenticated || confirming}
            >
              {confirming ? 'Procesando...' : 'Finalizar compra'}
            </button>
          </>
        )}

        {success && <p className={styles.success}>¡Compra realizada con éxito!</p>}
      </Drawer>
    </>
  );
}