# FarmaExpress: Frontend

Frontend de **FarmaExpress**, plataforma de dispensación y retiro de recetas médicas.
Curso DSY1107 Desarrollo Cloud Native I (DuocUC).

- **React 19 + Vite**
- **MSAL** (`@azure/msal-browser` / `@azure/msal-react`) con **Microsoft Entra External ID** como IDaaS
- Consume el backend (microservicios Spring Boot) **a través de AWS API Gateway**

Backend: repositorio `backend-farmaexpress`.

## Autenticación (OAuth 2.0 / OpenID Connect)

| Pieza | Archivo | Qué hace |
|---|---|---|
| Configuración MSAL | `src/auth/msalConfig.js` | Tenant `ciamlogin.com`, client id, redirect URI y scopes. Pide el scope de la API: `api://<client-id>/access_as_user`. |
| Login / registro / logout | `src/context/AuthContext.jsx` | `loginRedirect` (**Authorization Code + PKCE**, con state y nonce validados por MSAL). `prompt=create` abre el registro del user flow. `logoutRedirect` cierra la sesión en Entra ID. |
| Interceptor HTTP | `src/api/httpClient.js` | Pide el **access token** con `acquireTokenSilent` y lo envía en `Authorization: Bearer` a cada llamada. Si la sesión venció, vuelve a iniciar sesión. |
| Guards | `src/components/ProtectedRoute` | Exigen sesión. El panel de farmacia además exige el rol `Operador` o `Administrador`, leído del claim **`roles`**. |
| Claims | `src/pages/MyAccount` ("Mi cuenta") | Muestra `iss`, `aud`, `scp` (scopes), `roles` y `exp` del ID token y del access token. Permite copiar el token para probar la API. |

Configuración del tenant, la App Registration, los roles y el user flow: **[docs/ENTRA-ID.md](docs/ENTRA-ID.md)**.

## Ejecutar en local

```bash
npm install
npm run dev          # http://localhost:5173
```

Variables en `.env`:

| Variable | Valor |
|---|---|
| `VITE_AZURE_CLIENT_ID` | Client id de la App Registration |
| `VITE_AZURE_TENANT_ID` | Tenant id de Entra External ID |
| `VITE_AZURE_API_CLIENT_ID` | Client id de la API (la misma App Registration) |
| `VITE_AZURE_REDIRECT_URI` | `http://localhost:5173` (en producción, vacío) |
| `VITE_API_BASE_URL` | `http://localhost:8080` (BFF local) o la URL del API Gateway |

Si el backend no responde, el catálogo y las recetas muestran datos de ejemplo guardados en el navegador.

## Publicar en AWS

S3 + CloudFront (HTTPS): **[docs/DESPLIEGUE-FRONTEND.md](docs/DESPLIEGUE-FRONTEND.md)**.

## Calidad

```bash
npm run lint
npm run build
```
