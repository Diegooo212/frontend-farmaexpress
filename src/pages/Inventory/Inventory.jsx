import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, CalendarClock, History, PackagePlus, PackageX, Timer } from 'lucide-react';
import { useCatalog } from '../../context/CatalogContext';
import {
  darDeBaja,
  getLotes,
  getMovimientos,
  getResumenInventario,
  getSucursales,
  ingresarLote,
} from '../../api/inventoryApi';
import { apiErrorMessage } from '../../api/httpClient';
import { formatDate, formatDateTime } from '../../utils/format';
import Modal from '../../components/Modal/Modal';
import styles from './Inventory.module.css';

const ESTADOS = [
  { valor: '', etiqueta: 'Todos' },
  { valor: 'POR_VENCER', etiqueta: 'Por vencer' },
  { valor: 'VENCIDO', etiqueta: 'Vencidos' },
  { valor: 'VIGENTE', etiqueta: 'Vigentes' },
  { valor: 'AGOTADO', etiqueta: 'Agotados' },
];

const ETIQUETA_ESTADO = { VIGENTE: 'Vigente', POR_VENCER: 'Por vencer', VENCIDO: 'Vencido', AGOTADO: 'Agotado' };

const TIPO_MOVIMIENTO = {
  INGRESO: 'Ingreso',
  RESERVA: 'Reserva',
  LIBERACION: 'Liberación',
  SALIDA: 'Venta',
  MERMA: 'Baja',
};

