import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Clock, Store, Truck, XCircle } from 'lucide-react';
import { getPedido } from '../../api/ordersApi';
import { apiErrorMessage } from '../../api/httpClient';
import { useCart } from '../../context/CartContext';
import { formatCLP, formatDateTime } from '../../utils/format';
import { admitePago, estimarDespacho, nombreMetodo } from '../../utils/checkout';
import { lanzarConfeti } from '../../utils/confeti';
import styles from './PaymentResult.module.css';

const INTERVALO_MS = 2000;
const MAX_INTENTOS = 30;

// Vuelta desde el proveedor. El pago ya se confirmó en el backend, pero el pedido se actualiza
// por RabbitMQ (asíncrono): se consulta unos segundos hasta que deja de estar "esperando pago".
export default function PaymentResult() {
  const [params] = useSearchParams();
  const pedidoId = params.get('pedido');
  const errorRetorno = params.get('error');
  const { recargar } = useCart();
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState(errorRetorno && !pedidoId ? 'No pudimos identificar tu pago.' : '');
  const [intentos, setIntentos] = useState(0);
  const carritoRecargado = useRef(false);

  useEffect(() => {
    if (!pedidoId) return undefined;
    let cancelado = false;
    let timer;
    const consultar = async (n) => {
      try {
        const p = await getPedido(pedidoId);
        if (cancelado) return;
        setPedido(p);
        setIntentos(n);
        if (p.estado === 'PENDIENTE_PAGO' && n < MAX_INTENTOS) {
          timer = setTimeout(() => consultar(n + 1), INTERVALO_MS);
        }
      } catch (err) {
        if (!cancelado) setError(apiErrorMessage(err, 'No pudimos consultar tu pedido.'));
      }
    };
    consultar(1);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [pedidoId]);

  // Pagado: el BFF vació el carrito y el inventario descontó el stock.
  useEffect(() => {
    if (pedido?.estado === 'PAGADO' && !carritoRecargado.current) {
      carritoRecargado.current = true;
      recargar().catch(() => {});
      // Celebración: confeti justo cuando el check termina de dibujarse.
      setTimeout(() => lanzarConfeti(), 450);
    }
  }, [pedido, recargar]);

  if (error) {
    return (
      <Tarjeta tono="danger" icono={<XCircle size={52} />} titulo="Algo salió mal">
        <p>{error}</p>
        <Acciones>
          <Link to="/mis-pedidos" className="btn btn-primary">
            Ver mis pedidos
          </Link>
        </Acciones>
      </Tarjeta>
    );
  }

  if (!pedido || (pedido.estado === 'PENDIENTE_PAGO' && intentos < MAX_INTENTOS)) {
    return (
      <Tarjeta tono="info" icono={<span className={styles.spinner} aria-hidden="true" />} titulo="Confirmando tu pago…">
        <p>Estamos recibiendo la confirmación de {pedido ? nombreMetodo(pedido.metodoPago) : 'tu medio de pago'}. Esto toma solo unos segundos.</p>
      </Tarjeta>
    );
  }

  if (pedido.estado === 'PAGADO') {
    const retiro = pedido.entrega === 'RETIRO';
    return (
      <Tarjeta tono="success" icono={<CheckAnimado />} titulo="¡Pago aprobado!">
        <p className={styles.lead}>
          Tu pedido <strong>#{pedido.id}</strong> por <strong>{formatCLP(pedido.total)}</strong> quedó confirmado.
          {pedido.metodoPago && <> Pagaste con {nombreMetodo(pedido.metodoPago)}.</>}
        </p>
        <div className={styles.entrega}>
          {retiro ? <Store size={22} /> : <Truck size={22} />}
          <div>
            <strong>{retiro ? `Retiro en ${pedido.sucursal}` : 'Despacho a domicilio'}</strong>
            <p>
              {retiro
                ? 'Te avisaremos cuando esté listo. Lleva tu carnet para retirar.'
                : `${pedido.direccion}. ${estimarDespacho(new Date(pedido.creadoEn))}.`}
            </p>
          </div>
        </div>
        <ul className={styles.items}>
          {pedido.items.map((i) => (
            <li key={i.id}>
              <span>
                {i.cantidad} × {i.nombre}
              </span>
              <span>{formatCLP(i.precio * i.cantidad)}</span>
            </li>
          ))}
          {pedido.costoDespacho > 0 && (
            <li>
              <span>Despacho</span>
              <span>{formatCLP(pedido.costoDespacho)}</span>
            </li>
          )}
        </ul>
        <Acciones>
          <Link to="/mis-pedidos" className="btn btn-primary">
            Ver mis pedidos
          </Link>
          <Link to="/catalogo" className="btn btn-outline">
            Seguir comprando
          </Link>
        </Acciones>
      </Tarjeta>
    );
  }

  if (pedido.estado === 'PENDIENTE_PAGO') {
    return (
      <Tarjeta tono="warning" icono={<Clock size={52} />} titulo="Tu pago está en revisión">
        <p>
          {nombreMetodo(pedido.metodoPago)} aún no confirma el pago del pedido #{pedido.id}. Te avisaremos en la campana
          apenas llegue la confirmación.
        </p>
        <Acciones>
          <Link to="/mis-pedidos" className="btn btn-primary">
            Ver mis pedidos
          </Link>
        </Acciones>
      </Tarjeta>
    );
  }

  const puedeReintentar = admitePago(pedido);
  return (
    <Tarjeta tono="danger" icono={<XCircle size={56} />} titulo="Tu pago no se completó">
      <p className={styles.lead}>{pedido.detallePago || 'El pago fue rechazado. No se hizo ningún cobro.'}</p>
      {puedeReintentar ? (
        <p>
          Tus productos siguen reservados hasta las <strong>{formatDateTime(pedido.expiraEn)}</strong>. Puedes pagar con
          otro medio de pago.
        </p>
      ) : (
        <p>La reserva de tus productos terminó. Puedes volver a comprar desde el carrito.</p>
      )}
      <Acciones>
        {puedeReintentar ? (
          <Link to={`/checkout?pedido=${pedido.id}`} className="btn btn-primary">
            Pagar con otro medio
          </Link>
        ) : (
          <Link to="/catalogo" className="btn btn-primary">
            Volver a la tienda
          </Link>
        )}
        <Link to="/mis-pedidos" className="btn btn-outline">
          Ver mis pedidos
        </Link>
      </Acciones>
    </Tarjeta>
  );
}

function Tarjeta({ tono, icono, titulo, children }) {
  return (
    <section className={styles.page}>
      <div className={`${styles.card} ${styles[tono]}`} role="status" aria-live="polite">
        <div className={styles.icono}>{icono}</div>
        <h1 className={styles.titulo}>{titulo}</h1>
        {children}
      </div>
    </section>
  );
}

function Acciones({ children }) {
  return <div className={styles.acciones}>{children}</div>;
}

// Check que se dibuja solo: primero el círculo y después la marca.
function CheckAnimado() {
  return (
    <svg className={styles.checkAnimado} viewBox="0 0 52 52" width="56" height="56" aria-hidden="true">
      <circle className={styles.checkCirculo} cx="26" cy="26" r="23" fill="none" />
      <path className={styles.checkMarca} fill="none" d="M15 27l7 7 15-16" />
    </svg>
  );
}
