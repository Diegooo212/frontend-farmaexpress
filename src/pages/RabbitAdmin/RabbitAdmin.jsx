import { useCallback, useEffect, useState } from 'react';
import { Lock, RefreshCw, Trash2 } from 'lucide-react';
import {
  crearBinding,
  crearCola,
  crearExchange,
  eliminarBinding,
  eliminarCola,
  eliminarExchange,
  getBindings,
  getColas,
  getExchanges,
} from '../../api/rabbitAdminApi';
import { apiErrorMessage } from '../../api/httpClient';
import Skeleton from '../../components/Skeleton/Skeleton';
import styles from './RabbitAdmin.module.css';

const COLA_VACIA = { nombre: '', tipo: 'CLASSIC', conDlq: true, ttlMs: '' };
const EXCHANGE_VACIO = { nombre: '', tipo: 'DIRECT' };
const BINDING_VACIO = { exchange: '', cola: '', routingKey: '' };

// Solo Administrador: colas, exchanges y bindings del clúster RabbitMQ (microservicio rabbit-admin).
// Los recursos del sistema (los que usan los microservicios) se ven con candado y no se pueden borrar.
export default function RabbitAdmin() {
  const [colas, setColas] = useState(null);
  const [exchanges, setExchanges] = useState([]);
  const [bindings, setBindings] = useState([]);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(() => {
    Promise.all([getColas(), getExchanges(), getBindings()])
      .then(([c, e, b]) => {
        setColas(c);
        setExchanges(e);
        setBindings(b);
        setError('');
      })
      .catch((err) => setError(apiErrorMessage(err, 'No pudimos consultar RabbitMQ.')));
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 5000);
    return () => clearInterval(id);
  }, [cargar]);

  // Ejecuta una operación, muestra el resultado y recarga las tablas.
  const operar = async (fn, exito) => {
    setError('');
    setAviso('');
    try {
      await fn();
      setAviso(exito);
      cargar();
      return true;
    } catch (err) {
      setError(apiErrorMessage(err, 'RabbitMQ no aceptó la operación.'));
      return false;
    }
  };

  const protegidas = new Set([
    ...(colas || []).filter((c) => c.protegida).map((c) => c.nombre),
    ...exchanges.filter((e) => e.protegido).map((e) => e.nombre),
  ]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>RabbitMQ</h1>
          <p className={styles.lead}>
            Administra el clúster de mensajería a través del microservicio <strong>rabbit-admin</strong>. Los recursos
            con <Lock size={13} aria-label="candado" /> los usan los microservicios de la tienda y no se pueden eliminar.
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={cargar}>
          <RefreshCw size={15} /> Actualizar
        </button>
      </header>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      {aviso && (
        <p className="alert alert-success" role="status">
          {aviso}
        </p>
      )}

      <Colas colas={colas} operar={operar} />

      <div className={styles.dosColumnas}>
        <Exchanges exchanges={exchanges} operar={operar} />
        <Bindings bindings={bindings} exchanges={exchanges} colas={colas || []} protegidas={protegidas} operar={operar} />
      </div>
    </div>
  );
}