function vencimiento(dias) {
  if (dias < 0) return `venció hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`;
  if (dias === 0) return 'vence hoy';
  return `en ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

// Inventario por lotes. Las ventas descuentan con la regla FEFO: primero el lote que vence antes.
export default function Inventory() {
  const { medicamentos } = useCatalog();
  const [sucursales, setSucursales] = useState([]);
  const [lotes, setLotes] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [filtros, setFiltros] = useState({ sucursalId: '', medicamentoId: '', estado: '' });
  const [error, setError] = useState('');
  const [ingresoAbierto, setIngresoAbierto] = useState(false);
  const [baja, setBaja] = useState(null);
  const [historial, setHistorial] = useState(null);

  const nombre = useCallback(
    (id) => medicamentos.find((m) => m.id === id)?.nombre || `Producto #${id}`,
    [medicamentos]
  );

  const cargar = useCallback(() => {
    const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== ''));
    Promise.all([getLotes(params), getResumenInventario()])
      .then(([l, r]) => {
        setLotes(l);
        setResumen(r);
        setError('');
      })
      .catch((err) => setError(apiErrorMessage(err, 'No pudimos cargar el inventario.')));
  }, [filtros]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    getSucursales()
      .then(setSucursales)
      .catch(() => {});
  }, []);

  const cambiarFiltro = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor }));

  const kpis = useMemo(
    () =>
      resumen
        ? [
            { icono: Boxes, valor: resumen.unidadesVendibles, etiqueta: 'Unidades vendibles', tono: 'primary' },
            {
              icono: CalendarClock,
              valor: resumen.lotesPorVencer,
              etiqueta: `Lotes por vencer (≤ ${resumen.diasAlerta} días)`,
              detalle: `${resumen.unidadesPorVencer} unidades`,
              tono: 'warning',
              filtro: 'POR_VENCER',
            },
            {
              icono: AlertTriangle,
              valor: resumen.lotesVencidos,
              etiqueta: 'Lotes vencidos con stock',
              detalle: `${resumen.unidadesVencidas} unidades para dar de baja`,
              tono: 'danger',
              filtro: 'VENCIDO',
            },
            { icono: Timer, valor: resumen.reservasActivas, etiqueta: 'Reservas en pago', tono: 'muted' },
          ]
        : [],
    [resumen]
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Inventario y lotes</h1>
          <p className={styles.lead}>
            Stock por sucursal con número de lote y vencimiento. Las ventas descuentan primero del lote que vence antes
            (FEFO) y los lotes vencidos nunca se venden.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIngresoAbierto(true)}>
          <PackagePlus size={18} /> Ingresar lote
        </button>
      </header>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      <div className={styles.kpis}>
        {kpis.map(({ icono: Icono, valor, etiqueta, detalle, tono, filtro }) => (
          <button
            key={etiqueta}
            type="button"
            className={`${styles.kpi} ${styles[tono]} ${filtro && filtros.estado === filtro ? styles.kpiActivo : ''}`}
            onClick={() => filtro && cambiarFiltro('estado', filtros.estado === filtro ? '' : filtro)}
            disabled={!filtro}
          >
            <Icono size={22} aria-hidden="true" />
            <span className={styles.kpiValor}>{valor}</span>
            <span className={styles.kpiEtiqueta}>{etiqueta}</span>
            {detalle && <span className={styles.kpiDetalle}>{detalle}</span>}
          </button>
        ))}
      </div>

      <div className={styles.filtros}>
        <label className="field">
          Sucursal
          <select className="input" value={filtros.sucursalId} onChange={(e) => cambiarFiltro('sucursalId', e.target.value)}>
            <option value="">Todas</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Producto
          <select
            className="input"
            value={filtros.medicamentoId}
            onChange={(e) => cambiarFiltro('medicamentoId', e.target.value)}
          >
            <option value="">Todos</option>
            {medicamentos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.chips} role="group" aria-label="Estado del lote">
          {ESTADOS.map((e) => (
            <button
              key={e.valor}
              type="button"
              className={`${styles.chip} ${filtros.estado === e.valor ? styles.chipActivo : ''}`}
              onClick={() => cambiarFiltro('estado', e.valor)}
              aria-pressed={filtros.estado === e.valor}
            >
              {e.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.tablaWrap}>
        <table className={styles.tabla}>
          <caption className="visually-hidden">Lotes ordenados por fecha de vencimiento (FEFO)</caption>
          <thead>
            <tr>
              <th scope="col">Producto</th>
              <th scope="col">Lote</th>
              <th scope="col">Sucursal</th>
              <th scope="col">Vencimiento</th>
              <th scope="col" className={styles.num}>
                Disponible
              </th>
              <th scope="col" className={styles.num}>
                Reservado
              </th>
              <th scope="col">Estado</th>
              <th scope="col">
                <span className="visually-hidden">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lotes === null && (
              <tr>
                <td colSpan={8} className={styles.vacio}>
                  Cargando lotes…
                </td>
              </tr>
            )}
            {lotes?.length === 0 && (
              <tr>
                <td colSpan={8} className={styles.vacio}>
                  No hay lotes con esos filtros.
                </td>
              </tr>
            )}
            {lotes?.map((l) => (
              <tr key={l.id} className={l.estado === 'VENCIDO' ? styles.filaVencida : ''}>
                <td className={styles.producto}>{nombre(l.medicamentoId)}</td>
                <td className={styles.mono}>{l.numeroLote}</td>
                <td>{l.sucursal}</td>
                <td>
                  {formatDate(l.fechaVencimiento)}
                  <small className={styles.dias}>{vencimiento(l.diasParaVencer)}</small>
                </td>
                <td className={styles.num}>
                  <strong>{l.disponible}</strong>
                  <small className={styles.dias}>de {l.cantidadInicial}</small>
                </td>
                <td className={styles.num}>{l.reservada || '—'}</td>
                <td>
                  <span className={`${styles.estado} ${styles['estado_' + l.estado]}`}>{ETIQUETA_ESTADO[l.estado]}</span>
                </td>
                <td className={styles.acciones}>
                  <button
                    className="icon-btn"
                    onClick={() => setHistorial({ lote: l, movimientos: null })}
                    aria-label={`Movimientos del lote ${l.numeroLote}`}
                    title="Movimientos"
                  >
                    <History size={18} />
                  </button>
                  {l.disponible > 0 && (
                    <button
                      className="icon-btn"
                      onClick={() => setBaja(l)}
                      aria-label={`Dar de baja unidades del lote ${l.numeroLote}`}
                      title="Dar de baja"
                    >
                      <PackageX size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <IngresoLote
        isOpen={ingresoAbierto}
        onClose={() => setIngresoAbierto(false)}
        medicamentos={medicamentos}
        sucursales={sucursales}
        onGuardado={() => {
          setIngresoAbierto(false);
          cargar();
        }}
      />

      <BajaLote
        lote={baja}
        nombre={baja ? nombre(baja.medicamentoId) : ''}
        onClose={() => setBaja(null)}
        onGuardado={() => {
          setBaja(null);
          cargar();
        }}
      />

      <Movimientos
        estado={historial}
        nombre={historial ? nombre(historial.lote.medicamentoId) : ''}
        onCargado={(movimientos) => setHistorial((h) => (h ? { ...h, movimientos } : h))}
        onClose={() => setHistorial(null)}
      />

    </div>
  );
}

function IngresoLote({ isOpen, onClose, medicamentos, sucursales, onGuardado }) {
  const vacio = { medicamentoId: '', sucursalId: '', numeroLote: '', fechaVencimiento: '', cantidad: '' };
  const [datos, setDatos] = useState(vacio);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const cambiar = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));

  const cerrar = () => {
    setDatos(vacio);
    setError('');
    onClose();
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await ingresarLote({
        medicamentoId: Number(datos.medicamentoId),
        sucursalId: Number(datos.sucursalId),
        numeroLote: datos.numeroLote,
        fechaVencimiento: datos.fechaVencimiento,
        cantidad: Number(datos.cantidad),
      });
      setDatos(vacio);
      onGuardado();
    } catch (err) {
      setError(apiErrorMessage(err, 'No pudimos ingresar el lote.'));
    } finally {
      setGuardando(false);
    }
  };

  // Mínimo para la fecha de vencimiento: mañana (se calcula una vez al abrir la página).
  const [manana] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));

  return (
    <Modal isOpen={isOpen} onClose={cerrar} title="Ingresar lote">
      <form className={styles.form} onSubmit={guardar}>
        <label className="field">
          Producto
          <select className="input" required value={datos.medicamentoId} onChange={cambiar('medicamentoId')}>
            <option value="">Elige un producto</option>
            {medicamentos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Sucursal
          <select className="input" required value={datos.sucursalId} onChange={cambiar('sucursalId')}>
            <option value="">Elige la sucursal</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.formFila}>
          <label className="field">
            Número de lote
            <input
              className="input"
              required
              maxLength={40}
              value={datos.numeroLote}
              onChange={cambiar('numeroLote')}
              placeholder="PAR-2610-A"
            />
          </label>
          <label className="field">
            Cantidad
            <input className="input" required type="number" min="1" value={datos.cantidad} onChange={cambiar('cantidad')} />
          </label>
        </div>
        <label className="field">
          Fecha de vencimiento
          <input
            className="input"
            required
            type="date"
            min={manana}
            value={datos.fechaVencimiento}
            onChange={cambiar('fechaVencimiento')}
          />
          <span className="field-hint">No se aceptan lotes vencidos.</span>
        </label>
        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-block" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Ingresar lote'}
        </button>
      </form>
    </Modal>
  );
}

