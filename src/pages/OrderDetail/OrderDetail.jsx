import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, ChevronLeft, Clock, CreditCard, FileText, Store, Truck } from 'lucide-react';
import { cancelarPedido, getPedido } from '../../api/ordersApi';
import { apiErrorMessage } from '../../api/httpClient';
import { useCatalog } from '../../context/CatalogContext';
import { formatCLP, formatDateTime } from '../../utils/format';
import { ESTADOS_PEDIDO, admitePago, nombreMetodo, pasosSeguimiento } from '../../utils/checkout';
import ProductImage from '../../components/ProductImage/ProductImage';
import OrderActions from './OrderActions';
import styles from './OrderDetail.module.css';
import Skeleton from '../../components/Skeleton/Skeleton';

const PAGADOS = ['PAGADO', 'EN_PREPARACION', 'LISTO_RETIRO', 'EN_CAMINO', 'ENTREGADO'];

// Detalle de un pedido con su seguimiento (como en las tiendas online).
export default function OrderDetail() {
  const { id } = useParams();
  const { medicamentos } = useCatalog();
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState('');
  const [cancelando, setCancelando] = useState(false);

  const cargar = useCallback(() => {
    getPedido(id)
      .then((p) => {
        setPedido(p);
        setError('');
      })
      .catch((err) => setError(apiErrorMessage(err, 'No encontramos ese pedido.')));
  }, [id]);

  useEffect(() => {
    cargar();
    // El personal puede avanzar el pedido mientras el cliente mira: se refresca cada 30 s.
    const timer = setInterval(cargar, 30000);
    return () => clearInterval(timer);
  }, [cargar]);

  const cancelar = async () => {
    setCancelando(true);
    try {
      setPedido(await cancelarPedido(pedido.id));
    } catch (err) {
      setError(apiErrorMessage(err, 'No pudimos cancelar el pedido.'));
    } finally {
      setCancelando(false);
    }
  };

  if (error && !pedido) {
    return (
      <section className={styles.page}>
        <p className="alert alert-error">{error}</p>
        <Link to="/mis-pedidos" className="btn btn-outline">
          Volver a mis pedidos
        </Link>
      </section>
    );
  }

  if (!pedido) {
    return (
      <section className={styles.page}>
        <Skeleton filas={1} alto={150} etiqueta="Cargando el pedido…" />
        <Skeleton filas={2} alto={110} columnas={2} etiqueta="" />
      </section>
    );
  }

  const estado = ESTADOS_PEDIDO[pedido.estado] || { etiqueta: pedido.estado, tono: 'muted' };
  const pagado = PAGADOS.includes(pedido.estado);
  const pasos = pasosSeguimiento(pedido);
  const indiceActual = pasos.findIndex((p) => p.estado === pedido.estado);
  const fechaDe = (e) => [...(pedido.historial || [])].reverse().find((h) => h.estado === e)?.fecha;
  const retiro = pedido.entrega === 'RETIRO';

  return (
    <section className={styles.page}>
      <Link to="/mis-pedidos" className={styles.volver}>
        <ChevronLeft size={18} /> Mis pedidos
      </Link>

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Pedido #{pedido.id}</h1>
          <p className={styles.muted}>Realizado el {formatDateTime(pedido.creadoEn)}</p>
        </div>
        <span className={`${styles.estado} ${styles[estado.tono]}`}>{estado.etiqueta}</span>
      </header>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      {pagado && (
        <ol className={styles.seguimiento} aria-label="Seguimiento del pedido">
          {pasos.map((paso, i) => {
            const hecho = i <= indiceActual;
            return (
              <li
                key={paso.estado}
                className={`${styles.paso} ${hecho ? styles.pasoHecho : ''} ${i === indiceActual ? styles.pasoActual : ''}`}
                aria-current={i === indiceActual ? 'step' : undefined}
                style={{ '--i': i }}
              >
                <span className={styles.punto}>{hecho ? <Check size={16} /> : i + 1}</span>
                <span className={styles.pasoTitulo}>{paso.titulo}</span>
                {fechaDe(paso.estado) && <small>{formatDateTime(fechaDe(paso.estado))}</small>}
              </li>
            );
          })}
        </ol>
      )}

      {admitePago(pedido) && (
        <div className={`alert alert-info ${styles.pendiente}`}>
          <span>
            <Clock size={16} /> {pedido.detallePago || 'Este pedido está esperando el pago.'} Tus productos están
            reservados hasta las {formatDateTime(pedido.expiraEn)}.
          </span>
          <span className={styles.botones}>
            <button className="btn btn-ghost btn-sm" onClick={cancelar} disabled={cancelando}>
              {cancelando ? 'Cancelando…' : 'Cancelar pedido'}
            </button>
            <Link to={`/checkout?pedido=${pedido.id}`} className="btn btn-primary btn-sm">
              Pagar ahora
            </Link>
          </span>
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.columna}>
          <section className={styles.bloque} aria-labelledby="productos-title">
            <h2 id="productos-title">Productos</h2>
            <ul className={styles.items}>
              {pedido.items.map((item) => {
                const medicamento = medicamentos.find((m) => m.id === item.id);
                return (
                  <li key={item.id}>
                    <ProductImage medicamento={medicamento || item} size="sm" />
                    <span className={styles.itemNombre}>
                      {item.nombre}
                      <small>
                        {item.cantidad} × {formatCLP(item.precio)}
                      </small>
                    </span>
                    <strong>{formatCLP(item.precio * item.cantidad)}</strong>
                  </li>
                );
              })}
            </ul>
            <dl className={styles.totales}>
              <div>
                <dt>Subtotal</dt>
                <dd>{formatCLP(pedido.subtotal)}</dd>
              </div>
              <div>
                <dt>{retiro ? 'Retiro en farmacia' : 'Despacho'}</dt>
                <dd>{pedido.costoDespacho ? formatCLP(pedido.costoDespacho) : 'Gratis'}</dd>
              </div>
              <div className={styles.total}>
                <dt>Total</dt>
                <dd>{formatCLP(pedido.total)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className={styles.columna}>
          <section className={styles.bloque}>
            <h2>{retiro ? 'Retiro' : 'Despacho'}</h2>
            <p className={styles.dato}>
              {retiro ? <Store size={18} /> : <Truck size={18} />}
              <span>{retiro ? pedido.sucursal : pedido.direccion}</span>
            </p>
            {retiro && pedido.estado === 'LISTO_RETIRO' && (
              <p className={styles.nota}>Tu pedido te espera. Lleva tu carnet de identidad para retirarlo.</p>
            )}
          </section>

          {pedido.metodoPago && (
            <section className={styles.bloque}>
              <h2>Pago</h2>
              <p className={styles.dato}>
                <CreditCard size={18} />
                <span>
                  {nombreMetodo(pedido.metodoPago)}
                  {pedido.pagoId && <small> · operación #{pedido.pagoId}</small>}
                </span>
              </p>
            </section>
          )}

          {pedido.recetaId && (
            <section className={styles.bloque}>
              <h2>Receta</h2>
              <p className={styles.dato}>
                <FileText size={18} />
                <Link to="/mis-recetas">Receta #{pedido.recetaId}</Link>
              </p>
            </section>
          )}

          <OrderActions pedido={pedido} />
        </aside>
      </div>
    </section>
  );
}
