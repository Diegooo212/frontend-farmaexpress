import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Download, Printer } from 'lucide-react';
import { getPedido } from '../../api/ordersApi';
import { apiErrorMessage } from '../../api/httpClient';
import { useAuth } from '../../context/AuthContext';
import { formatCLP, formatDateTime } from '../../utils/format';
import { nombreMetodo } from '../../utils/checkout';
import Logo from '../../components/Logo/Logo';
import styles from './Receipt.module.css';

const PAGADOS = ['PAGADO', 'EN_PREPARACION', 'LISTO_RETIRO', 'EN_CAMINO', 'ENTREGADO'];

// Comprobante de compra imprimible (o "Guardar como PDF" desde el diálogo de impresión del navegador).
// No reemplaza a la boleta electrónica del SII: es un resumen del pedido para el cliente.
export default function Receipt() {
  const { id } = useParams();
  const { user } = useAuth();
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState('');
  const hoja = useRef(null);
  const [descargando, setDescargando] = useState(false);

  // Descarga el comprobante como archivo PDF (la librería se carga solo al usarla).
  const descargarPdf = async () => {
    setDescargando(true);
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      await html2pdf()
        .set({
          margin: 10,
          filename: `comprobante-farmaexpress-${id}.pdf`,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(hoja.current)
        .save();
    } catch {
      setError('No pudimos generar el PDF. Usa Imprimir y elige "Guardar como PDF".');
    } finally {
      setDescargando(false);
    }
  };

  useEffect(() => {
    getPedido(id)
      .then(setPedido)
      .catch((err) => setError(apiErrorMessage(err, 'No encontramos ese pedido.')));
  }, [id]);

  if (error) {
    return (
      <main className={styles.page}>
        <p className="alert alert-error">{error}</p>
      </main>
    );
  }
  if (!pedido) {
    return (
      <main className={styles.page}>
        <p className={styles.muted}>Preparando el comprobante…</p>
      </main>
    );
  }
  if (!PAGADOS.includes(pedido.estado)) {
    return (
      <main className={styles.page}>
        <p className="alert alert-info">El comprobante está disponible cuando el pedido está pagado.</p>
        <Link to={`/mis-pedidos/${pedido.id}`} className="btn btn-outline">
          Volver al pedido
        </Link>
      </main>
    );
  }

  const pagadoEl = [...(pedido.historial || [])].reverse().find((h) => h.estado === 'PAGADO')?.fecha;
  const neto = Math.round(pedido.total / 1.19);

  return (
    <main className={styles.page}>
      <div className={styles.acciones}>
        <Link to={`/mis-pedidos/${pedido.id}`} className="btn btn-ghost btn-sm">
          <ChevronLeft size={16} /> Volver al pedido
        </Link>
        <div className={styles.botones}>
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir
          </button>
          <button className="btn btn-primary btn-sm" onClick={descargarPdf} disabled={descargando}>
            <Download size={16} /> {descargando ? 'Generando PDF…' : 'Descargar PDF'}
          </button>
        </div>
      </div>

      <article className={styles.hoja} ref={hoja}>
        <header className={styles.cabecera}>
          <Logo to="/" />
          <div className={styles.documento}>
            <h1>Comprobante de compra</h1>
            <p>Pedido N° {pedido.id}</p>
            <small>Documento no tributario</small>
          </div>
        </header>

        <dl className={styles.datos}>
          <div>
            <dt>Cliente</dt>
            <dd>{user?.nombre}</dd>
            {user?.email && <dd>{user.email}</dd>}
          </div>
          <div>
            <dt>Fecha de pago</dt>
            <dd>{formatDateTime(pagadoEl || pedido.creadoEn)}</dd>
          </div>
          <div>
            <dt>Medio de pago</dt>
            <dd>
              {nombreMetodo(pedido.metodoPago)}
              {pedido.pagoId && ` · operación #${pedido.pagoId}`}
            </dd>
          </div>
          <div>
            <dt>{pedido.entrega === 'DESPACHO' ? 'Despacho a' : 'Retiro en'}</dt>
            <dd>{pedido.entrega === 'DESPACHO' ? pedido.direccion : pedido.sucursal}</dd>
          </div>
        </dl>

        <table className={styles.tabla}>
          <thead>
            <tr>
              <th scope="col">Producto</th>
              <th scope="col" className={styles.num}>
                Cantidad
              </th>
              <th scope="col" className={styles.num}>
                Precio unitario
              </th>
              <th scope="col" className={styles.num}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {pedido.items.map((i) => (
              <tr key={i.id}>
                <td>{i.nombre}</td>
                <td className={styles.num}>{i.cantidad}</td>
                <td className={styles.num}>{formatCLP(i.precio)}</td>
                <td className={styles.num}>{formatCLP(i.precio * i.cantidad)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className={styles.totales}>
          <div>
            <dt>Subtotal</dt>
            <dd>{formatCLP(pedido.subtotal)}</dd>
          </div>
          <div>
            <dt>Despacho</dt>
            <dd>{pedido.costoDespacho ? formatCLP(pedido.costoDespacho) : 'Gratis'}</dd>
          </div>
          <div className={styles.total}>
            <dt>Total pagado</dt>
            <dd>{formatCLP(pedido.total)}</dd>
          </div>
          <div className={styles.iva}>
            <dt>Neto e IVA (19%) incluidos</dt>
            <dd>
              {formatCLP(neto)} + {formatCLP(pedido.total - neto)}
            </dd>
          </div>
        </dl>

        <footer className={styles.pie}>
          FarmaExpress · Este comprobante resume tu compra y no reemplaza a la boleta electrónica. Para cambios o
          devoluciones, presenta este documento en cualquiera de nuestras farmacias.
        </footer>
      </article>
    </main>
  );
}
