import { LogLevel } from '@azure/msal-browser';

const tenantId = import.meta.env.VITE_AZURE_TENANT_ID;
const apiClientId = import.meta.env.VITE_AZURE_API_CLIENT_ID;

// Tenant de Microsoft Entra ID (fuerza de trabajo). Para un tenant External ID (registro con user flow)
// define VITE_AZURE_AUTHORITY=https://<tenant>.ciamlogin.com/<tenant> y VITE_AZURE_SIGNUP=true.
const authority = import.meta.env.VITE_AZURE_AUTHORITY || `https://login.microsoftonline.com/${tenantId}`;
const authorityHost = new URL(authority).host;

export const isAzureConfigured = Boolean(import.meta.env.VITE_AZURE_CLIENT_ID && tenantId && apiClientId);

// "Crear cuenta" solo tiene sentido si el tenant permite registro (user flow de External ID).
export const isSignUpEnabled = import.meta.env.VITE_AZURE_SIGNUP === 'true';

// MSAL usa el flujo OIDC Authorization Code con PKCE: genera el code_verifier/code_challenge
// y valida state y nonce automáticamente en cada inicio de sesión.
export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority,
    // Solo los dominios que no son login.microsoftonline.com (p. ej. ciamlogin.com) se declaran como conocidos.
    knownAuthorities: authorityHost === 'login.microsoftonline.com' ? [] : [authorityHost],
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin,
    // Al volver de Microsoft, regresa a la página donde se pidió iniciar sesión.
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      loggerCallback: (level, message, containsPii) => {
        if (!containsPii && level <= LogLevel.Warning) console.warn(message);
      },
    },
  },
};

// Scope expuesto por la API en la App Registration ("Expose an API").
export const apiScope = `api://${apiClientId}/access_as_user`;

// Inicio de sesión: identidad (openid, profile, email) + consentimiento para la API.
export const loginRequest = {
  scopes: ['openid', 'profile', 'email', apiScope],
};

// Registro: abre directamente la pantalla "Crear cuenta" del user flow del tenant.
export const signUpRequest = {
  ...loginRequest,
  prompt: 'create',
};

// Token para llamar al API Gateway / BFF (audience = la API, scope = access_as_user).
export const apiRequest = {
  scopes: [apiScope],
};
