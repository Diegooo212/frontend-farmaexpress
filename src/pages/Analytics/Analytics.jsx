import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getTablero } from '../../api/analyticsApi';
import { getMedicamentos } from '../../api/catalogApi';
import { apiErrorMessage } from '../../api/httpClient';
import { formatCLP } from '../../utils/format';
import { nombreMetodo } from '../../utils/checkout';
import Skeleton from '../../components/Skeleton/Skeleton';
import styles from './Analytics.module.css';

// Cada cuánto se consulta la analítica. Los eventos llegan por Kafka en milisegundos;
// la pantalla los muestra en el siguiente ciclo.
const INTERVALO_MS = 3000;

const hora = (iso) => new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
const numero = (n) => new Intl.NumberFormat('es-CL').format(n || 0);

// Personal (Operador y Administrador): ventas y stock en tiempo real, calculados por el microservicio
// analytics a partir de los tópicos Kafka farmaexpress.ventas y farmaexpress.stock.
export default function Analytics() {
  const [tablero, setTablero] = useState(null);
  const [error, setError] = useState('');
  const [nombres, setNombres] = useState({});
  const [nuevos, setNuevos] = useState(new Set());
  const vistos = useRef(null);

  const cargar = useCallback(() => {
    getTablero()
      .then((t) => {
        const ids = t.recientes.map((v) => v.pedidoId);
        // Ventas que no estaban en la consulta anterior: se resaltan al aparecer.
        if (vistos.current) setNuevos(new Set(ids.filter((id) => !vistos.current.has(id))));
        vistos.current = new Set(ids);
        setTablero(t);
        setError('');
      })
      .catch((err) => setError(apiErrorMessage(err, 'No pudimos consultar la analítica.')));
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [cargar]);

  // El evento de stock trae el id del producto; el nombre se toma del catálogo.
  useEffect(() => {
    getMedicamentos()
      .then((lista) => setNombres(Object.fromEntries(lista.map((m) => [m.id, m.nombre]))))
      .catch(() => {});
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Analítica en vivo</h1>
          <p className={styles.lead}>
            Ventas y stock procesados en tiempo real desde Kafka (tópicos <code>farmaexpress.ventas</code> y{' '}
            <code>farmaexpress.stock</code>). Cada pago aprobado aparece aquí en segundos.
          </p>
        </div>
        <span className={`${styles.vivo} ${error ? styles.sinConexion : ''}`} role="status">
          <span className={styles.punto} aria-hidden="true" />
          {error ? 'Sin conexión' : 'En vivo'}
        </span>
      </header>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      {!tablero ? (
        <Skeleton filas={4} columnas={4} alto={96} etiqueta="Cargando la analítica…" />
      ) : (
        <>
          <section className={styles.cifras} aria-label="Resumen de hoy">
            <Cifra etiqueta="Ventas de hoy" valor={numero(tablero.hoy.ventas)} />
            <Cifra etiqueta="Ingresos de hoy" valor={formatCLP(tablero.hoy.ingresos)} />
            <Cifra etiqueta="Unidades vendidas hoy" valor={numero(tablero.hoy.unidades)} />
            <Cifra etiqueta="Ticket promedio" valor={formatCLP(tablero.hoy.ticketPromedio)} />
          </section>
          <p className={styles.historico}>
            Desde que se registra: {numero(tablero.total.ventas)} ventas · {formatCLP(tablero.total.ingresos)} ·{' '}
            {numero(tablero.total.unidades)} unidades
          </p>

          <div className={styles.grilla}>
            <section className={`${styles.bloque} ${styles.ancho}`} aria-labelledby="horas-title">
              <h2 id="horas-title">Ingresos por hora · últimas 12 horas</h2>
              <GraficoHoras puntos={tablero.ventasPorHora} />
            </section>

            <section className={styles.bloque} aria-labelledby="recientes-title">
              <h2 id="recientes-title">Últimas ventas recibidas</h2>
              {tablero.recientes.length === 0 ? (
                <p className={styles.vacio}>Aún no llegan ventas. Haz una compra y aparecerá aquí.</p>
              ) : (
                <ul className={styles.eventos}>
                  {tablero.recientes.map((v) => (
                    <li key={v.pedidoId} className={nuevos.has(v.pedidoId) ? styles.nuevo : ''}>
                      <div className={styles.eventoFila}>
                        <strong>Pedido #{v.pedidoId}</strong>
                        <strong>{formatCLP(v.total)}</strong>
                      </div>
                      <span>
                        {numero(v.unidades)} u. · {nombreMetodo(v.metodoPago)} · {v.sucursal || 'Despacho'}
                      </span>
                      <span className={styles.traza} title="Partición y offset del mensaje en Kafka; demora desde el pago">
                        partición {v.particion} · offset {v.offset} · {hora(v.fecha)} · {v.demoraMs} ms
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={styles.bloque} aria-labelledby="top-title">
              <h2 id="top-title">Más vendidos</h2>
              <Barras
                filas={tablero.masVendidos.map((p) => ({ clave: p.medicamentoId, nombre: p.nombre, valor: p.unidades, detalle: formatCLP(p.ingresos) }))}
                unidad="u."
                vacio="Sin ventas todavía."
              />
            </section>

            <section className={styles.bloque} aria-labelledby="sucursal-title">
              <h2 id="sucursal-title">Ingresos por origen</h2>
              <Barras
                filas={tablero.porSucursal.map((s) => ({ clave: s.nombre, nombre: s.nombre, valor: s.ingresos, detalle: `${numero(s.ventas)} ventas` }))}
                formato={formatCLP}
                vacio="Sin ventas todavía."
              />
            </section>

            <section className={styles.bloque} aria-labelledby="metodo-title">
              <h2 id="metodo-title">Ventas por medio de pago</h2>
              <Barras
                filas={tablero.porMetodoPago.map((m) => ({ clave: m.nombre, nombre: nombreMetodo(m.nombre), valor: m.ventas, detalle: formatCLP(m.ingresos) }))}
                unidad="ventas"
                vacio="Sin ventas todavía."
              />
            </section>

            <section className={styles.bloque} aria-labelledby="stock-title">
              <h2 id="stock-title">Stock bajo (≤ {tablero.umbralStockBajo} unidades)</h2>
              {tablero.stockBajo.length === 0 ? (
                <p className={styles.vacio}>Ningún producto bajo el mínimo.</p>
              ) : (
                <ul className={styles.alertas}>
                  {tablero.stockBajo.map((s) => (
                    <li key={s.medicamentoId}>
                      <AlertTriangle size={16} aria-hidden="true" />
                      <span>{nombres[s.medicamentoId] || `Producto #${s.medicamentoId}`}</span>
                      <strong>{s.stockTotal === 0 ? 'Agotado' : `${numero(s.stockTotal)} u.`}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function Cifra({ etiqueta, valor }) {
  return (
    <div className={styles.cifra}>
      <span>{etiqueta}</span>
      <strong>{valor}</strong>
    </div>
  );
}

// Barras horizontales de una sola serie (un color): el largo es el valor; el número va escrito al lado.
function Barras({ filas, formato = numero, unidad = '', vacio }) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  if (filas.length === 0) return <p className={styles.vacio}>{vacio}</p>;
  return (
    <ul className={styles.barras}>
      {filas.map((f) => (
        <li key={f.clave}>
          <div className={styles.barraTexto}>
            <span>{f.nombre}</span>
            <span>
              <strong>
                {formato(f.valor)}
                {unidad && ` ${unidad}`}
              </strong>{' '}
              <small>{f.detalle}</small>
            </span>
          </div>
          <div className={styles.barraFondo} aria-hidden="true">
            <div className={styles.barra} style={{ width: `${(f.valor / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Columnas por hora con tooltip al pasar el mouse (o al enfocar con el teclado).
function GraficoHoras({ puntos }) {
  const [activo, setActivo] = useState(null);
  const max = useMemo(() => Math.max(1, ...puntos.map((p) => p.ingresos)), [puntos]);
  const total = puntos.reduce((s, p) => s + p.ventas, 0);

  return (
    <div className={styles.grafico}>
      <div className={styles.columnas} onMouseLeave={() => setActivo(null)}>
        {puntos.map((p, i) => (
          <div
            key={p.hora}
            className={styles.columna}
            tabIndex={0}
            onMouseEnter={() => setActivo(i)}
            onFocus={() => setActivo(i)}
            onBlur={() => setActivo(null)}
            aria-label={`${hora(p.hora)}: ${p.ventas} ventas, ${formatCLP(p.ingresos)}`}
          >
            <div
              className={`${styles.columnaBarra} ${activo === i ? styles.columnaActiva : ''}`}
              style={{ height: p.ingresos > 0 ? `max(4px, ${(p.ingresos / max) * 100}%)` : 0 }}
            />
            {activo === i && (
              <div className={styles.tooltip} role="tooltip">
                <strong>{hora(p.hora)}</strong>
                <span>{formatCLP(p.ingresos)}</span>
                <span>
                  {p.ventas} {p.ventas === 1 ? 'venta' : 'ventas'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className={styles.eje} aria-hidden="true">
        {puntos.map((p, i) => (
          <span key={p.hora}>{i % 3 === 2 || i === puntos.length - 1 ? hora(p.hora) : ''}</span>
        ))}
      </div>
      {total === 0 && <p className={styles.vacio}>Sin ventas en las últimas 12 horas.</p>}
    </div>
  );
}