function BajaLote({ lote, nombre, onClose, onGuardado }) {
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const vencido = lote?.estado === 'VENCIDO';

  const cerrar = () => {
    setCantidad('');
    setMotivo('');
    setError('');
    onClose();
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await darDeBaja(lote.id, Number(cantidad || lote.disponible), motivo || (vencido ? 'Vencido' : ''));
      setCantidad('');
      setMotivo('');
      onGuardado();
    } catch (err) {
      setError(apiErrorMessage(err, 'No pudimos dar de baja las unidades.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal isOpen={Boolean(lote)} onClose={cerrar} title="Dar de baja unidades">
      {lote && (
        <form className={styles.form} onSubmit={guardar}>
          <p className={styles.muted}>
            {nombre} · lote <strong>{lote.numeroLote}</strong> en {lote.sucursal}. Disponibles: {lote.disponible}.
          </p>
          <label className="field">
            Cantidad
            <input
              className="input"
              type="number"
              min="1"
              max={lote.disponible}
              placeholder={String(lote.disponible)}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </label>
          <label className="field">
            Motivo
            <input
              className="input"
              required={!vencido}
              maxLength={120}
              placeholder={vencido ? 'Vencido' : 'Dañado, pérdida…'}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </label>
          {error && (
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-danger btn-block" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Dar de baja'}
          </button>
        </form>
      )}
    </Modal>
  );
}

function Movimientos({ estado, nombre, onCargado, onClose }) {
  const loteId = estado?.lote.id;
  useEffect(() => {
    if (!loteId) return;
    getMovimientos(loteId)
      .then(onCargado)
      .catch(() => onCargado([]));
    // onCargado cambia en cada render del padre; solo importa el lote.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loteId]);

  return (
    <Modal isOpen={Boolean(estado)} onClose={onClose} title="Movimientos del lote" wide>
      {estado && (
        <>
          <p className={styles.muted}>
            {nombre} · lote <strong>{estado.lote.numeroLote}</strong> · {estado.lote.sucursal}
          </p>
          {estado.movimientos === null ? (
            <p className={styles.muted}>Cargando…</p>
          ) : (
            <ol className={styles.movimientos}>
              {estado.movimientos.map((m) => (
                <li key={m.id} className={styles[`mov_${m.tipo}`]}>
                  <span className={styles.movTipo}>{TIPO_MOVIMIENTO[m.tipo] || m.tipo}</span>
                  <span className={styles.movCantidad}>
                    {m.tipo === 'INGRESO' || m.tipo === 'LIBERACION' ? '+' : '−'}
                    {m.cantidad}
                  </span>
                  <span className={styles.movDetalle}>
                    {m.referencia}
                    <small>
                      {formatDateTime(m.fecha)} · {m.usuario}
                    </small>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </Modal>
  );
}
