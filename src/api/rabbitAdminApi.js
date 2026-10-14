import httpClient from './httpClient';

// Microservicio administrador de RabbitMQ (solo Administrador), a través del BFF.
const BASE = '/api/bff/admin/rabbit';

export const getColas = () => httpClient.get(`${BASE}/queues`).then((res) => res.data);
export const crearCola = (cola) => httpClient.post(`${BASE}/queues`, cola).then((res) => res.data);
export const eliminarCola = (nombre, { forzar = false } = {}) =>
  httpClient.delete(`${BASE}/queues/${encodeURIComponent(nombre)}`, { params: { forzar } });

export const getExchanges = () => httpClient.get(`${BASE}/exchanges`).then((res) => res.data);
export const crearExchange = (exchange) => httpClient.post(`${BASE}/exchanges`, exchange).then((res) => res.data);
export const eliminarExchange = (nombre) => httpClient.delete(`${BASE}/exchanges/${encodeURIComponent(nombre)}`);

export const getBindings = () => httpClient.get(`${BASE}/bindings`).then((res) => res.data);
export const crearBinding = (binding) => httpClient.post(`${BASE}/bindings`, binding).then((res) => res.data);
export const eliminarBinding = ({ exchange, cola, routingKey }) =>
  httpClient.delete(`${BASE}/bindings`, { params: { exchange, cola, routingKey } });
