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
bash deploy/publicar-cloudfront.sh
```

El script:

1. Instala Node 22 si CloudShell trae una versión antigua.
2. Compila con `VITE_API_BASE_URL=$API_URL`. La Redirect URI queda como el propio dominio de CloudFront.
3. Crea un bucket **privado** y sube el build.
4. Crea la distribución CloudFront:
   - HTTPS obligatorio;
   - acceso al bucket solo vía **OAC**;
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
export BUCKET=<bucket> DISTRIBUTION_ID=<id>
bash deploy/publicar-cloudfront.sh
```

## Si CloudFront no está disponible en tu lab

Alternativa: **AWS Amplify Hosting**.

1. Ejecuta `npm run build` en tu PC, con `.env.production.local` que contenga `VITE_API_BASE_URL=<URL del API Gateway>` y `VITE_AZURE_REDIRECT_URI=` (vacío).
2. Comprime la carpeta `dist`.
3. En *Amplify → Deploy without Git*, sube el `.zip`.
4. Amplify entrega un dominio HTTPS: úsalo en Entra ID y en el CORS del API Gateway.
