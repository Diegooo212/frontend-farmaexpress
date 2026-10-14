// Apoyo del checkout: fechas estimadas de entrega y datos de los medios de pago.

const DIA = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
const HORA = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' });

function sumarDiasHabiles(fecha, dias) {
  const d = new Date(fecha);
  let restantes = dias;
  while (restantes > 0) {
    d.setDate(d.getDate() + 1);
    const dia = d.getDay();
    if (dia !== 0 && dia !== 6) restantes -= 1;
  }
  return d;
}

// Retiro: la farmacia prepara el pedido en ~2 horas (horario 9:00 a 20:00).
export function estimarRetiro(ahora = new Date()) {
  const listo = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
  if (listo.getHours() >= 20 || listo.getDate() !== ahora.getDate()) {
    const manana = new Date(ahora);
    manana.setDate(manana.getDate() + 1);
    manana.setHours(10, 0, 0, 0);
    return `Listo para retirar el ${DIA.format(manana)} desde las 10:00`;
  }
  if (listo.getHours() < 9) listo.setHours(10, 0, 0, 0);
  return `Listo para retirar hoy desde las ${HORA.format(listo)}`;
}

// Despacho: 1 a 2 días hábiles desde el almacén central.
export function estimarDespacho(ahora = new Date()) {
  const desde = sumarDiasHabiles(ahora, 1);
  const hasta = sumarDiasHabiles(ahora, 2);
  return `Llega entre el ${DIA.format(desde)} y el ${DIA.format(hasta)}`;
}

export const METODOS_PAGO = {
  WEBPAY: { nombre: 'Webpay', marca: 'webpay', color: '#d6006f' },
  MERCADOPAGO: { nombre: 'Mercado Pago', marca: 'mercado pago', color: '#009ee3' },
  KHIPU: { nombre: 'Khipu', marca: 'khipu', color: '#7b3fe4' },
};

export const nombreMetodo = (codigo) => METODOS_PAGO[codigo]?.nombre || codigo || '';

export const ESTADOS_PEDIDO = {
  PENDIENTE_PAGO: { etiqueta: 'Esperando pago', tono: 'warning' },
  PAGADO: { etiqueta: 'Pagado', tono: 'success' },
  EN_PREPARACION: { etiqueta: 'En preparación', tono: 'info' },
  LISTO_RETIRO: { etiqueta: 'Listo para retiro', tono: 'success' },
  EN_CAMINO: { etiqueta: 'En camino', tono: 'info' },
  ENTREGADO: { etiqueta: 'Entregado', tono: 'muted' },
  PAGO_RECHAZADO: { etiqueta: 'Pago rechazado', tono: 'danger' },
  EXPIRADO: { etiqueta: 'Expirado', tono: 'muted' },
  CANCELADO: { etiqueta: 'Cancelado', tono: 'muted' },
};

// Seguimiento del pedido una vez pagado (como en las tiendas: pagado → preparación → listo/en camino → entregado).
export function pasosSeguimiento(pedido) {
  const despacho = pedido?.entrega === 'DESPACHO';
  return [
    { estado: 'PAGADO', titulo: 'Pago confirmado' },
    { estado: 'EN_PREPARACION', titulo: 'En preparación' },
    despacho
      ? { estado: 'EN_CAMINO', titulo: 'En camino' }
      : { estado: 'LISTO_RETIRO', titulo: `Listo para retiro${pedido?.sucursal ? ` en ${pedido.sucursal}` : ''}` },
    { estado: 'ENTREGADO', titulo: 'Entregado' },
  ];
}

// ¿Se puede pagar (o reintentar) todavía? Mientras dure la reserva de stock.
export const admitePago = (pedido) =>
  ['PENDIENTE_PAGO', 'PAGO_RECHAZADO'].includes(pedido?.estado) &&
  (!pedido.expiraEn || new Date(pedido.expiraEn) > new Date());
