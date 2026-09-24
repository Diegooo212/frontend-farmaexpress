# Configuración de Microsoft Entra ID (IDaaS)

> **Estado actual:** el tenant `diegotenant` es de **fuerza de trabajo** (*Workforce*). Inician sesión las cuentas
> creadas por el administrador, con sus App Roles (`Administrador`, `Operador`, `Cliente`). El frontend usa
> `https://login.microsoftonline.com/<tenant>` y el botón "Crear cuenta" está oculto.
> El **registro de cuentas nuevas** (secciones 1 y 3) requiere un tenant **External ID**; si se adopta, basta con
> definir `VITE_AZURE_AUTHORITY=https://<tenant>.ciamlogin.com/<tenant>`, `VITE_AZURE_SIGNUP=true` en el frontend y
> `AZURE_ISSUER` / `AZURE_JWKS_URI` con `ciamlogin.com` en el backend.

FarmaExpress usa un **tenant externo de Microsoft Entra External ID** (CIAM).

- Los usuarios **crean su cuenta con correo y contraseña** desde el frontend mediante un *user flow*.
- Inician sesión con **OpenID Connect, Authorization Code + PKCE**, a través de MSAL.
- El frontend usa el **access token** (JWT) para llamar al API Gateway.

Portal: https://entra.microsoft.com, cambiando al directorio del tenant externo.

## 1. Tenant (EP2, indicador 3)

- *Overview* muestra el **Tenant ID** → `VITE_AZURE_TENANT_ID`.
- El dominio de inicio de sesión es `https://<tenant-id>.ciamlogin.com/<tenant-id>`. El frontend lo arma solo desde el tenant ID.
- **Usuarios registrados**: *Users → All users*. Ahí aparecen quienes se registraron desde FarmaExpress (columna *Creation type* = *Self-service sign-up*).

## 2. App Registration (EP2, indicador 4)

*Applications → App registrations → FarmaExpress*. Se usa **una sola** registración para el SPA y la API.

| Sección | Configuración |
|---|---|
| **Overview** | *Application (client) ID* → `VITE_AZURE_CLIENT_ID` y `VITE_AZURE_API_CLIENT_ID` (mismo valor) |
| **Authentication** | Plataforma **Single-page application**, con las Redirect URIs `http://localhost:5173` y `https://<tu-dominio>.cloudfront.net`. **No** marques *Access tokens* ni *ID tokens* (implicit grant): el SPA usa Authorization Code + PKCE. |
| **Expose an API** | *Application ID URI* = `api://<client-id>`. Scope **`access_as_user`** (*Who can consent: Admins and users*, estado *Enabled*). |
| **API permissions** | Microsoft Graph (delegated): `openid`, `profile`, `email`, `offline_access`. Tu API: `access_as_user`. Luego **Grant admin consent**. |
| **App roles** | `Administrador`, `Operador` y `Cliente`. *Allowed member types: Users/Groups*. El backend y el frontend reconocen `Administrador` (o `Admin`) como administrador, sin importar mayúsculas. |
| **Token configuration** | *Add optional claim* → **ID** y **Access**: `email`. Así el token trae el correo de la persona. |
| **Manifest** | `"requestedAccessTokenVersion": 2`. Tokens v2: el `iss` es `https://<tenant>.ciamlogin.com/<tenant>/v2.0`, el mismo que validan API Gateway y el backend. |

### Asignar roles a usuarios

*Enterprise applications → FarmaExpress → Users and groups → Add user/group*, elige una persona y el rol (`Administrador`, `Operador` o `Cliente`).
Quien no tiene rol asignado entra igual como **Cliente**.

> Deja *Properties → Assignment required?* en **No**. Así cualquiera que se registre puede entrar como cliente.

## 3. User flow de registro e inicio de sesión (EP2, indicador 5)

*External Identities → User flows → New user flow*:

| Campo | Valor |
|---|---|
| Name | `SignUpSignIn-FarmaExpress` |
| Identity providers | **Email with password** (opcional: Microsoft Account / Google) |
| User attributes | **Display Name** (y los que quieras pedir en el registro) |

Luego, en el user flow → **Applications → Add application → FarmaExpress**.

> Sin este paso, la pantalla de Microsoft solo muestra "Iniciar sesión" y **no la opción de crear cuenta**.
> Una app solo puede estar en un user flow.

Prueba: en el frontend, **Crear cuenta** abre `…ciamlogin.com/…/authorize?prompt=create`, que lleva directo al formulario de registro del user flow. Te piden correo, un código de verificación, contraseña y nombre. Al terminar vuelves a FarmaExpress con la sesión iniciada.

## 4. Flujo OIDC Authorization Code + PKCE (EP2, indicador 6)

Lo implementa MSAL (`@azure/msal-browser`) en `src/auth/msalConfig.js` y `src/context/AuthContext.jsx`:

1. **Inicio del login.** `loginRedirect()` genera un **code_verifier** aleatorio y su **code_challenge** (SHA-256, `code_challenge_method=S256`), además de **state** y **nonce**. Redirige a `/oauth2/v2.0/authorize?response_type=code&…`.
2. **Autorización.** Entra ID autentica a la persona (o la registra, con `prompt=create`) y vuelve a la Redirect URI con `?code=…&state=…`.
3. **Canje del código.** MSAL **valida el `state`**, canjea el `code` junto con el `code_verifier` en `/oauth2/v2.0/token` y **valida el `nonce`** del ID token.
4. **Tokens recibidos:**
   - **ID token:** quién es la persona.
   - **Access token:** para la API; `aud` = client id, `scp` = `access_as_user`, `roles`.
   - **Refresh token:** para renovar en silencio.
5. **Llamadas a la API.** El **interceptor** (`src/api/httpClient.js`) pide el access token con `acquireTokenSilent` en cada llamada y lo envía como `Authorization: Bearer …`.
6. **Guards.** Los **guards** (`src/components/ProtectedRoute`) exigen sesión y, en el panel de farmacia, el rol `Operador` o `Administrador` leído del claim `roles`.

Para evidenciarlo en la demo:

- **DevTools → Network:** el request a `authorize` muestra `code_challenge`, `code_challenge_method=S256`, `state` y `nonce`; el `POST /token` muestra `code_verifier`.
- **Claims del access token:** F12 → Network → cualquier llamada a `/api/bff/...` → *Request Headers* → `Authorization: Bearer …`. Copia el token y pégalo en https://jwt.ms (decodificador oficial de Microsoft) para ver `iss`, `aud`, `scp`, `roles` y `exp`.

## 5. Variables del frontend (`.env`)

```properties
VITE_AZURE_CLIENT_ID=<client id>
VITE_AZURE_TENANT_ID=<tenant id>
VITE_AZURE_API_CLIENT_ID=<client id>          # misma App Registration
VITE_AZURE_REDIRECT_URI=http://localhost:5173 # en producción se deja vacío (usa el dominio actual)
VITE_API_BASE_URL=http://localhost:8080       # en producción: URL del API Gateway
```

El backend usa `AZURE_TENANT_ID` y `AZURE_API_CLIENT_ID` con los mismos valores.