function Colas({ colas, operar }) {
  const [form, setForm] = useState(COLA_VACIA);

  const crear = async (e) => {
    e.preventDefault();
    const ok = await operar(
      () =>
        crearCola({
          nombre: form.nombre.trim(),
          tipo: form.tipo,
          conDlq: form.conDlq,
          ttlMs: form.ttlMs === '' ? null : Number(form.ttlMs),
        }),
      `Cola "${form.nombre.trim()}" creada${form.conDlq ? ` con su DLQ "${form.nombre.trim()}.dlq"` : ''}.`
    );
    if (ok) setForm(COLA_VACIA);
  };

  const eliminar = (c) => {
    const forzar =
      c.mensajes > 0 && window.confirm(`"${c.nombre}" tiene ${c.mensajes} mensajes pendientes. ¿Eliminarla igual?`);
    if (c.mensajes > 0 && !forzar) return;
    operar(() => eliminarCola(c.nombre, { forzar }), `Cola "${c.nombre}" eliminada.`);
  };

  return (
    <section className={styles.bloque} aria-labelledby="colas-title">
      <h2 id="colas-title">Colas</h2>
      <form className={styles.form} onSubmit={crear}>
        <input
          className="input"
          placeholder="Nombre (ej: tickets.soporte)"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          aria-label="Nombre de la cola"
        />
        <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} aria-label="Tipo de cola">
          <option value="CLASSIC">Clásica</option>
          <option value="QUORUM">Quórum (replicada)</option>
        </select>
        <input
          className="input"
          type="number"
          min="1"
          placeholder="TTL ms (opcional)"
          value={form.ttlMs}
          onChange={(e) => setForm({ ...form, ttlMs: e.target.value })}
          aria-label="Tiempo de vida de los mensajes en milisegundos"
        />
        <label className={styles.check}>
          <input type="checkbox" checked={form.conDlq} onChange={(e) => setForm({ ...form, conDlq: e.target.checked })} />
          Con DLQ
        </label>
        <button className="btn btn-primary btn-sm">Crear cola</button>
      </form>

      {colas === null ? (
        <Skeleton filas={4} alto={44} etiqueta="Cargando colas…" />
      ) : (
        <div className={styles.tablaWrap}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Mensajes</th>
                <th>Consumidores</th>
                <th>DLQ</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {colas.map((c) => (
                <tr key={c.nombre}>
                  <td className={styles.nombre}>
                    {c.protegida && <Lock size={13} aria-label="del sistema" />} {c.nombre}
                  </td>
                  <td>{c.tipo}</td>
                  <td className={c.mensajes > 0 ? styles.pendientes : ''}>{c.mensajes}</td>
                  <td>{c.consumidores}</td>
                  <td className={styles.secundario}>{c.dlq || '—'}</td>
                  <td>
                    {!c.protegida && (
                      <button className="icon-btn" aria-label={`Eliminar ${c.nombre}`} onClick={() => eliminar(c)}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Exchanges({ exchanges, operar }) {
  const [form, setForm] = useState(EXCHANGE_VACIO);

  const crear = async (e) => {
    e.preventDefault();
    const ok = await operar(
      () => crearExchange({ nombre: form.nombre.trim(), tipo: form.tipo }),
      `Exchange "${form.nombre.trim()}" (${form.tipo.toLowerCase()}) creado.`
    );
    if (ok) setForm(EXCHANGE_VACIO);
  };

  return (
    <section className={styles.bloque} aria-labelledby="exchanges-title">
      <h2 id="exchanges-title">Exchanges</h2>
      <form className={styles.form} onSubmit={crear}>
        <input
          className="input"
          placeholder="Nombre (ej: tickets.eventos)"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          aria-label="Nombre del exchange"
        />
        <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} aria-label="Tipo de exchange">
          <option value="DIRECT">direct</option>
          <option value="TOPIC">topic</option>
          <option value="FANOUT">fanout</option>
          <option value="HEADERS">headers</option>
        </select>
        <button className="btn btn-primary btn-sm">Crear</button>
      </form>
      <ul className={styles.lista}>
        {exchanges.map((e) => (
          <li key={e.nombre}>
            <span className={styles.nombre}>
              {e.protegido && <Lock size={13} aria-label="del sistema" />} {e.nombre}
            </span>
            <span className={styles.tipo}>{e.tipo}</span>
            {!e.protegido && (
              <button
                className="icon-btn"
                aria-label={`Eliminar ${e.nombre}`}
                onClick={() => operar(() => eliminarExchange(e.nombre), `Exchange "${e.nombre}" eliminado.`)}
              >
                <Trash2 size={16} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Bindings({ bindings, exchanges, colas, protegidas, operar }) {
  const [form, setForm] = useState(BINDING_VACIO);

  const crear = async (e) => {
    e.preventDefault();
    const ok = await operar(() => crearBinding(form), `"${form.cola}" conectada a "${form.exchange}".`);
    if (ok) setForm(BINDING_VACIO);
  };

  return (
    <section className={styles.bloque} aria-labelledby="bindings-title">
      <h2 id="bindings-title">Bindings</h2>
      <form className={styles.form} onSubmit={crear}>
        <select className="input" value={form.exchange} onChange={(e) => setForm({ ...form, exchange: e.target.value })} aria-label="Exchange">
          <option value="">Exchange…</option>
          {exchanges.map((x) => (
            <option key={x.nombre} value={x.nombre}>
              {x.nombre}
            </option>
          ))}
        </select>
        <select className="input" value={form.cola} onChange={(e) => setForm({ ...form, cola: e.target.value })} aria-label="Cola">
          <option value="">Cola…</option>
          {colas.filter((c) => !c.protegida).map((c) => (
            <option key={c.nombre} value={c.nombre}>
              {c.nombre}
            </option>
          ))}
        </select>
        <input
          className="input"
          placeholder="Routing key"
          value={form.routingKey}
          onChange={(e) => setForm({ ...form, routingKey: e.target.value })}
          aria-label="Routing key"
        />
        <button className="btn btn-primary btn-sm">Conectar</button>
      </form>
      <ul className={styles.lista}>
        {bindings.map((b) => (
          <li key={`${b.exchange}|${b.cola}|${b.routingKey}`}>
            <span className={styles.binding}>
              {b.exchange} → <strong>{b.cola}</strong>
              <small>{b.routingKey || '(sin routing key)'}</small>
            </span>
            {!protegidas.has(b.cola) && (
              <button
                className="icon-btn"
                aria-label={`Desconectar ${b.cola} de ${b.exchange}`}
                onClick={() => operar(() => eliminarBinding(b), `"${b.cola}" desconectada de "${b.exchange}".`)}
              >
                <Trash2 size={16} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
