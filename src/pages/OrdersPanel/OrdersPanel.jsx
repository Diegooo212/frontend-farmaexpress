import { useCallback, useEffect, useState } from 'react';
import { FileText, Store, Truck } from 'lucide-react';
import { avanzarPedido, getPedidosPorAtender } from '../../api/ordersApi';
import { apiErrorMessage } from '../../api/httpClient';
import { formatCLP, formatDateTime } from '../../utils/format';
import { nombreMetodo } from '../../utils/checkout';
import styles from './OrdersPanel.module.css';
import Skeleton from '../../components/Skeleton/Skeleton';

const COLUMNAS = [
  { titulo: 'Por preparar', estados: ['PAGADO'], vacio: 'No hay pedidos nuevos.' },
  { titulo: 'En preparación', estados: ['EN_PREPARACION'], vacio: 'Nada en preparación.' },
  { titulo: 'Listos y en camino', estados: ['LISTO_RETIRO', 'EN_CAMINO'], vacio: 'Nada esperando entrega.' },
];

// Siguiente paso de cada pedido según su estado y cómo se entrega.
function siguiente(pedido) {
  switch (pedido.estado) {
    case 'PAGADO':
      return { estado: 'EN_PREPARACION', texto: 'Empezar a preparar' };
    case 'EN_PREPARACION':
      return pedido.entrega === 'DESPACHO'
        ? { estado: 'EN_CAMINO', texto: 'Despachar' }
        : { estado: 'LISTO_RETIRO', texto: 'Listo para retiro' };
    case 'LISTO_RETIRO':
      return { estado: 'ENTREGADO', texto: 'Entregado al cliente' };
    case 'EN_CAMINO':
      return { estado: 'ENTREGADO', texto: 'Confirmar entrega' };
    default:
      return null;
  }
}

// Panel de pedidos para el personal de farmacia (Operador y Administrador).
export default function OrdersPanel() {
  const [pedidos, setPedidos] = useState(null);
  const [verEntregados, setVerEntregados] = useState(false);
  const [error, setError] = useState('');
  const [avanzando, setAvanzando] = useState(null);

  const cargar = useCallback(() => {
    getPedidosPorAtender(verEntregados)
      .then((p) => {
        setPedidos(p);
        setError('');
      })
      .catch((err) => setError(apiErrorMessage(err, 'No pudimos cargar los pedidos.')));
  }, [verEntregados]);

  useEffect(() => {
    cargar();
    // Llegan pedidos nuevos mientras el panel está abierto.
    const timer = setInterval(cargar, 20000);
    return () => clearInterval(timer);
  }, [cargar]);

  const avanzar = async (pedido, paso) => {
    setAvanzando(pedido.id);
    setError('');
    try {
      await avanzarPedido(pedido.id, paso.estado);
      cargar();
    } catch (err) {
      setError(apiErrorMessage(err, 'No pudimos actualizar el pedido.'));
    } finally {
      setAvanzando(null);
    }
  };

  const lista = pedidos || [];
  const porAtender = lista.filter((g) => g.pedido.estado !== 'ENTREGADO');
  const entregados = lista.filter((g) => g.pedido.estado === 'ENTREGADO').reverse();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Pedidos</h1>
          <p className={styles.lead}>
            {pedidos === null
              ? 'Cargando pedidos…'
              : porAtender.length === 0
                ? 'No hay pedidos pendientes.'
                : `${porAtender.length} ${porAtender.length === 1 ? 'pedido por atender' : 'pedidos por atender'}, del más antiguo al más nuevo.`}
          </p>
        </div>
        <label className={styles.toggle}>
          <input type="checkbox" checked={verEntregados} onChange={(e) => setVerEntregados(e.target.checked)} />
          Ver entregados
        </label>
      </header>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      {pedidos === null && <Skeleton filas={3} alto={180} columnas={3} etiqueta="Cargando pedidos…" />}
      <div className={styles.columnas} hidden={pedidos === null}>
        {COLUMNAS.map((col) => {
          const enColumna = porAtender.filter((g) => col.estados.includes(g.pedido.estado));
          return (
            <section key={col.titulo} className={styles.columna} aria-label={col.titulo}>
              <h2 className={styles.columnaTitulo}>
                {col.titulo} <span>{enColumna.length}</span>
              </h2>
              {enColumna.length === 0 && <p className={styles.vacio}>{col.vacio}</p>}
              {enColumna.map((g) => (
                <Tarjeta key={g.pedido.id} gestion={g} avanzando={avanzando === g.pedido.id} onAvanzar={avanzar} />
              ))}
            </section>
          );
        })}
      </div>

      {verEntregados && (
        <section className={styles.entregados} aria-label="Pedidos entregados">
          <h2 className={styles.columnaTitulo}>
            Entregados <span>{entregados.length}</span>
          </h2>
          <div className={styles.gridEntregados}>
            {entregados.map((g) => (
              <Tarjeta key={g.pedido.id} gestion={g} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Tarjeta({ gestion, avanzando = false, onAvanzar }) {
  const { pedido, cliente, email } = gestion;
  const paso = onAvanzar ? siguiente(pedido) : null;
  const retiro = pedido.entrega === 'RETIRO';
  const pagadoEl = [...(pedido.historial || [])].reverse().find((h) => h.estado === 'PAGADO')?.fecha;
  const unidades = pedido.items.reduce((s, i) => s + i.cantidad, 0);

  return (
    <article className={styles.tarjeta}>
      <div className={styles.tarjetaHead}>
        <strong>Pedido #{pedido.id}</strong>
        <span className={retiro ? styles.retiro : styles.despacho}>
          {retiro ? <Store size={14} /> : <Truck size={14} />} {retiro ? 'Retiro' : 'Despacho'}
        </span>
      </div>
      <p className={styles.cliente}>
        {cliente}
        {email && <small>{email}</small>}
      </p>
      <p className={styles.destino}>{retiro ? pedido.sucursal : pedido.direccion}</p>
      <ul className={styles.items}>
        {pedido.items.map((i) => (
          <li key={i.id}>
            <span>{i.cantidad} ×</span> {i.nombre}
          </li>
        ))}
      </ul>
      {pedido.recetaId && (
        <p className={styles.receta}>
          <FileText size={14} /> Con receta #{pedido.recetaId}: revisar antes de entregar
        </p>
      )}
      <p className={styles.meta}>
        {unidades} {unidades === 1 ? 'unidad' : 'unidades'} · {formatCLP(pedido.total)} · {nombreMetodo(pedido.metodoPago)}
        {pagadoEl && <> · pagado {formatDateTime(pagadoEl)}</>}
      </p>
      {paso && (
        <button className="btn btn-primary btn-sm btn-block" onClick={() => onAvanzar(pedido, paso)} disabled={avanzando}>
          {avanzando ? 'Guardando…' : paso.texto}
        </button>
      )}
    </article>
  );
}
