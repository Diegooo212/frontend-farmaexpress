import httpClient from './httpClient';

// Mi cuenta (BFF): siempre sobre la cuenta del token.
const BASE = '/api/bff/account';

export const getPerfil = () => httpClient.get(`${BASE}/perfil`).then((res) => res.data);

export const actualizarPerfil = (datos) => httpClient.put(`${BASE}/perfil`, datos).then((res) => res.data);

export const getDirecciones = () => httpClient.get(`${BASE}/direcciones`).then((res) => res.data);

export const agregarDireccion = (direccion) =>
  httpClient.post(`${BASE}/direcciones`, direccion).then((res) => res.data);

export const actualizarDireccion = (id, direccion) =>
  httpClient.put(`${BASE}/direcciones/${id}`, direccion).then((res) => res.data);

export const eliminarDireccion = (id) => httpClient.delete(`${BASE}/direcciones/${id}`);

// Favoritos: el servidor responde siempre la lista actualizada de ids.
export const getFavoritos = () => httpClient.get(`${BASE}/favoritos`).then((res) => res.data);

export const agregarFavorito = (medicamentoId) =>
  httpClient.put(`${BASE}/favoritos/${medicamentoId}`).then((res) => res.data);

export const quitarFavorito = (medicamentoId) =>
  httpClient.delete(`${BASE}/favoritos/${medicamentoId}`).then((res) => res.data);
