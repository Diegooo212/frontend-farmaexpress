import { useSearchParams } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import { formatCLP } from '../../utils/format';
import { METODOS_PAGO } from '../../utils/checkout';
import PaymentMethodLogo from '../../components/PaymentMethodLogo/PaymentMethodLogo';
import styles from './PaymentSimulator.module.css';

// Solo se vuelve al retorno de pagos de nuestro propio BFF (evita usar esta página como
// redirección abierta hacia otro sitio).
function esRetornoPropio(retorno) {
  try {
    const url = new URL(retorno);
    const api = new URL(import.meta.env.VITE_API_BASE_URL || window.location.origin);
    return url.origin === api.origin && url.pathname.startsWith(`${api.pathname.replace(/\/$/, '')}/api/bff/payments/retorno/`);
  } catch {
    return false;
  }
}

// Pasarela de pruebas para los proveedores sin credenciales (Mercado Pago y Khipu, o Webpay en modo
// simulado). Hace lo mismo que el sitio del proveedor: el cliente paga y vuelve al BFF con el
// resultado y el secreto del pago; el backend valida ese secreto.
export default function PaymentSimulator() {
  const [params] = useSearchParams();
  const metodo = params.get('metodo');
  const monto = params.get('monto');
  const token = params.get('token');
  const retorno = params.get('retorno');
  const pago = params.get('pago');
  const marca = METODOS_PAGO[metodo];

  const volver = (resultado) => {
    const url = new URL(retorno);
    url.searchParams.set('token', token);
    url.searchParams.set('resultado', resultado);
    window.location.assign(url.toString());
  };

  const valido = marca && token && pago && esRetornoPropio(retorno);

  return (
    <main className={styles.page} style={{ '--marca': marca?.color || '#555' }}>
      <div className={styles.card}>
        <header className={styles.header}>
          <PaymentMethodLogo codigo={metodo} />
          <span className={styles.badge}>
            <ShieldCheck size={14} /> Pago seguro
          </span>
        </header>

        {!valido ? (
          <p className="alert alert-error">El enlace de pago no es válido.</p>
        ) : (
          <>
            <div className={styles.detalle}>
              <span>Pagando a</span>
              <strong>FarmaExpress</strong>
              <span>Monto</span>
              <strong className={styles.monto}>{formatCLP(monto)}</strong>
              <span>Operación</span>
              <strong>#{pago}</strong>
            </div>

            <p className={styles.nota}>Revisa el monto y confirma el pago para completar tu compra.</p>

            <div className={styles.acciones}>
              <button className={`btn btn-block ${styles.aprobar}`} onClick={() => volver('aprobado')}>
                <Lock size={16} /> Pagar {formatCLP(monto)}
              </button>
            </div>
          </>
        )}
      </div>
      <p className={styles.pie}>Conexión segura · {marca?.nombre || 'FarmaExpress'}</p>
    </main>
  );
}
