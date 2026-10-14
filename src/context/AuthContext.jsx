import { createContext, useContext, useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { getMe } from '../api/authApi';
import { isAzureConfigured, loginRequest, signUpRequest } from '../auth/msalConfig';
import { rolesDe } from '../utils/jwt';

const AuthContext = createContext(null);

// Ruta absoluta a la que MSAL debe volver después de pasar por Microsoft.
const volverA = (to) => {
  if (!to) return window.location.href;
  const path = typeof to === 'string' ? to : `${to.pathname || '/'}${to.search || ''}${to.hash || ''}`;
  return new URL(path, window.location.origin).href;
};

export function AuthContextProvider({ children }) {
  const { instance, accounts, inProgress } = useMsal();
  const account = instance.getActiveAccount() || accounts[0] || null;
  const claims = account?.idTokenClaims || {};
  const oid = claims.oid || account?.localAccountId || null;

  // Perfil guardado en el BFF (se crea en el primer ingreso). Se asocia al oid para no mezclar cuentas.
  // "listo" indica que ya se consultó (con o sin éxito), para no dejar la app esperando si el BFF no responde.
  const [perfil, setPerfil] = useState({ oid: null, datos: null, listo: false });

  useEffect(() => {
    if (!oid || inProgress !== InteractionStatus.None) return;
    let cancelled = false;
    getMe()
      .then((datos) => {
        if (!cancelled) setPerfil({ oid, datos, listo: true });
      })
      .catch(() => {
        // Sin backend se usan los datos del token; el guard y la UI siguen funcionando.
        if (!cancelled) setPerfil({ oid, datos: null, listo: true });
      });
    return () => {
      cancelled = true;
    };
  }, [oid, inProgress]);

  const datos = perfil.oid === oid ? perfil.datos : null;
  const perfilListo = perfil.oid === oid && perfil.listo;
  // Con dos App Registrations (FarmaExpress Web para el login y FarmaExpress API con los App Roles), los roles
  // vienen en el token de la API, no en el ID token del login. El BFF los lee de ese token y los devuelve en
  // /auth/me: esa es la fuente. El ID token queda como respaldo (una sola app, o backend sin conexión).
  const rolesBackend = rolesDe({ roles: datos?.roles });
  const rolesToken = rolesBackend.length > 0 ? rolesBackend : rolesDe(claims);
  const email =
    datos?.email || claims.email || (claims.preferred_username?.includes('@') ? claims.preferred_username : null) || null;

  // Roles de los App Roles de Entra ID. Sin rol asignado, la persona es Cliente.
  const user = account
    ? {
        id: oid,
        nombre: datos?.nombre || claims.name || account.name || email || 'Usuario',
        email,
        roles: rolesToken.length > 0 ? rolesToken : ['Cliente'],
      }
    : null;

  // OIDC Authorization Code + PKCE: MSAL redirige a la página del tenant y al volver canjea el código.
  const login = (to) => {
    if (!isAzureConfigured) return;
    instance.loginRedirect({ ...loginRequest, redirectStartPage: volverA(to) });
  };

  // Abre el user flow de registro del tenant (crear cuenta con correo y contraseña).
  const register = (to) => {
    if (!isAzureConfigured) return;
    instance.loginRedirect({ ...signUpRequest, redirectStartPage: volverA(to) });
  };

  const logout = () => {
    instance.logoutRedirect({ account, postLogoutRedirectUri: window.location.origin });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(account),
        // Mientras MSAL procesa la vuelta desde Microsoft, o se consultan los roles en el BFF, los guards
        // esperan en vez de redirigir (así un Admin no es enviado fuera del panel antes de saber su rol).
        loading: inProgress !== InteractionStatus.None || (Boolean(oid) && !perfilListo),
        login,
        register,
        logout,
        microsoftEnabled: isAzureConfigured,
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
