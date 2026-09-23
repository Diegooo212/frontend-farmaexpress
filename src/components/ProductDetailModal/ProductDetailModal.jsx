import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import Modal from '../Modal/Modal';
import MedBox from '../MedBox/MedBox';
import { useCart } from '../../context/CartContext';
import { formatCLP } from '../../utils/format';
import { getStockLevel, stockLabel } from '../../utils/stock';
import styles from './ProductDetailModal.module.css';

export default function ProductDetailModal({ medicamento, isOpen, onClose }) {
  const { addItem, items, canUseCart } = useCart();
  const [cantidad, setCantidad] = useState(1);
  const [added, setAdded] = useState(false);

  if (!medicamento) return null;

  const cartQty = items.find((i) => i.id === medicamento.id)?.cantidad || 0;
  const available = medicamento.stock - cartQty;
  const level = getStockLevel(medicamento.stock);
  const isOutOfStock = level === 'out';
  const allInCart = !isOutOfStock && available <= 0;

  const handleAdd = () => {
    if (available <= 0) return;
    addItem(medicamento, Math.min(cantidad, available));
    setCantidad(1);
    setAdded(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={medicamento.nombre} wide>
      <div className={styles.layout}>
        <MedBox medicamento={medicamento} size="lg" shape="tall" className={styles.box} />

        <div className={styles.details}>
          <p className={styles.price}>{formatCLP(medicamento.precio)}</p>
          <dl className={styles.facts}>
            <div>
              <dt>Stock</dt>
              <dd className={styles[level]}>
                {stockLabel(medicamento.stock)}
              </dd>
            </div>
            <div>
              <dt>Código</dt>
              <dd>{medicamento.sku}</dd>
            </div>
            {cartQty > 0 && (
              <div>
                <dt>En tu carrito</dt>
                <dd>{cartQty}</dd>
              </div>
            )}
          </dl>

          {!canUseCart && !isOutOfStock && (
            <Link to="/login" state={{ from: { pathname: '/', hash: '#catalogo' } }} className="btn btn-primary">
              Inicia sesión para comprar
            </Link>
          )}

          {canUseCart && !isOutOfStock && !allInCart && (
            <div className={styles.buy}>
              <div className={styles.stepper}>
                <button
                  type="button"
                  onClick={() => setCantidad((q) => Math.max(1, q - 1))}
                  aria-label="Una unidad menos"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  min="1"
                  max={available}
                  value={cantidad}
                  aria-label="Cantidad"
                  onChange={(e) =>
                    setCantidad(Math.min(available, Math.max(1, Number(e.target.value))))
                  }
                />
                <button
                  type="button"
                  onClick={() => setCantidad((q) => Math.min(available, q + 1))}
                  aria-label="Una unidad más"
                >
                  <Plus size={16} />
                </button>
              </div>
              <button className="btn btn-primary" onClick={handleAdd}>
                Agregar {formatCLP(medicamento.precio * cantidad)}
              </button>
            </div>
          )}

          {allInCart && (
            <p className="alert alert-info">Ya tienes en el carrito todo el stock disponible.</p>
          )}
          {added && !allInCart && (
            <p className="alert alert-success" role="status">
              Agregado al carrito.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
