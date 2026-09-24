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
  const [perfil, setPerfil] = useState({ oid: null, datos: null });

  useEffect(() => {
    if (!oid || inProgress !== InteractionStatus.None) return;
    let cancelled = false;
    getMe()
      .then((datos) => {
        if (!cancelled) setPerfil({ oid, datos });
      })
      .catch(() => {
        // Sin backend se usan los datos del token; el guard y la UI siguen funcionando.
      });
    return () => {
      cancelled = true;
    };
  }, [oid, inProgress]);

  const datos = perfil.oid === oid ? perfil.datos : null;
  const rolesToken = rolesDe(claims);
  const email =
    datos?.email || claims.email || (claims.preferred_username?.includes('@') ? claims.preferred_username : null) || null;

  // Roles leídos del claim "roles" del token (App Roles). Sin rol asignado, la persona es Cliente.
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
        // Mientras MSAL procesa la vuelta desde Microsoft, los guards esperan en vez de redirigir.
        loading: inProgress !== InteractionStatus.None,
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
