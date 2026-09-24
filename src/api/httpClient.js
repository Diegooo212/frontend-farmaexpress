import axios from 'axios';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { msalInstance, getActiveAccount } from '../auth/AuthProvider';
import { apiRequest } from '../auth/msalConfig';

// Todas las llamadas van al API Gateway (VITE_API_BASE_URL), que las reenvía al BFF.
const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
});

// Interceptor: agrega a cada petición el access token de Entra ID para la API.
// MSAL lo toma de la caché o lo renueva en silencio con el refresh token.
httpClient.interceptors.request.use(async (config) => {
  const account = getActiveAccount();
  if (!account) return config;

  try {
    const { accessToken } = await msalInstance.acquireTokenSilent({ ...apiRequest, account });
    config.headers.Authorization = `Bearer ${accessToken}`;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      // La sesión en Entra venció o falta consentimiento: se vuelve a iniciar sesión.
      await msalInstance.acquireTokenRedirect({ ...apiRequest, account });
    }
    throw error;
  }
  return config;
});

// Sin respuesta del servidor (apagado, sin red, CORS): la app puede usar datos de ejemplo.
export const isNetworkError = (error) => !error?.response;

// Mensaje legible de un error de la API (el backend responde Problem Details con "detail").
export function apiErrorMessage(error, fallback = 'Algo salió mal. Intenta de nuevo.') {
  if (error instanceof InteractionRequiredAuthError) return 'Tu sesión venció. Inicia sesión de nuevo.';
  if (isNetworkError(error)) return 'No hay conexión con el servidor de FarmaExpress.';
  const { status, data } = error.response;
  if (data?.detail) return data.detail;
  if (status === 401) return 'Tu sesión no es válida. Inicia sesión de nuevo.';
  if (status === 403) return 'Tu cuenta no tiene permiso para esta acción.';
  return data?.message || fallback;
}

export default httpClient;
