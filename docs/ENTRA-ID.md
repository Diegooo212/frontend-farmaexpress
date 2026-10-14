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

## 2. Dos App Registrations: la API y el frontend (EP2, indicador 4)

Se usan **dos** registraciones, como en una arquitectura real: una representa la **API** (el backend, que
define los permisos) y otra el **frontend** (la aplicación con la que la persona inicia sesión).

```
FarmaExpress Web (SPA) ──pide un token para──► FarmaExpress API ──► el token trae aud = API, scp y roles
      VITE_AZURE_CLIENT_ID                         VITE_AZURE_API_CLIENT_ID · AZURE_API_CLIENT_ID (backend)
```

### 2.1 App de la API: "FarmaExpress API" (la que ya tienes)

*Applications → App registrations → tu app actual*. Puedes renombrarla a **FarmaExpress API** (*Branding & properties*).

| Sección | Configuración |
|---|---|
| **Overview** | *Application (client) ID* → `VITE_AZURE_API_CLIENT_ID` (frontend) y `AZURE_API_CLIENT_ID` (backend). **No cambia.** |
| **Expose an API** | *Application ID URI* = `api://<client-id-api>`. Scope **`access_as_user`** (*Admins and users*, *Enabled*). |
| **Expose an API → Authorized client applications** | **Add a client application** → pega el client ID de **FarmaExpress Web** y marca `access_as_user`. Así el login no pide consentimiento extra. |
| **App roles** | `Administrador`, `Operador` y `Cliente` (*Users/Groups*). Los roles viajan en el token de la API, por eso quedan aquí. |
| **Token configuration** | *Add optional claim* → **Access**: `email`. |
| **Manifest** | `"requestedAccessTokenVersion": 2`. |
| **Authentication** | Cuando la app del frontend funcione, puedes quitar de aquí la plataforma *Single-page application* (ya no inicia sesión nadie con esta app). |

### 2.2 App del frontend: "FarmaExpress Web" (nueva)

*App registrations → New registration*:

1. **Name:** `FarmaExpress Web` · **Supported account types:** solo este directorio (*Single tenant*).
2. **Redirect URI:** plataforma **Single-page application (SPA)** → `http://localhost:5173` → *Register*.
3. Copia el **Application (client) ID** → `VITE_AZURE_CLIENT_ID` en el `.env` del frontend.
4. **Authentication** → *Add URI* → `https://main.d1gism6shpd81i.amplifyapp.com`. **No** marques *Access tokens* ni *ID tokens* (implicit grant): se usa Authorization Code + PKCE.
5. **API permissions** → *Add a permission* → **APIs my organization uses** (o *My APIs*) → **FarmaExpress API** → *Delegated* → `access_as_user` → *Add*. Verifica que también estén `openid`, `profile`, `email` y `offline_access` de Microsoft Graph. Luego **Grant admin consent**.
6. **Token configuration** → *Add optional claim* → **ID**: `email`.
7. Vuelve a la app de la API y agrega este client ID en *Authorized client applications* (tabla 2.1).

> **No** se crean App Roles ni *Expose an API* en esta app: los permisos los define la API.

### Asignar roles a usuarios

*Enterprise applications → **FarmaExpress API** → Users and groups → Add user/group*, elige una persona y el rol (`Administrador`, `Operador` o `Cliente`). Los roles se asignan en la app de **la API**, no en la del frontend; las asignaciones que ya tienes siguen sirviendo.
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
VITE_AZURE_TENANT_ID=<tenant id>
VITE_AZURE_CLIENT_ID=<client id de FarmaExpress Web>   # app del frontend (inicio de sesión)
VITE_AZURE_API_CLIENT_ID=<client id de FarmaExpress API> # app de la API (scope, roles, aud)
VITE_AZURE_REDIRECT_URI=http://localhost:5173 # en producción se deja vacío (usa el dominio actual)
VITE_API_BASE_URL=http://localhost:8080       # en producción: URL del API Gateway
```

El backend usa `AZURE_TENANT_ID` y `AZURE_API_CLIENT_ID` (el de **la API**). El ID de la app del frontend no lo necesita el backend.

Después de cambiar el `.env`: en local, reinicia `npm run dev` o reconstruye el contenedor (`docker compose up -d --build`); en Amplify, vuelve a publicar con `export AZURE_CLIENT_ID=<client id de FarmaExpress Web>` y `bash deploy/publicar-amplify.sh`.
