import { useCallback, useEffect, useState } from 'react';
import { Activity, PlugZap, Power, RefreshCw } from 'lucide-react';
import { getMetodosPago, simularCaida } from '../../api/paymentsApi';
import { apiErrorMessage } from '../../api/httpClient';
import PaymentMethodLogo from '../../components/PaymentMethodLogo/PaymentMethodLogo';
import styles from './PaymentProviders.module.css';

const CIRCUITO = {
  CLOSED: { etiqueta: 'Cerrado', texto: 'Funcionando: las llamadas pasan al proveedor.', tono: 'ok' },
  OPEN: {
    etiqueta: 'Abierto',
    texto: 'Demasiadas fallas: no se llama al proveedor y el checkout lo muestra como no disponible.',
    tono: 'falla',
  },
  HALF_OPEN: {
    etiqueta: 'Semiabierto',
    texto: 'Probando: la próxima llamada decide si el proveedor volvió.',
    tono: 'prueba',
  },
};

// Solo Administrador: estado del circuit breaker de cada pasarela y simulación de caídas para la demo.
export default function PaymentProviders() {
  const [metodos, setMetodos] = useState([]);
  const [error, setError] = useState('');
  const [cambiando, setCambiando] = useState(null);

  const cargar = useCallback(() => {
    getMetodosPago()
      .then((m) => {
        setMetodos(m);
        setError('');
      })
      .catch((err) => setError(apiErrorMessage(err, 'No pudimos consultar los medios de pago.')));
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 3000);
    return () => clearInterval(id);
  }, [cargar]);

  const alternar = async (m) => {
    setCambiando(m.codigo);
    try {
      setMetodos(await simularCaida(m.codigo, !m.caidaSimulada));
    } catch (err) {
      setError(apiErrorMessage(err, 'No pudimos cambiar la simulación.'));
    } finally {
      setCambiando(null);
    }
  };

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>Medios de pago</h1>
        <p className={styles.lead}>
          Cada pasarela tiene su propio <strong>circuit breaker</strong>: si de las últimas 5 llamadas falla la mitad
          (con al menos 3), el circuito se abre por 30 segundos y el checkout ofrece los otros medios. Luego deja pasar
          una llamada de prueba y, si funciona, se cierra solo.
        </p>
      </header>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      <div className={styles.grid}>
        {metodos.map((m) => {
          const circuito = CIRCUITO[m.circuito] || { etiqueta: m.circuito, texto: '', tono: 'prueba' };
          return (
            <article key={m.codigo} className={`${styles.card} ${styles[circuito.tono]}`}>
              <div className={styles.cabecera}>
                <PaymentMethodLogo codigo={m.codigo} />
                <span className={styles.modo}>{m.modo === 'SIMULADO' ? 'Simulador' : 'API real (pruebas)'}</span>
              </div>
              <div className={styles.estado}>
                <Activity size={18} aria-hidden="true" />
                <span>
                  Circuito <strong>{circuito.etiqueta}</strong>
                </span>
              </div>
              <p className={styles.texto}>{circuito.texto}</p>
              {m.caidaSimulada && (
                <p className={styles.aviso}>
                  <PlugZap size={16} /> Caída simulada activa: cada intento de pago con {m.nombre} fallará.
                </p>
              )}
              <button
                className={`btn btn-sm ${m.caidaSimulada ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => alternar(m)}
                disabled={cambiando === m.codigo}
              >
                {m.caidaSimulada ? <RefreshCw size={16} /> : <Power size={16} />}
                {m.caidaSimulada ? 'Restablecer proveedor' : 'Simular caída'}
              </button>
            </article>
          );
        })}
      </div>

      <ol className={styles.pasos}>
        <li>Pulsa "Simular caída" en un proveedor.</li>
        <li>En el checkout intenta pagar 3 veces con ese medio: cada intento falla rápido y el pedido espera.</li>
        <li>El circuito pasa a "Abierto" y el medio aparece como no disponible; los otros siguen funcionando.</li>
        <li>Restablece el proveedor: a los 30 segundos el circuito pasa a "Semiabierto" y con el siguiente pago se cierra.</li>
      </ol>
    </div>
  );
}
