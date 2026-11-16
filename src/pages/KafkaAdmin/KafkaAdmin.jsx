import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Lock, RefreshCw, Server, Trash2 } from 'lucide-react';
import {
  agregarParticiones,
  cambiarConfig,
  crearTopico,
  eliminarGrupo,
  eliminarTopico,
  getCluster,
  getGrupo,
  getGrupos,
  getTopico,
  getTopicos,
  reiniciarOffsets,
} from '../../api/kafkaAdminApi';
import { apiErrorMessage } from '../../api/httpClient';
import Skeleton from '../../components/Skeleton/Skeleton';
import styles from './KafkaAdmin.module.css';

const TOPICO_VACIO = { nombre: '', particiones: 3, replicas: 3, cleanup: 'delete', retencionHoras: '', minIsr: '2' };
const numero = (n) => new Intl.NumberFormat('es-CL').format(n || 0);

/** retention.ms legible: -1 = sin límite; si no, en días u horas. */
function retencion(ms) {
  if (ms == null) return '—';
  const n = Number(ms);
  if (n < 0) return 'Sin límite';
  const horas = n / 3_600_000;
  if (horas >= 24 && horas % 24 === 0) return `${horas / 24} ${horas === 24 ? 'día' : 'días'}`;
  if (horas >= 1) return `${Number(horas.toFixed(1))} h`;
  return `${Math.round(n / 60_000)} min`;
}

// Solo Administrador: brokers, tópicos (con particiones, réplicas y configuración) y consumer groups
// (offsets y lag) del clúster Kafka, a través del microservicio kafka-admin.
export default function KafkaAdmin() {
  const [cluster, setCluster] = useState(null);
  const [topicos, setTopicos] = useState(null);
  const [grupos, setGrupos] = useState([]);
  const [topicoSel, setTopicoSel] = useState(null);
  const [grupoSel, setGrupoSel] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(() => {
    Promise.all([getCluster(), getTopicos(), getGrupos()])
      .then(([c, t, g]) => {
        setCluster(c);
        setTopicos(t);
        setGrupos(g);
        setError('');
      })
      .catch((err) => setError(apiErrorMessage(err, 'No pudimos consultar Kafka.')));
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 5000);
    return () => clearInterval(id);
  }, [cargar]);

  // Ejecuta una operación, muestra el resultado y recarga.
  const operar = async (fn, exito) => {
    setError('');
    setAviso('');
    try {
      const resultado = await fn();
      setAviso(exito);
      cargar();
      return resultado ?? true;
    } catch (err) {
      setError(apiErrorMessage(err, 'Kafka no aceptó la operación.'));
      return null;
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Kafka</h1>
          <p className={styles.lead}>
            Administra el clúster de streaming a través del microservicio <strong>kafka-admin</strong>. Los tópicos con{' '}
            <Lock size={13} aria-label="candado" /> los usan los microservicios de la tienda: no se pueden eliminar ni
            cambiar sus particiones.
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

      {cluster && (
        <section className={styles.brokers} aria-label="Brokers del clúster">
          {cluster.brokers.map((b) => (
            <div key={b.id} className={styles.broker}>
              <Server size={18} aria-hidden="true" />
              <div>
                <strong>Broker {b.id}</strong>
                <span>
                  {b.host}:{b.puerto}
                </span>
              </div>
              {b.controlador && <span className={styles.etiqueta}>controlador</span>}
            </div>
          ))}
        </section>
      )}

      <Topicos topicos={topicos} seleccionado={topicoSel} seleccionar={setTopicoSel} operar={operar} />
      {topicoSel && <DetalleTopico key={topicoSel} nombre={topicoSel} operar={operar} cerrar={() => setTopicoSel(null)} />}

      <Grupos grupos={grupos} seleccionado={grupoSel} seleccionar={setGrupoSel} />
      {grupoSel && <DetalleGrupo key={grupoSel} grupo={grupoSel} operar={operar} cerrar={() => setGrupoSel(null)} />}
    </div>
  );
}

