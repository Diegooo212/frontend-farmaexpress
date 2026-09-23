import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest, registerRequest, getMe, loginMicrosoftRequest } from '../api/authApi';
import { apiErrorMessage } from '../api/httpClient';
import { getSession, saveSession, clearSession, SESSION_EXPIRED_EVENT } from '../api/session';
import { loginRequest as msalLoginRequest, isAzureConfigured } from '../auth/msalConfig';

const AuthContext = createContext(null);

export function AuthContextProvider({ children }) {
  const { instance, accounts, inProgress } = useMsal();
  const [session, setSession] = useState(() => getSession());
  const [microsoftPending, setMicrosoftPending] = useState(false);
  const [microsoftError, setMicrosoftError] = useState('');
  const exchanging = useRef(false);

  const startSession = ({ token, expiraEn, usuario }) => {
    const nueva = { token, expiraEn, usuario };
    saveSession(nueva);
    setSession(nueva);
  };

  // Si el backend rechaza el token (vencido o inválido), httpClient avisa y se cierra la sesión.
  useEffect(() => {
    const handleExpired = () => setSession(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, []);

  // Al abrir la app con una sesión guardada, se refrescan los datos de la cuenta (nombre, rol).
  useEffect(() => {
    if (!getSession()) return;
    getMe()
      .then((usuario) => {
        const current = getSession();
        if (!current) return;
        const updated = { ...current, usuario };
        saveSession(updated);
        setSession(updated);
      })
      .catch(() => {
        // Sin conexión se mantiene la sesión guardada; un 401 ya la cerró el interceptor.
      });
  }, []);

  // Vuelta desde Microsoft: MSAL ya tiene la cuenta. Se pide un access token para la API
  // y el BFF lo cambia por un JWT de FarmaExpress (con el rol que viene de Entra ID).
  useEffect(() => {
    if (!isAzureConfigured || session || accounts.length === 0) return;
    if (inProgress !== InteractionStatus.None || exchanging.current) return;
    exchanging.current = true;
    setMicrosoftPending(true);
    setMicrosoftError('');

    instance
      .acquireTokenSilent({ ...msalLoginRequest, account: accounts[0] })
      .then(({ accessToken }) => loginMicrosoftRequest(accessToken))
      .then(startSession)
      .catch((err) => {
        setMicrosoftError(apiErrorMessage(err, 'No pudimos iniciar sesión con Microsoft.'));
        // Se olvida la cuenta de Microsoft para que se pueda reintentar sin quedar en un bucle.
        instance.clearCache().catch(() => {});
      })
      .finally(() => {
        exchanging.current = false;
        setMicrosoftPending(false);
      });
  }, [instance, accounts, inProgress, session]);

  const login = async ({ email, password }) => {
    const respuesta = await loginRequest(email, password);
    startSession(respuesta);
    return respuesta.usuario;
  };

  // Redirige a Microsoft; al volver, el efecto de arriba completa el ingreso.
  const loginWithMicrosoft = () => {
    if (!isAzureConfigured) return;
    setMicrosoftError('');
    instance.loginRedirect(msalLoginRequest);
  };

  // Crea la cuenta (siempre como cliente). No inicia sesión: la pantalla lleva al login.
  const register = ({ nombre, email, password }) => registerRequest({ nombre, email, password });

  const logout = () => {
    clearSession();
    setSession(null);
    // También se olvida la cuenta de Microsoft en este navegador (sin salir de Microsoft en todos lados).
    if (accounts.length > 0) instance.clearCache().catch(() => {});
  };

  const user = session?.usuario || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        loginWithMicrosoft,
        microsoftEnabled: isAzureConfigured,
        microsoftPending,
        microsoftError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthContextProvider');
  return ctx;
}
