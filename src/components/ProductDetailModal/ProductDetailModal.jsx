import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, MapPin, Minus, Plus, Truck } from 'lucide-react';
import Modal from '../Modal/Modal';
import ProductImage from '../ProductImage/ProductImage';
import ProductBadges from '../ProductBadges/ProductBadges';
import FavoriteButton from '../FavoriteButton/FavoriteButton';
import { useCart } from '../../context/CartContext';
import { formatCLP } from '../../utils/format';
import { getDisponibilidad } from '../../api/inventoryApi';
import { getStockLevel, limitePorPedido, stockLabel, stockTotal, unidadesLabel } from '../../utils/stock';
import { volarAlCarrito } from '../../utils/volarAlCarrito';
import styles from './ProductDetailModal.module.css';

export default function ProductDetailModal({ medicamento, isOpen, onClose }) {
  const { addItem, items, canUseCart, abrirCarrito } = useCart();
  const [cantidad, setCantidad] = useState(1);
  const [added, setAdded] = useState(false);
  const layoutRef = useRef(null);

  if (!medicamento) return null;

  const cartQty = items.find((i) => i.id === medicamento.id)?.cantidad || 0;
  const available = medicamento.stock - cartQty;
  const level = getStockLevel(medicamento.stock);
  const isOutOfStock = level === 'out';
  const allInCart = !isOutOfStock && available <= 0;

  const handleAdd = () => {
    if (available <= 0) return;
    addItem(medicamento, Math.min(cantidad, available), { silencioso: true });
    volarAlCarrito(layoutRef.current?.firstElementChild);
    setCantidad(1);
    setAdded(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={medicamento.nombre} wide>
      <div className={styles.layout} ref={layoutRef}>
        <ProductImage medicamento={medicamento} size="lg" shape="tall" className={styles.box} />

        <div className={styles.details}>
          {medicamento.categoria && (
            <Link to={`/catalogo?categoria=${medicamento.categoriaSlug}`} className={styles.categoria} onClick={onClose}>
              {medicamento.categoria}
            </Link>
          )}
          <div className={styles.badgesFila}>
            <ProductBadges medicamento={medicamento} />
            <FavoriteButton medicamento={medicamento} />
          </div>
          {medicamento.presentacion && <p className={styles.presentacion}>{medicamento.presentacion}</p>}
          <p className={styles.price}>{formatCLP(medicamento.precio)}</p>

          {medicamento.requiereReceta && (
            <p className={styles.avisoReceta}>
              <FileText size={18} aria-hidden="true" />
              <span>
                <strong>Venta bajo receta médica.</strong> Al pagar te pediremos una receta validada por nuestro químico
                farmacéutico. ¿Aún no la envías?{' '}
                <Link to="/mis-recetas" onClick={onClose}>
                  Envía tu receta
                </Link>
                .
              </span>
            </p>
          )}
          <dl className={styles.facts}>
            <div>
              <dt>Stock</dt>
              <dd className={styles[level]}>
                {medicamento.stock === 0 ? stockLabel(0) : stockLabel(stockTotal(medicamento))}
                {limitePorPedido(medicamento) && <small className={styles.limite}>{limitePorPedido(medicamento)}</small>}
              </dd>
            </div>
            {medicamento.principioActivo && (
              <div>
                <dt>Principio activo</dt>
                <dd>{medicamento.principioActivo}</dd>
              </div>
            )}
            {medicamento.laboratorio && (
              <div>
                <dt>Laboratorio</dt>
                <dd>{medicamento.laboratorio}</dd>
              </div>
            )}
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
            <Link to="/login" state={{ from: '/catalogo' }} className="btn btn-primary">
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
            <p className={`alert alert-success ${styles.agregado}`} role="status">
              Agregado al carrito.
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  onClose();
                  abrirCarrito();
                }}
              >
                Ver carrito
              </button>
            </p>
          )}

          {medicamento.descripcion && (
            <section className={styles.descripcion} aria-label="Descripción">
              <h3>Para qué sirve</h3>
              <p>{medicamento.descripcion}</p>
              <p className={styles.legal}>
                Ante cualquier duda, consulta a tu médico o químico farmacéutico. Lee las instrucciones del envase.
              </p>
            </section>
          )}

          <DisponibilidadFarmacias medicamentoId={medicamento.id} />
        </div>
      </div>
    </Modal>
  );
}

// Stock vendible (lotes no vencidos) en cada farmacia y en el almacén central, como en las tiendas
// que muestran "disponible para retiro en…".
function DisponibilidadFarmacias({ medicamentoId }) {
  const [sucursales, setSucursales] = useState(null);

  useEffect(() => {
    let cancelado = false;
    getDisponibilidad(medicamentoId)
      .then((d) => !cancelado && setSucursales(d))
      .catch(() => !cancelado && setSucursales([]));
    return () => {
      cancelado = true;
    };
  }, [medicamentoId]);

  if (!sucursales || sucursales.length === 0) return null;

  return (
    <section className={styles.disponibilidad} aria-label="Disponibilidad por farmacia">
      <h3>Disponibilidad</h3>
      <ul>
        {sucursales.map((s) => (
          <li key={s.sucursalId}>
            {s.tipo === 'CENTRAL' ? <Truck size={16} aria-hidden="true" /> : <MapPin size={16} aria-hidden="true" />}
            <span>{s.tipo === 'CENTRAL' ? 'Despacho a domicilio' : `Retiro en ${s.sucursal}`}</span>
            <strong className={s.disponible > 0 ? styles.hay : styles.noHay}>
              {unidadesLabel(s.disponible)}
            </strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
