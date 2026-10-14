import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import ReorderButton from '../../components/ReorderButton/ReorderButton';
import styles from './OrderDetail.module.css';

const PAGADOS = ['PAGADO', 'EN_PREPARACION', 'LISTO_RETIRO', 'EN_CAMINO', 'ENTREGADO'];

// Acciones del pedido: comprobante de compra y volver a comprar los mismos productos.
export default function OrderActions({ pedido }) {
  const pagado = PAGADOS.includes(pedido.estado);
  // Un pedido esperando pago se paga, no se repite.
  if (pedido.estado === 'PENDIENTE_PAGO') return null;
  return (
    <section className={styles.bloque}>
      <h2>Acciones</h2>
      <ReorderButton pedido={pedido} className="btn btn-primary btn-block" />
      {pagado && (
        <Link to={`/mis-pedidos/${pedido.id}/comprobante`} className="btn btn-outline btn-block">
          <Receipt size={17} /> Ver comprobante
        </Link>
      )}
    </section>
  );
}
