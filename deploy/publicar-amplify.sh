#!/usr/bin/env bash
# Publica el frontend de FarmaExpress en AWS Amplify Hosting (HTTPS en https://main.<id>.amplifyapp.com).
# Alternativa a S3 + CloudFront para AWS Academy, donde el rol voclabs no puede crear distribuciones CloudFront.
# Se ejecuta en AWS CloudShell, dentro de la carpeta del repo clonado:
#   export API_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com
#   export AZURE_TENANT_ID=<tenant id>
#   export AZURE_CLIENT_ID=<client id de la app del FRONTEND (FarmaExpress Web)>
#   export AZURE_API_CLIENT_ID=<client id de la app de la API (FarmaExpress API)>
#   bash deploy/publicar-amplify.sh
#
# La primera vez crea la app. Las siguientes veces, con  export APP_ID=<id>  solo sube la nueva versión.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${API_URL:?Define API_URL con la URL del API Gateway}"
# El .env no está en el repo: los IDs de Entra ID (no son secretos) se pasan como variables.
: "${AZURE_TENANT_ID:?Define AZURE_TENANT_ID (Entra ID → Overview → Tenant ID)}"
: "${AZURE_CLIENT_ID:?Define AZURE_CLIENT_ID (app del frontend: FarmaExpress Web → Application (client) ID)}"
: "${AZURE_API_CLIENT_ID:?Define AZURE_API_CLIENT_ID (app de la API: FarmaExpress API → Application (client) ID)}"
RAMA=main

echo "==> Node.js 22 (Vite lo necesita)"
if ! node -v 2>/dev/null | grep -qE '^v(2[2-9]|[3-9][0-9])'; then
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] || curl -fsSo- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash >/dev/null
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm install 22 >/dev/null
fi
node -v

echo "==> Build de producción apuntando a $API_URL"
# redirect_uri vacío = el propio dominio de Amplify (window.location.origin).
cat > .env.production.local <<ENV
VITE_API_BASE_URL=$API_URL
VITE_AZURE_CLIENT_ID=$AZURE_CLIENT_ID
VITE_AZURE_TENANT_ID=$AZURE_TENANT_ID
VITE_AZURE_API_CLIENT_ID=$AZURE_API_CLIENT_ID
VITE_AZURE_REDIRECT_URI=
ENV
npm ci --no-audit --no-fund
npm run build

if [ -z "${APP_ID:-}" ]; then
  echo "==> Creando app de Amplify"
  # Regla de SPA: toda ruta que no sea un archivo (p. ej. /catalogo, /mis-recetas) responde index.html.
  cat > /tmp/reglas.json <<'JSON'
[ { "source": "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>",
    "target": "/index.html", "status": "200" } ]
JSON
  APP_ID=$(aws amplify create-app --name farmaexpress-frontend --platform WEB \
    --custom-rules file:///tmp/reglas.json --query app.appId --output text)
  aws amplify create-branch --app-id "$APP_ID" --branch-name "$RAMA" >/dev/null
fi

echo "==> Subiendo el build (app $APP_ID, rama $RAMA)"
rm -f /tmp/dist.zip
(cd dist && python3 -c "import shutil; shutil.make_archive('/tmp/dist', 'zip', '.')")
read -r JOB_ID UPLOAD_URL < <(aws amplify create-deployment --app-id "$APP_ID" --branch-name "$RAMA" \
  --query '[jobId,zipUploadUrl]' --output text)
curl -fsS -X PUT -H "Content-Type: application/zip" --upload-file /tmp/dist.zip "$UPLOAD_URL"
aws amplify start-deployment --app-id "$APP_ID" --branch-name "$RAMA" --job-id "$JOB_ID" >/dev/null

echo -n "==> Desplegando"
for _ in $(seq 1 60); do
  ESTADO=$(aws amplify get-job --app-id "$APP_ID" --branch-name "$RAMA" --job-id "$JOB_ID" \
    --query job.summary.status --output text)
  case "$ESTADO" in
    SUCCEED) echo " listo"; break ;;
    FAILED|CANCELLED) echo " $ESTADO"; exit 1 ;;
    *) echo -n "."; sleep 5 ;;
  esac
done

DOMINIO="$RAMA.$(aws amplify get-app --app-id "$APP_ID" --query app.defaultDomain --output text)"
echo
echo "Frontend publicado en Amplify:"
echo "  URL    = https://$DOMINIO"
echo "  APP_ID = $APP_ID"
echo
echo "Pendiente en Entra ID: agrega https://$DOMINIO como Redirect URI (plataforma SPA) de la App Registration."
echo "Pendiente en API Gateway y en el BFF: el CORS debe permitir el origen https://$DOMINIO."
