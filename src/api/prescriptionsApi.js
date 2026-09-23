import httpClient from './httpClient';

const BASE = '/api/bff/prescriptions';

export const getPrescriptions = (status) =>
  httpClient.get(BASE, { params: status ? { status } : {} }).then((res) => res.data);

export const getPrescriptionById = (id) =>
  httpClient.get(`${BASE}/${id}`).then((res) => res.data);

// multipart/form-data: "datos" (JSON del formulario) + "archivo" (foto o PDF).
export const createPrescription = (datos, archivo) => {
  const form = new FormData();
  form.append('datos', new Blob([JSON.stringify(datos)], { type: 'application/json' }));
  if (archivo) form.append('archivo', archivo, archivo.name);
  return httpClient.post(BASE, form).then((res) => res.data);
};

// nota: mensaje para el paciente (obligatorio al rechazar). Quién hizo el cambio lo toma el backend del token.
export const updatePrescriptionStatus = (id, status, nota) =>
  httpClient.put(`${BASE}/${id}/status`, { status, nota }).then((res) => res.data);

export const getPrescriptionFile = (id) =>
  httpClient.get(`${BASE}/${id}/archivo`, { responseType: 'blob' }).then((res) => res.data);
