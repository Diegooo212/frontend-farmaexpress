import httpClient from './httpClient';

// Analítica en tiempo real (Operador y Administrador): se alimenta de los tópicos Kafka de ventas y stock.
export const getTablero = () => httpClient.get('/api/bff/analytics/tablero').then((res) => res.data);
