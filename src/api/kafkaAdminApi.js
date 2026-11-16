import httpClient from './httpClient';

// Microservicio administrador de Kafka (solo Administrador), a través del BFF.
const BASE = '/api/bff/admin/kafka';
const t = (nombre) => `${BASE}/topics/${encodeURIComponent(nombre)}`;
const g = (grupo) => `${BASE}/consumer-groups/${encodeURIComponent(grupo)}`;

export const getCluster = () => httpClient.get(`${BASE}/cluster`).then((res) => res.data);

export const getTopicos = () => httpClient.get(`${BASE}/topics`).then((res) => res.data);
export const getTopico = (nombre) => httpClient.get(t(nombre)).then((res) => res.data);
export const crearTopico = (topico) => httpClient.post(`${BASE}/topics`, topico).then((res) => res.data);
export const cambiarConfig = (nombre, config) => httpClient.put(`${t(nombre)}/config`, { config }).then((res) => res.data);
export const agregarParticiones = (nombre, total) =>
  httpClient.post(`${t(nombre)}/partitions`, { total }).then((res) => res.data);
export const eliminarTopico = (nombre) => httpClient.delete(t(nombre));

export const getGrupos = () => httpClient.get(`${BASE}/consumer-groups`).then((res) => res.data);
export const getGrupo = (grupo) => httpClient.get(g(grupo)).then((res) => res.data);
export const reiniciarOffsets = (grupo, topico, posicion) =>
  httpClient.post(`${g(grupo)}/reset-offsets`, { topico, posicion }).then((res) => res.data);
export const eliminarGrupo = (grupo) => httpClient.delete(g(grupo));
