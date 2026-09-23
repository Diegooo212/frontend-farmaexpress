import httpClient from './httpClient';

const BASE = '/api/bff/auth';

export const loginRequest = (email, password) =>
  httpClient.post(`${BASE}/login`, { email, password }).then((res) => res.data);

export const registerRequest = ({ nombre, email, password }) =>
  httpClient.post(`${BASE}/register`, { nombre, email, password }).then((res) => res.data);

export const getMe = () => httpClient.get(`${BASE}/me`).then((res) => res.data);

// Cambia el access token de Microsoft (MSAL) por un JWT de FarmaExpress.
export const loginMicrosoftRequest = (accessToken) =>
  httpClient.post(`${BASE}/microsoft`, { accessToken }).then((res) => res.data);
