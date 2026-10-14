import httpClient from './httpClient';

// Avisos del microservicio de notificaciones (se crean a partir de eventos de RabbitMQ).
const BASE = '/api/bff/notifications';

export const getNotificaciones = () => httpClient.get(BASE).then((res) => res.data);

export const marcarNotificacionesLeidas = () => httpClient.put(`${BASE}/leidas`);
