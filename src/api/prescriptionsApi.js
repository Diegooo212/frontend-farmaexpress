import httpClient from './httpClient';

const BASE = '/api/bff/prescriptions';

export const getPrescriptions = (status) =>
  httpClient.get(BASE, { params: status ? { status } : {} }).then((res) => res.data);

export const getPrescriptionById = (id) =>
  httpClient.get(`${BASE}/${id}`).then((res) => res.data);

export const createPrescription = (payload) =>
  httpClient.post(BASE, payload).then((res) => res.data);

export const updatePrescriptionStatus = (id, status) =>
  httpClient.put(`${BASE}/${id}/status`, { status }).then((res) => res.data);