import { LogLevel } from '@azure/msal-browser';

const tenantId = import.meta.env.VITE_AZURE_TENANT_ID;
const apiClientId = import.meta.env.VITE_AZURE_API_CLIENT_ID;

// Tenant de Microsoft Entra External ID: el login y el registro (user flow) se sirven desde ciamlogin.com.
// Para un tenant de empresa, define VITE_AZURE_AUTHORITY=https://login.microsoftonline.com/<tenant>.
const authority = import.meta.env.VITE_AZURE_AUTHORITY || `https://${tenantId}.ciamlogin.com/${tenantId}`;

export const isAzureConfigured = Boolean(import.meta.env.VITE_AZURE_CLIENT_ID && tenantId && apiClientId);

// MSAL usa el flujo OIDC Authorization Code con PKCE: genera el code_verifier/code_challenge
// y valida state y nonce automáticamente en cada inicio de sesión.
export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority,
    knownAuthorities: [new URL(authority).host],
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
