import axios from 'axios';
import { getToken, clearSession, SESSION_EXPIRED_EVENT } from './session';

// Todas las llamadas van al BFF (VITE_API_BASE_URL), que reparte a catalog y prescriptions.
const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
});

httpClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Token vencido o inválido: se cierra la sesión y la app vuelve a pedir login.
    if (error.response?.status === 401 && getToken()) {
      clearSession();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

// Sin respuesta del servidor (apagado, sin red, CORS): la app puede usar datos de ejemplo.
export const isNetworkError = (error) => !error?.response;

// Mensaje legible de un error de la API (el backend responde Problem Details con "detail").
export function apiErrorMessage(error, fallback = 'Algo salió mal. Intenta de nuevo.') {
  if (isNetworkError(error)) return 'No hay conexión con el servidor de FarmaExpress.';
  return error.response.data?.detail || fallback;
}

export default httpClient;
