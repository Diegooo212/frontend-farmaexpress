import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  Clock,
  FileText,
  Lock,
  MapPin,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { usePrescriptions } from '../../context/PrescriptionsContext';
import { useCatalog } from '../../context/CatalogContext';
import { checkout, getPedido, getReglasDespacho, reintentarPago } from '../../api/ordersApi';
import { getCobertura } from '../../api/inventoryApi';
import { getMetodosPago, irAlProveedor } from '../../api/paymentsApi';
import { agregarDireccion, getDirecciones } from '../../api/accountApi';
import { apiErrorMessage } from '../../api/httpClient';
import { formatCLP, formatDateTime } from '../../utils/format';
import { admitePago, estimarDespacho, estimarRetiro, nombreMetodo } from '../../utils/checkout';
import { STATUS_LABELS, isOwnReceta } from '../../utils/prescriptionStatus';
import MedBox from '../../components/MedBox/MedBox';
import PaymentMethodLogo from '../../components/PaymentMethodLogo/PaymentMethodLogo';
import styles from './Checkout.module.css';
import Skeleton from '../../components/Skeleton/Skeleton';

const REGLAS_POR_DEFECTO = { costo: 2990, gratisDesde: 25000 };
const REFRESCO_METODOS_MS = 15000;

// Checkout en una sola página: entrega → medio de pago, con el resumen siempre visible.
// Con ?pedido=ID se reintenta el pago de un pedido que ya tiene su stock reservado.
export default function Checkout() {
  const [params] = useSearchParams();
  const pedidoParam = params.get('pedido');
  const navigate = useNavigate();
  const { items, total: subtotalCarrito, sincronizar, conBackend, updateQty } = useCart();
  const { medicamentos } = useCatalog();

  const [pedido, setPedido] = useState(null);
  const [cargandoPedido, setCargandoPedido] = useState(Boolean(pedidoParam));
  const [reglas, setReglas] = useState(REGLAS_POR_DEFECTO);
  const [cobertura, setCobertura] = useState(null);
  const [metodos, setMetodos] = useState([]);

  const [entrega, setEntrega] = useState('RETIRO');
  const [sucursalId, setSucursalId] = useState(null);
  const [calle, setCalle] = useState('');
  const [depto, setDepto] = useState('');
  const [comuna, setComuna] = useState('');
  // Direcciones guardadas en Mi cuenta: se elige una, o "nueva" para escribir otra.
  const [direcciones, setDirecciones] = useState([]);
  const [direccionElegida, setDireccionElegida] = useState(null);
  const [guardarDireccion, setGuardarDireccion] = useState(true);
  const [aliasNueva, setAliasNueva] = useState('');
  const [metodo, setMetodo] = useState('');
  const [recetaId, setRecetaId] = useState(null);
  const { user } = useAuth();
  const { recetas } = usePrescriptions();

  const [enviando, setEnviando] = useState(false);
  // Pago iniciado: el botón muestra un check un momento antes de ir al proveedor.
  const [listo, setListo] = useState(false);
  const [redirigiendo, setRedirigiendo] = useState('');
  const [error, setError] = useState('');

  const reintento = Boolean(pedidoParam);

  // Pedido existente (reintento de pago).
  useEffect(() => {
    if (!pedidoParam) return undefined;
    let cancelado = false;
    getPedido(pedidoParam)
      .then((p) => {
        if (cancelado) return;
        setPedido(p);
        if (p.detallePago && p.estado !== 'PAGADO') setError(p.detallePago);
      })
      .catch((err) => !cancelado && setError(apiErrorMessage(err, 'No encontramos ese pedido.')))
      .finally(() => !cancelado && setCargandoPedido(false));
    return () => {
      cancelado = true;
    };
  }, [pedidoParam]);

  useEffect(() => {
    if (reintento || !conBackend) return;
    getDirecciones()
      .then((lista) => {
        setDirecciones(lista);
        // La predeterminada queda elegida de entrada.
        setDireccionElegida(lista.find((d) => d.predeterminada)?.id ?? lista[0]?.id ?? 'nueva');
      })
      .catch(() => setDireccionElegida('nueva'));
  }, [reintento, conBackend]);

  useEffect(() => {
    getReglasDespacho()
      .then(setReglas)
      .catch(() => {});
  }, []);

  // Medios de pago y el estado de su circuit breaker (se refresca: un proveedor caído vuelve solo).
  const cargarMetodos = useCallback(() => {
    getMetodosPago()
      .then(setMetodos)
      .catch(() => setMetodos([]));
  }, []);

  useEffect(() => {
    cargarMetodos();
    const id = setInterval(cargarMetodos, REFRESCO_METODOS_MS);
    return () => clearInterval(id);
  }, [cargarMetodos]);

  // Qué farmacias (y el almacén central) pueden entregar el carrito completo.
  const clave = items.map((i) => `${i.id}:${i.cantidad}`).join(',');
  useEffect(() => {
    if (reintento || !conBackend || items.length === 0) return undefined;
    let cancelado = false;
    getCobertura(items)
      .then((c) => !cancelado && setCobertura(c))
      .catch(() => !cancelado && setCobertura([]));
    return () => {
      cancelado = true;
    };
    // items cambia de referencia en cada render; "clave" resume su contenido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, reintento, conBackend]);

  const farmacias = useMemo(() => (cobertura || []).filter((s) => s.tipo === 'FARMACIA'), [cobertura]);
  const ningunaFarmacia = cobertura !== null && farmacias.length > 0 && farmacias.every((f) => !f.completo);

  // Un pedido sale de un solo lugar: si esa farmacia (o el central) no tiene todo, se deja el carrito
  // con lo que sí tiene. Los productos que no tiene se quitan.
  const ajustarA = (sucursal) => {
    sucursal.faltantes.forEach((f) => updateQty(f.medicamentoId, f.disponible));
    if (sucursal.tipo === 'FARMACIA') setSucursalId(sucursal.sucursalId);
    setError('');
  };
  const central = useMemo(() => (cobertura || []).find((s) => s.tipo === 'CENTRAL'), [cobertura]);

  // Si la farmacia elegida ya no tiene stock, se deselecciona.
  const sucursalElegida = farmacias.find((f) => f.sucursalId === sucursalId && f.completo) ? sucursalId : null;
  const metodoElegido = metodos.find((m) => m.codigo === metodo && m.disponible) ? metodo : '';

  // Resumen: del pedido (reintento) o del carrito.
  const lineas = reintento
    ? (pedido?.items || []).map((i) => ({ ...i, medicamento: medicamentos.find((m) => m.id === i.id) }))
    : items.map((i) => ({ ...i, medicamento: medicamentos.find((m) => m.id === i.id) }));
  const subtotal = reintento ? pedido?.subtotal ?? 0 : subtotalCarrito;
  const despachoGratis = subtotal >= reglas.gratisDesde;
  const costoDespacho = reintento
    ? pedido?.costoDespacho ?? 0
    : entrega === 'DESPACHO' && !despachoGratis
      ? reglas.costo
      : 0;
  const totalAPagar = reintento ? pedido?.total ?? 0 : subtotal + costoDespacho;
  const faltaParaGratis = Math.max(0, reglas.gratisDesde - subtotal);

  // Venta bajo receta: si el carrito tiene productos que la exigen, hay que elegir una receta validada.
  const productosConReceta = reintento
    ? []
    : items.filter((i) => medicamentos.find((m) => m.id === i.id)?.requiereReceta);
  const necesitaReceta = productosConReceta.length > 0;
  const misRecetas = recetas
    .filter((r) => isOwnReceta(r, user) && !['RECHAZADA', 'DISPENSADA'].includes(r.status))
    .sort((a, b) => String(b.fechaCreacion).localeCompare(String(a.fechaCreacion)));
  const esValidada = (r) => ['VALIDADA', 'EN_PREPARACION', 'LISTA_RETIRO'].includes(r.status);
  const recetaElegida = misRecetas.find((r) => r.id === recetaId && esValidada(r)) ? recetaId : null;
  const recetaLista = !necesitaReceta || Boolean(recetaElegida);

  const guardada = direcciones.find((d) => d.id === direccionElegida) || null;
  const usaNueva = !guardada;
  const direccionCompleta = guardada
    ? guardada.completa
    : [calle.trim(), depto.trim(), comuna.trim()].filter(Boolean).join(', ');
  const entregaLista = reintento
    ? true
    : entrega === 'RETIRO'
      ? Boolean(sucursalElegida)
      : (guardada || (calle.trim().length >= 5 && comuna.trim().length >= 3)) && central?.completo !== false;
  const puedePagar = entregaLista && recetaLista && Boolean(metodoElegido) && !enviando && totalAPagar > 0;

  const pagar = async () => {
    setEnviando(true);
    setError('');
    try {
      let respuesta;
      if (reintento) {
        respuesta = await reintentarPago(pedido.id, metodoElegido);
      } else {
        await sincronizar();
        // "Guardar esta dirección" en Mi cuenta (si falla, igual se compra).
        if (entrega === 'DESPACHO' && usaNueva && guardarDireccion && direcciones.length < 5) {
          await agregarDireccion({
            alias: aliasNueva.trim() || 'Mi dirección',
            calle: calle.trim(),
            depto: depto.trim(),
            comuna: comuna.trim(),
            predeterminada: direcciones.length === 0,
          }).catch(() => {});
        }
        respuesta = await checkout({
          entrega,
          sucursalId: entrega === 'RETIRO' ? sucursalElegida : null,
          direccion: entrega === 'DESPACHO' ? direccionCompleta : null,
          metodoPago: metodoElegido,
          recetaId: necesitaReceta ? recetaElegida : null,
        });
      }
      if (respuesta.pago?.redireccion) {
        setListo(true);
        await new Promise((r) => setTimeout(r, 700));
        setRedirigiendo(nombreMetodo(metodoElegido));
        irAlProveedor(respuesta.pago.redireccion);
        return;
      }
      // El pedido quedó creado con su stock reservado, pero el proveedor no respondió:
      // se queda en esta página para pagar con otro medio.
      setError(respuesta.pago?.error || 'No pudimos iniciar el pago. Elige otro medio de pago.');
      cargarMetodos();
      if (!reintento) navigate(`/checkout?pedido=${respuesta.pedido.id}`, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'No pudimos completar la compra.'));
      cargarMetodos();
      if (!reintento && conBackend) getCobertura(items).then(setCobertura).catch(() => {});
    } finally {
      setEnviando(false);
    }
  };

  if (!conBackend) {
    return (
      <section className={styles.page}>
        <div className={styles.aviso}>
          <AlertTriangle size={28} />
          <h1>No pudimos conectar con FarmaExpress</h1>
          <p>Por ahora no es posible completar la compra. Tu carrito queda guardado: intenta de nuevo en unos minutos.</p>
          <Link to="/catalogo" className="btn btn-primary">
            Volver al catálogo
          </Link>
        </div>
      </section>
    );
  }

  if (cargandoPedido) {
    return (
      <section className={styles.page}>
        <Skeleton filas={3} alto={110} etiqueta="Cargando tu pedido…" />
      </section>
    );
  }

  if (!reintento && items.length === 0) {
    return (
      <section className={styles.page}>
        <div className={styles.aviso}>
          <h1>Tu carrito está vacío</h1>
          <p>Agrega productos desde el catálogo para comprar.</p>
          <Link to="/catalogo" className="btn btn-primary">
            Ver catálogo
          </Link>
        </div>
      </section>
    );
  }

  if (reintento && pedido && !admitePago(pedido)) {
    return (
      <section className={styles.page}>
        <div className={styles.aviso}>
          <h1>{pedido.estado === 'PAGADO' ? 'Este pedido ya está pagado' : 'Este pedido ya no se puede pagar'}</h1>
          <p>
            {pedido.estado === 'PAGADO'
              ? 'Puedes revisar su estado en Mis pedidos.'
              : 'La reserva de los productos expiró o el pedido fue cancelado. Vuelve a comprar desde el carrito.'}
          </p>
          <Link to="/mis-pedidos" className="btn btn-primary">
            Ver mis pedidos
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      {redirigiendo && (
        <div className={styles.overlay} role="status" aria-live="assertive">
          <div className={styles.overlayBox}>
            <span className={styles.spinner} aria-hidden="true" />
            <p>Te estamos llevando a {redirigiendo}…</p>
            <small>No cierres esta ventana.</small>
          </div>
        </div>
      )}

      <Link to="/catalogo" className={styles.volver}>
        <ChevronLeft size={18} /> Seguir comprando
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{reintento ? `Pagar pedido #${pedido?.id}` : 'Finalizar compra'}</h1>
        <ol className={styles.pasos} aria-label="Pasos de la compra">
          <li className={styles.pasoHecho}>
            <Check size={14} /> Carrito
          </li>
          <li className={styles.pasoActual} aria-current="step">
            Entrega y pago
          </li>
          <li>Confirmación</li>
        </ol>
      </header>

      <div className={styles.grid}>
        <div className={styles.columna}>
          {/* 1. Entrega */}
          <section className={styles.bloque} aria-labelledby="titulo-entrega">
            <h2 id="titulo-entrega" className={styles.bloqueTitulo}>
              <span className={styles.numero}>1</span> ¿Cómo quieres recibir tu pedido?
            </h2>

            {reintento ? (
              <div className={styles.entregaFija}>
                {pedido?.entrega === 'DESPACHO' ? <Truck size={22} /> : <Store size={22} />}
                <div>
                  <strong>{pedido?.entrega === 'DESPACHO' ? 'Despacho a domicilio' : `Retiro en ${pedido?.sucursal}`}</strong>
                  {pedido?.direccion && <p>{pedido.direccion}</p>}
                  {pedido?.expiraEn && (
                    <p className={styles.reservaNota}>
                      <Clock size={14} /> Tus productos están reservados hasta las {formatDateTime(pedido.expiraEn)}.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className={styles.opciones} role="radiogroup" aria-label="Tipo de entrega">
                  <label className={`${styles.opcion} ${entrega === 'RETIRO' ? styles.opcionActiva : ''}`}>
                    <input
                      type="radio"
                      name="entrega"
                      value="RETIRO"
                      checked={entrega === 'RETIRO'}
                      onChange={() => setEntrega('RETIRO')}
                    />
                    <Store size={24} aria-hidden="true" />
                    <span className={styles.opcionTexto}>
                      <strong>Retiro en farmacia</strong>
                      <small>{estimarRetiro()}</small>
                    </span>
                    <span className={styles.precioEntrega}>Gratis</span>
                  </label>
                  <label className={`${styles.opcion} ${entrega === 'DESPACHO' ? styles.opcionActiva : ''}`}>
                    <input
                      type="radio"
                      name="entrega"
                      value="DESPACHO"
                      checked={entrega === 'DESPACHO'}
                      onChange={() => setEntrega('DESPACHO')}
                    />
                    <Truck size={24} aria-hidden="true" />
                    <span className={styles.opcionTexto}>
                      <strong>Despacho a domicilio</strong>
                      <small>{estimarDespacho()}</small>
                    </span>
                    <span className={styles.precioEntrega}>{despachoGratis ? 'Gratis' : formatCLP(reglas.costo)}</span>
                  </label>
                </div>

                {entrega === 'RETIRO' ? (
                  <fieldset className={styles.sucursales}>
                    <legend>Elige la farmacia</legend>
                    {cobertura === null && <p className={styles.cargando}>Revisando el stock de cada farmacia…</p>}
                    {ningunaFarmacia && (
                      <p className="alert alert-info" role="status">
                        Ninguna farmacia tiene todo tu carrito. Puedes ajustarlo a lo que tiene una de ellas, o elegir
                        despacho a domicilio.
                      </p>
                    )}
                    {farmacias.map((f) => {
                      const faltan = f.faltantes.map((x) => x.nombre || `producto ${x.medicamentoId}`);
                      return (
                        <label
                          key={f.sucursalId}
                          className={`${styles.sucursal} ${sucursalElegida === f.sucursalId ? styles.opcionActiva : ''} ${
                            f.completo ? '' : styles.deshabilitada
                          }`}
                        >
                          <input
                            type="radio"
                            name="sucursal"
                            disabled={!f.completo}
                            checked={sucursalElegida === f.sucursalId}
                            onChange={() => setSucursalId(f.sucursalId)}
                          />
                          <MapPin size={18} aria-hidden="true" />
                          <span className={styles.opcionTexto}>
                            <strong>{f.nombre}</strong>
                            <small>
                              {f.direccion}, {f.comuna}
                            </small>
                          </span>
                          <span className={f.completo ? styles.chipOk : styles.chipFalta}>
                            {f.completo ? 'Todo disponible' : `Falta: ${faltan.join(', ')}`}
                          </span>
                          {!f.completo && (
                            <span className={styles.ajuste}>
                              {f.faltantes.map((x) => (
                                <small key={x.medicamentoId}>
                                  {x.nombre || `Producto ${x.medicamentoId}`}: tiene {x.disponible}, pediste {x.solicitado}
                                </small>
                              ))}
                              <button type="button" className="btn btn-outline btn-sm" onClick={() => ajustarA(f)}>
                                Ajustar mi carrito a esta farmacia
                              </button>
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </fieldset>
                ) : (
                  <div className={styles.direccion}>
                    {central && !central.completo && (
                      <div className={`alert alert-error ${styles.ajusteDespacho}`} role="alert">
                        <span>
                          Para despacho nos falta stock de:{' '}
                          {central.faltantes
                            .map((x) => `${x.nombre || `producto ${x.medicamentoId}`} (hay ${x.disponible}, pediste ${x.solicitado})`)
                            .join(', ')}
                          .
                        </span>
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => ajustarA(central)}>
                          Ajustar mi carrito para despacho
                        </button>
                      </div>
                    )}
                    {direcciones.length > 0 && (
                      <div className={styles.sucursales} role="radiogroup" aria-label="Dirección de despacho">
                        {direcciones.map((d) => (
                          <label
                            key={d.id}
                            className={`${styles.sucursal} ${direccionElegida === d.id ? styles.opcionActiva : ''}`}
                          >
                            <input
                              type="radio"
                              name="direccion"
                              checked={direccionElegida === d.id}
                              onChange={() => setDireccionElegida(d.id)}
                            />
                            <MapPin size={18} aria-hidden="true" />
                            <span className={styles.opcionTexto}>
                              <strong>{d.alias}</strong>
                              <small>{d.completa}</small>
                            </span>
                          </label>
                        ))}
                        <label className={`${styles.sucursal} ${usaNueva ? styles.opcionActiva : ''}`}>
                          <input
                            type="radio"
                            name="direccion"
                            checked={usaNueva}
                            onChange={() => setDireccionElegida('nueva')}
                          />
                          <MapPin size={18} aria-hidden="true" />
                          <span className={styles.opcionTexto}>
                            <strong>Otra dirección</strong>
                          </span>
                        </label>
                      </div>
                    )}
                    {usaNueva && (
                      <>
                        <label className="field">
                          Calle y número
                          <input
                            className="input"
                            value={calle}
                            onChange={(e) => setCalle(e.target.value)}
                            placeholder="Av. Providencia 1234"
                            autoComplete="address-line1"
                            maxLength={120}
                          />
                        </label>
                        <div className={styles.fila}>
                          <label className="field">
                            Depto. u oficina <span className="field-hint">(opcional)</span>
                            <input
                              className="input"
                              value={depto}
                              onChange={(e) => setDepto(e.target.value)}
                              autoComplete="address-line2"
                              maxLength={30}
                            />
                          </label>
                          <label className="field">
                            Comuna
                            <input
                              className="input"
                              value={comuna}
                              onChange={(e) => setComuna(e.target.value)}
                              placeholder="Providencia"
                              autoComplete="address-level2"
                              maxLength={40}
                            />
                          </label>
                        </div>
                        {direcciones.length < 5 && (
                          <div className={styles.guardarDireccion}>
                            <label className={styles.checkGuardar}>
                              <input
                                type="checkbox"
                                checked={guardarDireccion}
                                onChange={(e) => setGuardarDireccion(e.target.checked)}
                              />
                              Guardar esta dirección en Mi cuenta
                            </label>
                            {guardarDireccion && (
                              <input
                                className="input"
                                maxLength={40}
                                placeholder="Nombre, por ejemplo: Casa"
                                value={aliasNueva}
                                onChange={(e) => setAliasNueva(e.target.value)}
                                aria-label="Nombre de la dirección"
                              />
                            )}
                          </div>
                        )}
                      </>
                    )}
                    <p className="field-hint">Despachamos desde nuestro almacén central a la Región Metropolitana.</p>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Receta (solo si el carrito tiene productos de venta bajo receta) */}
          {necesitaReceta && (
            <section className={styles.bloque} aria-labelledby="titulo-receta">
              <h2 id="titulo-receta" className={styles.bloqueTitulo}>
                <span className={styles.numero}>2</span> Receta médica
              </h2>
              <p className={styles.textoAyuda}>
                <FileText size={16} aria-hidden="true" /> {productosConReceta.map((p) => p.nombre).join(', ')}{' '}
                {productosConReceta.length === 1 ? 'es' : 'son'} de venta bajo receta. Elige la receta que validó nuestro
                químico farmacéutico. Cada receta sirve para una compra.
              </p>

              {misRecetas.length === 0 ? (
                <div className="alert alert-info">
                  Aún no tienes recetas. <Link to="/mis-recetas">Envía tu receta</Link> y te avisaremos cuando esté
                  validada para que puedas comprar.
                </div>
              ) : (
                <div className={styles.metodos} role="radiogroup" aria-label="Receta médica">
                  {misRecetas.map((r) => {
                    const valida = esValidada(r);
                    return (
                      <label
                        key={r.id}
                        className={`${styles.metodo} ${recetaElegida === r.id ? styles.opcionActiva : ''} ${
                          valida ? '' : styles.deshabilitada
                        }`}
                      >
                        <input
                          type="radio"
                          name="receta"
                          disabled={!valida}
                          checked={recetaElegida === r.id}
                          onChange={() => setRecetaId(r.id)}
                        />
                        <FileText size={22} aria-hidden="true" />
                        <span className={styles.opcionTexto}>
                          <strong>
                            Receta #{r.id} · {r.pacienteNombre}
                          </strong>
                          <small>Enviada el {formatDateTime(r.fechaCreacion)}</small>
                        </span>
                        <span className={valida ? styles.chipOk : styles.chipModo}>
                          {valida ? 'Validada' : `${STATUS_LABELS[r.status] || r.status}: en revisión`}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Pago */}
          <section className={styles.bloque} aria-labelledby="titulo-pago">
            <h2 id="titulo-pago" className={styles.bloqueTitulo}>
              <span className={styles.numero}>{necesitaReceta ? 3 : 2}</span> Medio de pago
            </h2>

            {error && (
              <p className="alert alert-error" role="alert">
                {error}
              </p>
            )}

            <div className={styles.metodos} role="radiogroup" aria-label="Medio de pago">
              {metodos.length === 0 && <p className={styles.cargando}>Cargando medios de pago…</p>}
              {metodos.map((m) => (
                <label
                  key={m.codigo}
                  className={`${styles.metodo} ${metodoElegido === m.codigo ? styles.opcionActiva : ''} ${
                    m.disponible ? '' : styles.deshabilitada
                  }`}
                >
                  <input
                    type="radio"
                    name="metodo"
                    value={m.codigo}
                    disabled={!m.disponible}
                    checked={metodoElegido === m.codigo}
                    onChange={() => setMetodo(m.codigo)}
                  />
                  <PaymentMethodLogo codigo={m.codigo} />
                  <span className={styles.opcionTexto}>
                    <strong>{m.nombre}</strong>
                    <small>
                      {m.disponible
                        ? m.descripcion
                        : `No disponible por el momento. Estamos teniendo problemas para conectar con ${m.nombre}; elige otro medio.`}
                    </small>
                  </span>
                  {!m.disponible && <span className={styles.chipFalta}>No disponible</span>}
                </label>
              ))}
            </div>

          </section>
        </div>

        {/* Resumen */}
        <aside className={styles.resumen} aria-labelledby="titulo-resumen">
          <h2 id="titulo-resumen" className={styles.resumenTitulo}>
            Resumen del pedido
          </h2>
          <ul className={styles.lineas}>
            {lineas.map((l) => (
              <li key={l.id} className={styles.linea}>
                <MedBox medicamento={l.medicamento || l} size="sm" className={styles.miniatura} />
                <span className={styles.lineaNombre}>
                  {l.nombre}
                  <small>
                    {l.cantidad} × {formatCLP(l.precio)}
                  </small>
                </span>
                <span className={styles.lineaTotal}>{formatCLP(l.precio * l.cantidad)}</span>
              </li>
            ))}
          </ul>

          <dl className={styles.totales}>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatCLP(subtotal)}</dd>
            </div>
            <div>
              <dt>{(reintento ? pedido?.entrega : entrega) === 'DESPACHO' ? 'Despacho' : 'Retiro en farmacia'}</dt>
              <dd>{costoDespacho === 0 ? 'Gratis' : formatCLP(costoDespacho)}</dd>
            </div>
            <div className={styles.total}>
              <dt>Total</dt>
              <dd>{formatCLP(totalAPagar)}</dd>
            </div>
          </dl>

          {!reintento && entrega === 'DESPACHO' && faltaParaGratis > 0 && (
            <div className={styles.gratis}>
              <p>
                Te faltan <strong>{formatCLP(faltaParaGratis)}</strong> para el despacho gratis.
              </p>
              <div className={styles.barra} aria-hidden="true">
                <span style={{ width: `${Math.min(100, (subtotal / reglas.gratisDesde) * 100)}%` }} />
              </div>
            </div>
          )}

          <button
            className={`btn btn-primary btn-block ${styles.pagar} ${enviando ? styles.pagando : ''} ${listo ? styles.pagoListo : ''}`}
            onClick={pagar}
            disabled={!puedePagar || listo}
            aria-busy={enviando}
          >
            {listo ? (
              <>
                <span className={styles.checkPago} aria-hidden="true">
                  <Check size={18} strokeWidth={3} />
                </span>
                ¡Listo! Te llevamos a pagar…
              </>
            ) : enviando ? (
              <>
                <span className={styles.ruedita} aria-hidden="true" />
                Procesando…
              </>
            ) : (
              <>
                <Lock size={17} />
                {`Pagar ${formatCLP(totalAPagar)}`}
              </>
            )}
          </button>
          {!puedePagar && !enviando && (
            <p className={styles.falta}>
              {!entregaLista
                ? entrega === 'RETIRO'
                  ? 'Elige la farmacia de retiro.'
                  : 'Completa la dirección de despacho.'
                : !recetaLista
                  ? 'Elige una receta validada.'
                  : 'Elige un medio de pago.'}
            </p>
          )}
          <p className={styles.seguro}>
            <ShieldCheck size={16} /> Pago seguro: te llevaremos al sitio de {metodoElegido ? nombreMetodo(metodoElegido) : 'tu medio de pago'}. FarmaExpress no guarda los datos de tu tarjeta.
          </p>
        </aside>
      </div>
    </section>
  );
}
