import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Minus, Plus, Trash2, Lock } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useCatalog } from '../../context/CatalogContext';
import { formatCLP } from '../../utils/format';
import { cantidadVisible } from '../../utils/stock';
import Drawer from '../Drawer/Drawer';
import ProductImage from '../ProductImage/ProductImage';
import ProductBadges from '../ProductBadges/ProductBadges';
import { EVENTO_LLEGO_AL_CARRITO } from '../../utils/volarAlCarrito';
import styles from './CartButton.module.css';

export default function CartButton() {
  const { items, updateQty, removeItem, total, count, abierto: isOpen, abrirCarrito, cerrarCarrito } = useCart();
  const { medicamentos } = useCatalog();
  const navigate = useNavigate();
  const botonRef = useRef(null);

  // Cuando un producto "aterriza" en el carrito, el ícono rebota.
  useEffect(() => {
    const rebotar = () => {
      const boton = botonRef.current;
      if (!boton) return;
      boton.classList.remove(styles.rebote);
      void boton.offsetWidth; // reinicia la animación si llegan varios seguidos
      boton.classList.add(styles.rebote);
    };
    window.addEventListener(EVENTO_LLEGO_AL_CARRITO, rebotar);
    return () => window.removeEventListener(EVENTO_LLEGO_AL_CARRITO, rebotar);
  }, []);

  const handleClose = cerrarCarrito;

  // Al quitar un producto, su fila se desliza hacia afuera y luego se elimina.
  const animarSalida = (e, accion) => {
    const fila = e.currentTarget.closest('li');
    if (!fila || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      accion();
      return;
    }
    fila.classList.add(styles.saliendo);
    fila.addEventListener('animationend', accion, { once: true });
  };

  const conReceta = items.filter((i) => medicamentos.find((m) => m.id === i.id)?.requiereReceta);

  // La compra se completa en el checkout: entrega, medio de pago y resumen.
  const irAPagar = () => {
    cerrarCarrito();
    navigate('/checkout');
  };

  const footer =
    items.length > 0 ? (
      <>
        <div className={styles.total}>
          <span>Total</span>
          <span className={styles.totalValue}>{formatCLP(total)}</span>
        </div>
        {conReceta.length > 0 && (
          <p className={styles.notaReceta}>
            Tu carrito tiene {conReceta.length === 1 ? 'un producto' : `${conReceta.length} productos`} de venta bajo
            receta: al pagar elegirás una receta validada.
          </p>
        )}
        <p className={styles.envio}>Retiro en farmacia gratis · Despacho gratis desde $25.000</p>
        <button className="btn btn-primary btn-block" onClick={irAPagar}>
          <Lock size={16} /> Ir a pagar
        </button>
      </>
    ) : null;

  return (
    <>
      <button
        ref={botonRef}
        data-cart-target
        className="icon-btn"
        onAnimationEnd={(e) => e.target === e.currentTarget && e.currentTarget.classList.remove(styles.rebote)}
        onClick={abrirCarrito}
        aria-label={count > 0 ? `Carrito, ${count} productos` : 'Carrito'}
      >
        <ShoppingBag size={21} />
        {count > 0 && (
          <span key={count} className={styles.badge}>
            {count}
          </span>
        )}
      </button>

      <Drawer isOpen={isOpen} onClose={handleClose} title="Tu carrito" footer={footer}>
        {items.length === 0 && (
          <div className={styles.empty}>
            <p>Tu carrito está vacío.</p>
            <Link to="/catalogo" className="btn btn-outline btn-sm" onClick={handleClose}>
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
                <ProductImage medicamento={medicamento || item} size="sm" className={styles.thumb} />
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{item.nombre}</span>
                  {medicamento?.requiereReceta && <ProductBadges medicamento={{ requiereReceta: true }} compacto />}
                  {medicamento && (
                    <span className={styles.stockNote}>
                      {atMax ? `Máximo por pedido (${cantidadVisible(stock)})` : `Hasta ${cantidadVisible(stock)} por pedido`}
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
                        onClick={(e) =>
                          item.cantidad === 1
                            ? animarSalida(e, () => removeItem(item.id))
                            : updateQty(item.id, item.cantidad - 1, stock)
                        }
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
                      onClick={(e) => animarSalida(e, () => removeItem(item.id))}
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
