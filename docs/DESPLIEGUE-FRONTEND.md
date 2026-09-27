# Publicar el frontend en AWS (S3 + CloudFront)

Entra ID solo acepta Redirect URIs con **HTTPS** (salvo `localhost`). Por eso el frontend se publica así:

- **S3** (bucket privado) guarda los archivos del build.
- **CloudFront** los sirve con HTTPS en `https://dxxxx.cloudfront.net`.

Requisito previo: el **API Gateway** ya creado (ver `docs/DESPLIEGUE-AWS.md` del repo del backend), para conocer su URL.

## Primera publicación

En **AWS CloudShell** (Learner Lab, región us-east-1):

```bash
git clone https://github.com/<tu-usuario>/frontend-farmaexpress.git
cd frontend-farmaexpress
export API_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com
export AZURE_TENANT_ID=<tenant id> AZURE_CLIENT_ID=<client id>   # los de tu .env
bash deploy/publicar-cloudfront.sh
```

El script:

1. Instala Node 22 si CloudShell trae una versión antigua.
2. Compila con `VITE_API_BASE_URL=$API_URL` y los IDs de Entra ID (el `.env` no está en el repo). La Redirect URI queda como el propio dominio de CloudFront.
3. Crea un bucket **privado** y sube el build.
4. Crea la distribución CloudFront:
   - HTTPS obligatorio;
   - acceso al bucket: prueba **OAC** (bucket privado); si el rol del lab no lo permite, **OAI**; y si tampoco, usa el bucket como **sitio web estático** (solo lectura pública de los archivos del build) con CloudFront delante para el HTTPS. En AWS Academy (rol `voclabs`) OAC está bloqueado;
   - errores 403/404 → `index.html`, para que funcionen las rutas de React como `/mis-recetas`.
5. Muestra la URL, `BUCKET` y `DISTRIBUTION_ID` (anótalos).

CloudFront tarda unos 5 minutos en quedar disponible la primera vez.

## Después de publicar

1. **Entra ID** → App registration → *Authentication* → SPA → agrega `https://dxxxx.cloudfront.net` (ver `ENTRA-ID.md`).
2. **API Gateway**: agrega el dominio al CORS con `actualizar-cors.sh` (repo del backend).

## Publicar una nueva versión

```bash
cd frontend-farmaexpress && git pull
export API_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com
export AZURE_TENANT_ID=<tenant id> AZURE_CLIENT_ID=<client id>   # los de tu .env
export BUCKET=<bucket> DISTRIBUTION_ID=<id>
bash deploy/publicar-cloudfront.sh
```

## Si CloudFront no está disponible en tu lab (AWS Academy)

En AWS Academy el rol `voclabs` no puede crear distribuciones CloudFront (`AccessDenied` en `CreateDistribution`).
En ese caso se usa **AWS Amplify Hosting**, que también entrega HTTPS (`https://main.<id>.amplifyapp.com`):

```bash
cd frontend-farmaexpress && git pull
export API_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com
export AZURE_TENANT_ID=<tenant id> AZURE_CLIENT_ID=<client id>
bash deploy/publicar-amplify.sh
```

El script compila igual que el de CloudFront, crea la app de Amplify con una regla de SPA (las rutas de React
responden `index.html`), sube el build como .zip y muestra la **URL** y el **APP_ID**.
Para publicar una nueva versión: `export APP_ID=<id>` y vuelve a ejecutarlo.

Después, igual que con CloudFront: Redirect URI SPA en Entra ID y CORS en API Gateway (`actualizar-cors.sh`) y en el BFF (`CORS_ORIGINS`).
