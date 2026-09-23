import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Minus, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useCatalog } from '../../context/CatalogContext';
import { formatCLP } from '../../utils/format';
import { apiErrorMessage } from '../../api/httpClient';
import Drawer from '../Drawer/Drawer';
import MedBox from '../MedBox/MedBox';
import styles from './CartButton.module.css';

export default function CartButton() {
  const { items, updateQty, removeItem, total, count, checkout } = useCart();
  const { medicamentos } = useCatalog();
  const [isOpen, setIsOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  const handleCheckout = async () => {
    setConfirming(true);
    setError('');
    try {
      const pedido = await checkout();
      setSuccess({ pedido });
    } catch (err) {
      // Por ejemplo, otro cliente compró el último envase: el backend explica qué falta.
      setError(apiErrorMessage(err, 'No pudimos completar la compra.'));
    } finally {
      setConfirming(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSuccess(null);
    setError('');
  };

  const footer =
    items.length > 0 ? (
      <>
        <div className={styles.total}>
          <span>Total</span>
          <span className={styles.totalValue}>{formatCLP(total)}</span>
        </div>
        {error && (
          <p className={`alert alert-error ${styles.checkoutError}`} role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-block" onClick={handleCheckout} disabled={confirming}>
          {confirming ? 'Procesando compra…' : 'Finalizar compra'}
        </button>
      </>
    ) : null;

  return (
    <>
      <button
        className="icon-btn"
        onClick={() => setIsOpen(true)}
        aria-label={count > 0 ? `Carrito, ${count} productos` : 'Carrito'}
      >
        <ShoppingBag size={21} />
        {count > 0 && <span className={styles.badge}>{count}</span>}
      </button>

      <Drawer isOpen={isOpen} onClose={handleClose} title="Tu carrito" footer={footer}>
        {success && (
          <div className={styles.done}>
            <CheckCircle2 size={40} />
            <h3>Compra finalizada</h3>
            <p>
              {success.pedido
                ? `Pedido N° ${success.pedido.id} por ${formatCLP(success.pedido.total)}. El stock ya fue descontado.`
                : 'Tu pedido quedó registrado y el stock ya fue descontado.'}
            </p>
          </div>
        )}

        {!success && items.length === 0 && (
          <div className={styles.empty}>
            <p>Tu carrito está vacío.</p>
            <Link to="/#catalogo" className="btn btn-outline btn-sm" onClick={handleClose}>
              Ver catálogo
            </Link>
          </div>
        )}

        <ul className={styles.list}>
          {items.map((item) => {
            const medicamento = medicamentos.find((m) => m.id === item.id);
            const stock = medicamento?.stock ?? Infinity;
            const atMax = item.cantidad >= stock;

            return (
              <li key={item.id} className={styles.item}>
                <MedBox medicamento={medicamento || item} size="sm" className={styles.thumb} />
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{item.nombre}</span>
                  {medicamento && (
                    <span className={styles.stockNote}>
                      {atMax ? `Tienes todo el stock (${stock})` : `${stock} en stock`}
                    </span>
                  )}
                  <span className={styles.itemPrice}>
                    {formatCLP(item.precio * item.cantidad)}
                    {item.cantidad > 1 && (
                      <span className={styles.unit}> ({formatCLP(item.precio)} c/u)</span>
                    )}
                  </span>
                  <div className={styles.itemControls}>
                    <div className={styles.stepper}>
                      <button
                        onClick={() => updateQty(item.id, item.cantidad - 1, stock)}
                        aria-label={`Quitar una unidad de ${item.nombre}`}
                      >
                        <Minus size={16} />
                      </button>
                      <span aria-live="polite">{item.cantidad}</span>
                      <button
                        onClick={() => updateQty(item.id, item.cantidad + 1, stock)}
                        disabled={atMax}
                        aria-label={`Agregar una unidad de ${item.nombre}`}
                        title={atMax ? 'No queda más stock disponible' : undefined}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button
                      className={styles.remove}
                      onClick={() => removeItem(item.id)}
                      aria-label={`Eliminar ${item.nombre} del carrito`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Drawer>
    </>
  );
}
