import httpClient from './httpClient';

// Inventario por sucursal y lotes (regla FEFO).
const BASE = '/api/bff/inventory';

// Públicos (tienda)
export const getSucursales = () => httpClient.get(`${BASE}/sucursales`).then((res) => res.data);

export const getDisponibilidad = (medicamentoId) =>
  httpClient.get(`${BASE}/disponibilidad/${medicamentoId}`).then((res) => res.data);

// Qué sucursales pueden entregar el carrito completo.
export const getCobertura = (items) =>
  httpClient
    .post(`${BASE}/cobertura`, {
      items: items.map(({ id, cantidad, nombre }) => ({ medicamentoId: id, cantidad, nombre })),
    })
    .then((res) => res.data);

// Personal de farmacia
export const getLotes = (filtros = {}) =>
  httpClient.get(`${BASE}/lotes`, { params: filtros }).then((res) => res.data);

export const ingresarLote = (lote) => httpClient.post(`${BASE}/lotes`, lote).then((res) => res.data);

export const darDeBaja = (id, cantidad, motivo) =>
  httpClient.post(`${BASE}/lotes/${id}/merma`, { cantidad, motivo }).then((res) => res.data);

export const getMovimientos = (id) =>
  httpClient.get(`${BASE}/lotes/${id}/movimientos`).then((res) => res.data);

export const getResumenInventario = () => httpClient.get(`${BASE}/resumen`).then((res) => res.data);
