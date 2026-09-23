// Sesión del usuario: el JWT que entrega el BFF y los datos de la cuenta.
const SESSION_KEY = 'farmaexpress_session';
export const SESSION_EXPIRED_EVENT = 'farmaexpress:sesion-expirada';

export function getSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (!session?.token) return null;
    if (session.expiraEn && new Date(session.expiraEn) <= new Date()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export const getToken = () => getSession()?.token || null;
