import httpClient from './httpClient';

const BASE = '/api/bff/catalog';

export const getMedicamentos = () =>
  httpClient.get(`${BASE}/medicamentos`).then((res) => res.data);

export const createMedicamento = (payload) =>
  httpClient.post(`${BASE}/medicamentos`, payload).then((res) => res.data);

export const updateMedicamento = (id, payload) =>
  httpClient.put(`${BASE}/medicamentos/${id}`, payload).then((res) => res.data);

// Solo Administrador. Responde 204 sin cuerpo.
export const deleteMedicamento = (id) => httpClient.delete(`${BASE}/medicamentos/${id}`);
