import httpClient from './httpClient';

// El carrito vive en el BFF, guardado por cuenta.
export const getCart = () => httpClient.get('/api/bff/cart').then((res) => res.data);

export const saveCart = (items) =>
  httpClient
    .put('/api/bff/cart', { items: items.map(({ id, cantidad }) => ({ id, cantidad })) })
    .then((res) => res.data);
