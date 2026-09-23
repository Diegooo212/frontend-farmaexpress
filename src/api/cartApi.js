import httpClient from './httpClient';

// El carrito vive en el BFF, guardado por cuenta.
export const getCart = () => httpClient.get('/api/bff/cart').then((res) => res.data);

export const saveCart = (items) =>
  httpClient
    .put('/api/bff/cart', { items: items.map(({ id, cantidad }) => ({ id, cantidad })) })
    .then((res) => res.data);

// Compra el carrito guardado: el catálogo descuenta el stock y se registra el pedido.
export const createOrder = () => httpClient.post('/api/bff/orders').then((res) => res.data);

export const getOrders = () => httpClient.get('/api/bff/orders').then((res) => res.data);
