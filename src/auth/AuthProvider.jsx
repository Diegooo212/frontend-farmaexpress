import { EventType, PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './msalConfig';

// eslint-disable-next-line react-refresh/only-export-components
export const msalInstance = new PublicClientApplication(msalConfig);

// La cuenta que acaba de iniciar sesión (o renovar su token) queda como cuenta activa:
// es la que usan el interceptor HTTP y los guards de rutas.
msalInstance.addEventCallback((event) => {
  const exito =
    event.eventType === EventType.LOGIN_SUCCESS ||
    event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS ||
    event.eventType === EventType.SSO_SILENT_SUCCESS;
  if (exito && event.payload?.account) {
    msalInstance.setActiveAccount(event.payload.account);
  }
});

export default function AuthProvider({ children }) {
  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function getActiveAccount() {
  return msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0] || null;
}
