import httpClient from './httpClient';

// Pedidos (BFF): checkout con reserva de stock en inventario e inicio del pago.
const BASE = '/api/bff/orders';

// { entrega: 'RETIRO' | 'DESPACHO', sucursalId, direccion, metodoPago } -> { pedido, pago }
export const checkout = (datos) => httpClient.post(BASE, datos).then((res) => res.data);

export const reintentarPago = (id, metodoPago) =>
  httpClient.post(`${BASE}/${id}/pago`, { metodoPago }).then((res) => res.data);

export const cancelarPedido = (id) => httpClient.delete(`${BASE}/${id}`).then((res) => res.data);

export const getPedido = (id) => httpClient.get(`${BASE}/${id}`).then((res) => res.data);

export const getPedidos = () => httpClient.get(BASE).then((res) => res.data);

// Personal de farmacia: pedidos por preparar y entregar.
export const getPedidosPorAtender = (entregados = false) =>
  httpClient.get('/api/bff/gestion/pedidos', { params: { entregados } }).then((res) => res.data);

export const avanzarPedido = (id, estado, nota) =>
  httpClient.put(`/api/bff/gestion/pedidos/${id}/estado`, { estado, nota }).then((res) => res.data);

// { costo, gratisDesde }
export const getReglasDespacho = () => httpClient.get(`${BASE}/despacho`).then((res) => res.data);
