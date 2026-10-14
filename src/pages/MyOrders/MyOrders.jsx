import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Package, Store, Truck } from 'lucide-react';
import { cancelarPedido, getPedidos } from '../../api/ordersApi';
import { apiErrorMessage } from '../../api/httpClient';
import { formatCLP, formatDateTime } from '../../utils/format';
import { ESTADOS_PEDIDO, admitePago, nombreMetodo } from '../../utils/checkout';
import styles from './MyOrders.module.css';
import Skeleton from '../../components/Skeleton/Skeleton';
import ReorderButton from '../../components/ReorderButton/ReorderButton';

export default function MyOrders() {
  const [pedidos, setPedidos] = useState(null);
  const [error, setError] = useState('');
  const [cancelando, setCancelando] = useState(null);

  const cargar = useCallback(() => {
    getPedidos()
      .then(setPedidos)
      .catch((err) => setError(apiErrorMessage(err, 'No pudimos cargar tus pedidos.')));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cancelar = async (id) => {
    setCancelando(id);
    setError('');
    try {
      await cancelarPedido(id);
      cargar();
    } catch (err) {
      setError(apiErrorMessage(err, 'No pudimos cancelar el pedido.'));
    } finally {
      setCancelando(null);
    }
  };

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Mis pedidos</h1>
        <p className={styles.subtitle}>Revisa el estado de tus compras, el pago y cómo las recibirás.</p>
      </header>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      {pedidos === null && !error && <Skeleton filas={3} alto={120} etiqueta="Cargando tus pedidos…" />}

      {pedidos?.length === 0 && (
        <div className={styles.vacio}>
          <Package size={40} />
          <p>Aún no tienes pedidos.</p>
          <Link to="/catalogo" className="btn btn-primary">
            Ir al catálogo
          </Link>
        </div>
      )}

      <ul className={styles.lista}>
        {pedidos?.map((p) => {
          const estado = ESTADOS_PEDIDO[p.estado] || { etiqueta: p.estado, tono: 'muted' };
          const pendiente = admitePago(p);
          const unidades = p.items.reduce((s, i) => s + i.cantidad, 0);
          return (
            <li key={p.id} className={styles.pedido}>
              <div className={styles.cabecera}>
                <div>
                  <h2 className={styles.numero}>Pedido #{p.id}</h2>
                  <p className={styles.muted}>{formatDateTime(p.creadoEn)}</p>
                </div>
                <span className={`${styles.estado} ${styles[estado.tono]}`}>{estado.etiqueta}</span>
              </div>

              <div className={styles.cuerpo}>
                <div className={styles.dato}>
                  {p.entrega === 'DESPACHO' ? <Truck size={18} /> : <Store size={18} />}
                  <span>
                    {p.entrega === 'DESPACHO'
                      ? `Despacho a ${p.direccion}`
                      : p.entrega === 'RETIRO'
                        ? `Retiro en ${p.sucursal}`
                        : 'Compra anterior al checkout'}
                  </span>
                </div>
                <p className={styles.productos}>
                  {p.items.map((i) => `${i.cantidad} × ${i.nombre}`).join(' · ')}
                </p>
                {p.detallePago && p.estado !== 'PAGADO' && <p className={styles.detalle}>{p.detallePago}</p>}
                {pendiente && p.expiraEn && (
                  <p className={styles.reserva}>
                    <Clock size={14} /> Productos reservados hasta las {formatDateTime(p.expiraEn)}
                  </p>
                )}
              </div>

              <div className={styles.pie}>
                <span className={styles.total}>
                  {formatCLP(p.total)}
                  <small>
                    {unidades} {unidades === 1 ? 'producto' : 'productos'}
                    {p.metodoPago && ` · ${nombreMetodo(p.metodoPago)}`}
                  </small>
                </span>
                <div className={styles.acciones}>
                  <Link to={`/mis-pedidos/${p.id}`} className={styles.verDetalle}>
                    Ver detalle
                  </Link>
                  {p.estado !== 'PENDIENTE_PAGO' && <ReorderButton pedido={p} />}
                </div>
                {pendiente && (
                  <div className={styles.acciones}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => cancelar(p.id)}
                      disabled={cancelando === p.id}
                    >
                      {cancelando === p.id ? 'Cancelando…' : 'Cancelar'}
                    </button>
                    <Link to={`/checkout?pedido=${p.id}`} className="btn btn-primary btn-sm">
                      Pagar
                    </Link>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
