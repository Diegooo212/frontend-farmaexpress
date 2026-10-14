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
  // Al recargar la página, las primeras peticiones pueden salir antes de que MsalProvider termine
  // de inicializar MSAL; initialize() es idempotente y espera a que esté listo.
  await msalInstance.initialize();
  const account = getActiveAccount();
  if (!account) return config;

  try {
    const { accessToken } = await msalInstance.acquireTokenSilent({ ...apiRequest, account });
    config.headers.Authorization = `Bearer ${accessToken}`;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      // La sesión en Entra venció o falta consentimiento: se vuelve a iniciar sesión.
      await msalInstance.acquireTokenRedirect({ ...apiRequest, account });
      throw error;
    }
    // Otro problema de MSAL (p. ej. una interacción en curso): la petición sale sin token.
    // Las rutas públicas funcionan igual y las protegidas responden 401, que la app sí sabe manejar.
    console.warn('No se pudo obtener el token de Entra ID:', error);
  }
  return config;
});

// Solo es "sin conexión" cuando axios no recibió respuesta del servidor (apagado, sin red, CORS).
// Un error de MSAL o de la propia app NO lo es: antes se confundían y la tienda pasaba a datos de ejemplo.
export const isNetworkError = (error) => Boolean(error?.isAxiosError) && !error.response;

// Mensaje legible de un error de la API (el backend responde Problem Details con "detail").
export function apiErrorMessage(error, fallback = 'Algo salió mal. Intenta de nuevo.') {
  if (error instanceof InteractionRequiredAuthError) return 'Tu sesión venció. Inicia sesión de nuevo.';
  if (isNetworkError(error)) return 'No hay conexión con el servidor de FarmaExpress.';
  if (!error?.response) return fallback;
  const { status, data } = error.response;
  if (data?.detail) return data.detail;
  if (status === 401) return 'Tu sesión no es válida. Inicia sesión de nuevo.';
  if (status === 403) return 'Tu cuenta no tiene permiso para esta acción.';
  return data?.message || fallback;
}

export default httpClient;