function Topicos({ topicos, seleccionado, seleccionar, operar }) {
  const [form, setForm] = useState(TOPICO_VACIO);

  const crear = async (e) => {
    e.preventDefault();
    const config = { 'cleanup.policy': form.cleanup, 'min.insync.replicas': form.minIsr };
    if (form.retencionHoras !== '') config['retention.ms'] = String(Number(form.retencionHoras) * 3_600_000);
    const nombre = form.nombre.trim();
    const ok = await operar(
      () => crearTopico({ nombre, particiones: Number(form.particiones), replicas: Number(form.replicas), config }),
      `Tópico "${nombre}" creado con ${form.particiones} particiones y ${form.replicas} réplicas.`
    );
    if (ok) setForm(TOPICO_VACIO);
  };

  const eliminar = (t) => {
    if (!window.confirm(`¿Eliminar el tópico "${t.nombre}" y sus ${t.mensajes} mensajes?`)) return;
    operar(() => eliminarTopico(t.nombre), `Tópico "${t.nombre}" eliminado.`);
    if (seleccionado === t.nombre) seleccionar(null);
  };

  return (
    <section className={styles.bloque} aria-labelledby="topicos-title">
      <h2 id="topicos-title">Tópicos</h2>
      <form className={styles.form} onSubmit={crear}>
        <input
          className="input"
          placeholder="Nombre (ej: promociones.eventos)"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          aria-label="Nombre del tópico"
        />
        <label className={styles.campo}>
          Particiones
          <input className="input" type="number" min="1" max="12" value={form.particiones}
            onChange={(e) => setForm({ ...form, particiones: e.target.value })} />
        </label>
        <label className={styles.campo}>
          Réplicas
          <input className="input" type="number" min="1" max="3" value={form.replicas}
            onChange={(e) => setForm({ ...form, replicas: e.target.value })} />
        </label>
        <label className={styles.campo}>
          Limpieza
          <select className="input" value={form.cleanup} onChange={(e) => setForm({ ...form, cleanup: e.target.value })}>
            <option value="delete">delete (por tiempo)</option>
            <option value="compact">compact (último por clave)</option>
          </select>
        </label>
        <label className={styles.campo}>
          Retención (h)
          <input className="input" type="number" min="1" placeholder="7 días" value={form.retencionHoras}
            onChange={(e) => setForm({ ...form, retencionHoras: e.target.value })} />
        </label>
        <label className={styles.campo}>
          ISR mín.
          <select className="input" value={form.minIsr} onChange={(e) => setForm({ ...form, minIsr: e.target.value })}>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </label>
        <button className="btn btn-primary btn-sm">Crear tópico</button>
      </form>

      {topicos === null ? (
        <Skeleton filas={4} alto={44} etiqueta="Cargando tópicos…" />
      ) : (
        <div className={styles.tablaWrap}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Particiones</th>
                <th>Réplicas</th>
                <th>Mensajes</th>
                <th>Limpieza</th>
                <th>Retención</th>
                <th>ISR mín.</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {topicos.map((t) => (
                <tr key={t.nombre} className={seleccionado === t.nombre ? styles.filaActiva : ''}>
                  <td>
                    <span className={styles.nombre}>
                      {t.protegido && <Lock size={13} aria-label="del sistema" />} {t.nombre}
                    </span>
                  </td>
                  <td>{t.particiones}</td>
                  <td>{t.replicas}</td>
                  <td>{numero(t.mensajes)}</td>
                  <td>{t.config['cleanup.policy']}</td>
                  <td>{retencion(t.config['retention.ms'])}</td>
                  <td>{t.config['min.insync.replicas']}</td>
                  <td className={styles.acciones}>
                    <button className="icon-btn" aria-label={`Ver ${t.nombre}`} onClick={() => seleccionar(t.nombre)}>
                      <ChevronRight size={16} />
                    </button>
                    {!t.protegido && (
                      <button className="icon-btn" aria-label={`Eliminar ${t.nombre}`} onClick={() => eliminar(t)}>
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

function DetalleTopico({ nombre, operar, cerrar }) {
  const [detalle, setDetalle] = useState(null);
  const [cambios, setCambios] = useState({});
  const [total, setTotal] = useState('');

  const cargar = useCallback(() => {
    getTopico(nombre).then(setDetalle).catch(() => setDetalle(null));
  }, [nombre]);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 5000);
    return () => clearInterval(id);
  }, [cargar]);

  if (!detalle) return null;

  const guardar = async (e) => {
    e.preventDefault();
    const nuevo = await operar(() => cambiarConfig(nombre, cambios), `Configuración de "${nombre}" actualizada.`);
    if (nuevo) {
      setDetalle(nuevo);
      setCambios({});
    }
  };

  const ampliar = async (e) => {
    e.preventDefault();
    const nuevo = await operar(() => agregarParticiones(nombre, Number(total)), `"${nombre}" ahora tiene ${total} particiones.`);
    if (nuevo) {
      setDetalle(nuevo);
      setTotal('');
    }
  };

  return (
    <section className={styles.bloque} aria-labelledby="detalle-topico">
      <div className={styles.bloqueHeader}>
        <h2 id="detalle-topico">
          <span className={styles.nombre}>{nombre}</span>
        </h2>
        <button className="btn btn-ghost btn-sm" onClick={cerrar}>
          Cerrar
        </button>
      </div>
      <p className={styles.secundario}>
        {detalle.particiones.length} particiones · factor de replicación {detalle.replicas} · {numero(detalle.mensajes)} mensajes
      </p>

      <div className={styles.tablaWrap}>
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>Partición</th>
              <th>Líder</th>
              <th>Réplicas</th>
              <th>ISR (sincronizadas)</th>
              <th>Offset inicial</th>
              <th>Offset final</th>
            </tr>
          </thead>
          <tbody>
            {detalle.particiones.map((p) => (
              <tr key={p.particion}>
                <td>{p.particion}</td>
                <td>{p.lider == null ? 'sin líder' : `broker ${p.lider}`}</td>
                <td>{p.replicas.join(', ')}</td>
                <td className={p.subReplicada ? styles.pendientes : ''}>
                  {p.isr.join(', ')}
                  {p.subReplicada && ' · sub-replicada'}
                </td>
                <td>{numero(p.offsetInicial)}</td>
                <td>{numero(p.offsetFinal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.dosColumnas}>
        <form className={styles.configs} onSubmit={guardar}>
          <h3>Configuración</h3>
          {detalle.config.map((c) => (
            <label key={c.nombre} className={styles.config}>
              <span className={styles.nombre}>
                {c.nombre}
                {c.personalizada && <small className={styles.etiqueta}>propia</small>}
              </span>
              <input
                className="input"
                value={cambios[c.nombre] ?? c.valor ?? ''}
                onChange={(e) => setCambios({ ...cambios, [c.nombre]: e.target.value })}
                disabled={nombre.startsWith('__')}
              />
            </label>
          ))}
          <p className={styles.secundario}>Deja un campo vacío para volver al valor por defecto del broker.</p>
          <button className="btn btn-primary btn-sm" disabled={Object.keys(cambios).length === 0}>
            Guardar configuración
          </button>
        </form>

        {!detalle.protegido && (
          <form className={styles.configs} onSubmit={ampliar}>
            <h3>Aumentar particiones</h3>
            <p className={styles.secundario}>
              Más particiones permiten más consumidores en paralelo. Kafka no permite reducirlas, y en un tópico con
              claves cambia la partición que le toca a cada clave.
            </p>
            <input className="input" type="number" min={detalle.particiones.length + 1} max="12" value={total}
              placeholder={`Más de ${detalle.particiones.length}`} onChange={(e) => setTotal(e.target.value)}
              aria-label="Nuevo total de particiones" />
            <button className="btn btn-outline btn-sm" disabled={!total}>
              Aumentar
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function Grupos({ grupos, seleccionado, seleccionar }) {
  return (
    <section className={styles.bloque} aria-labelledby="grupos-title">
      <h2 id="grupos-title">Consumer groups</h2>
      <p className={styles.secundario}>
        Cada grupo recibe todos los mensajes de sus tópicos; dentro del grupo, las particiones se reparten entre sus
        consumidores. El <strong>lag</strong> son los mensajes que el grupo aún no procesa.
      </p>
      {grupos.length === 0 ? (
        <p className={styles.secundario}>No hay consumer groups todavía.</p>
      ) : (
        <div className={styles.tablaWrap}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Estado</th>
                <th>Consumidores</th>
                <th>Tópicos</th>
                <th>Lag</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {grupos.map((g) => (
                <tr key={g.grupo} className={seleccionado === g.grupo ? styles.filaActiva : ''}>
                  <td>
                    <span className={styles.nombre}>{g.grupo}</span>
                  </td>
                  <td>
                    <span className={g.estado === 'STABLE' ? styles.estadoOk : styles.estadoInactivo}>{g.estado}</span>
                  </td>
                  <td>{g.miembros}</td>
                  <td className={styles.secundario}>{g.topicos.join(', ') || '—'}</td>
                  <td className={g.lagTotal > 0 ? styles.pendientes : ''}>{numero(g.lagTotal)}</td>
                  <td className={styles.acciones}>
                    <button className="icon-btn" aria-label={`Ver ${g.grupo}`} onClick={() => seleccionar(g.grupo)}>
                      <ChevronRight size={16} />
                    </button>
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

function DetalleGrupo({ grupo, operar, cerrar }) {
  const [detalle, setDetalle] = useState(null);

  const cargar = useCallback(() => {
    getGrupo(grupo).then(setDetalle).catch(() => setDetalle(null));
  }, [grupo]);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 3000);
    return () => clearInterval(id);
  }, [cargar]);

  if (!detalle) return null;
  const topicos = [...new Set(detalle.offsets.map((o) => o.topico))];
  const activo = detalle.miembros.length > 0;

  const mover = async (topico, posicion) => {
    const nuevo = await operar(
      () => reiniciarOffsets(grupo, topico, posicion),
      posicion === 'EARLIEST'
        ? `"${grupo}" volverá a procesar ${topico} desde el inicio.`
        : `"${grupo}" salta lo pendiente de ${topico}.`
    );
    if (nuevo) setDetalle(nuevo);
  };

  const eliminar = async () => {
    if (!window.confirm(`¿Eliminar el consumer group "${grupo}" y sus offsets?`)) return;
    if (await operar(() => eliminarGrupo(grupo), `Consumer group "${grupo}" eliminado.`)) cerrar();
  };

  return (
    <section className={styles.bloque} aria-labelledby="detalle-grupo">
      <div className={styles.bloqueHeader}>
        <h2 id="detalle-grupo">
          <span className={styles.nombre}>{grupo}</span>
        </h2>
        <button className="btn btn-ghost btn-sm" onClick={cerrar}>
          Cerrar
        </button>
      </div>
      <p className={styles.secundario}>
        Estado {detalle.estado} · asignador {detalle.asignador || '—'} · coordinador broker {detalle.coordinador ?? '—'} · lag
        total {numero(detalle.lagTotal)}
      </p>

      <h3>Consumidores y particiones asignadas</h3>
      {detalle.miembros.length === 0 ? (
        <p className={styles.secundario}>Sin consumidores activos: el microservicio que usa este grupo está detenido.</p>
      ) : (
        <ul className={styles.miembros}>
          {detalle.miembros.map((m) => (
            <li key={m.consumerId}>
              <span className={styles.nombre}>{m.clientId}</span>
              <span className={styles.secundario}>{m.host}</span>
              <span>{m.particiones.join(', ') || 'sin particiones'}</span>
            </li>
          ))}
        </ul>
      )}

      <h3>Offsets y lag por partición</h3>
      <div className={styles.tablaWrap}>
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>Tópico</th>
              <th>Partición</th>
              <th>Offset consumido</th>
              <th>Offset final</th>
              <th>Lag</th>
              <th>Consumidor</th>
            </tr>
          </thead>
          <tbody>
            {detalle.offsets.map((o) => (
              <tr key={`${o.topico}-${o.particion}`}>
                <td>
                  <span className={styles.nombre}>{o.topico}</span>
                </td>
                <td>{o.particion}</td>
                <td>{numero(o.offsetConsumido)}</td>
                <td>{numero(o.offsetFinal)}</td>
                <td className={o.lag > 0 ? styles.pendientes : ''}>{numero(o.lag)}</td>
                <td className={styles.secundario}>{o.consumidor || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.form}>
        {topicos.map((t) => (
          <span key={t} className={styles.reinicio}>
            <span className={styles.nombre}>{t}</span>
            <button className="btn btn-outline btn-sm" disabled={activo} onClick={() => mover(t, 'EARLIEST')}>
              Reprocesar desde el inicio
            </button>
            <button className="btn btn-outline btn-sm" disabled={activo} onClick={() => mover(t, 'LATEST')}>
              Saltar pendientes
            </button>
          </span>
        ))}
        <button className="btn btn-ghost btn-sm" disabled={activo} onClick={eliminar}>
          <Trash2 size={15} /> Eliminar grupo
        </button>
      </div>
      {activo && (
        <p className={styles.secundario}>
          Para mover offsets o eliminar el grupo, primero detén el microservicio que lo consume.
        </p>
      )}
    </section>
  );
}
