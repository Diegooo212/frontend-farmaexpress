#!/usr/bin/env bash
# Publica el frontend de FarmaExpress en Amazon S3 + CloudFront (HTTPS).
# Se ejecuta en AWS CloudShell, dentro de la carpeta del repo clonado:
#   git clone https://github.com/<tu-usuario>/frontend-farmaexpress.git && cd frontend-farmaexpress
#   export API_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com
#   export AZURE_TENANT_ID=<tenant id>
#   export AZURE_CLIENT_ID=<client id de la app del FRONTEND (FarmaExpress Web)>
#   export AZURE_API_CLIENT_ID=<client id de la app de la API (FarmaExpress API)>
#   bash deploy/publicar-cloudfront.sh
#
# La primera vez crea el bucket y la distribución. Las siguientes veces, con
#   export BUCKET=<bucket> DISTRIBUTION_ID=<id>
# solo sube la nueva versión e invalida la caché.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${API_URL:?Define API_URL con la URL del API Gateway}"
# El .env no está en el repo: los IDs de Entra ID (no son secretos) se pasan como variables.
: "${AZURE_TENANT_ID:?Define AZURE_TENANT_ID (Entra ID → Overview → Tenant ID)}"
: "${AZURE_CLIENT_ID:?Define AZURE_CLIENT_ID (app del frontend: FarmaExpress Web → Application (client) ID)}"
: "${AZURE_API_CLIENT_ID:?Define AZURE_API_CLIENT_ID (app de la API: FarmaExpress API → Application (client) ID)}"
REGION=$(aws configure get region || echo "${AWS_REGION:-us-east-1}")
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET=${BUCKET:-farmaexpress-frontend-$ACCOUNT_ID}

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
# redirect_uri vacío = el propio dominio de CloudFront (window.location.origin).
cat > .env.production.local <<ENV
VITE_API_BASE_URL=$API_URL
VITE_AZURE_CLIENT_ID=$AZURE_CLIENT_ID
VITE_AZURE_TENANT_ID=$AZURE_TENANT_ID
VITE_AZURE_API_CLIENT_ID=$AZURE_API_CLIENT_ID
VITE_AZURE_REDIRECT_URI=
ENV
npm ci --no-audit --no-fund
npm run build

if ! aws s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1; then
  echo "==> Creando bucket privado $BUCKET"
  if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$BUCKET" >/dev/null
  else
    aws s3api create-bucket --bucket "$BUCKET" --create-bucket-configuration "LocationConstraint=$REGION" >/dev/null
  fi
fi

echo "==> Subiendo archivos"
# Los assets llevan hash en el nombre: caché larga. index.html siempre fresco.
aws s3 sync dist "s3://$BUCKET" --delete --exclude index.html --cache-control "public,max-age=31536000,immutable"
aws s3 cp dist/index.html "s3://$BUCKET/index.html" --cache-control "no-cache"

if [ -z "${DISTRIBUTION_ID:-}" ]; then
  # Acceso de CloudFront al bucket. Se prueba de más a menos restrictivo, porque AWS Academy
  # (rol voclabs) suele bloquear OAC y a veces OAI:
  #   1) OAC: bucket privado, solo CloudFront lo lee (recomendado por AWS).
  #   2) OAI: igual, con el mecanismo anterior.
  #   3) Sitio web estático de S3 (lectura pública) con CloudFront delante para el HTTPS.
  MODO=""
  ORIGEN_S3="$BUCKET.s3.$REGION.amazonaws.com"
  if OAC_ID=$(aws cloudfront create-origin-access-control --origin-access-control-config \
      "Name=farmaexpress-oac-$(date +%s),SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" \
      --query OriginAccessControl.Id --output text 2>/dev/null); then
    MODO=oac
    ORIGEN="{ \"Id\": \"s3-frontend\", \"DomainName\": \"$ORIGEN_S3\", \"OriginAccessControlId\": \"$OAC_ID\", \"S3OriginConfig\": { \"OriginAccessIdentity\": \"\" } }"
  elif read -r OAI_ID OAI_CANONICO < <(aws cloudfront create-cloud-front-origin-access-identity \
      --cloud-front-origin-access-identity-config "CallerReference=farmaexpress-oai-$(date +%s),Comment=FarmaExpress" \
      --query 'CloudFrontOriginAccessIdentity.[Id,S3CanonicalUserId]' --output text 2>/dev/null) && [ -n "${OAI_ID:-}" ]; then
    MODO=oai
    ORIGEN="{ \"Id\": \"s3-frontend\", \"DomainName\": \"$ORIGEN_S3\", \"S3OriginConfig\": { \"OriginAccessIdentity\": \"origin-access-identity/cloudfront/$OAI_ID\" } }"
  else
    MODO=website
    if [ "$REGION" = "us-east-1" ]; then
      ORIGEN_WEB="$BUCKET.s3-website-us-east-1.amazonaws.com"
    else
      ORIGEN_WEB="$BUCKET.s3-website.$REGION.amazonaws.com"
    fi
    ORIGEN="{ \"Id\": \"s3-frontend\", \"DomainName\": \"$ORIGEN_WEB\", \"CustomOriginConfig\": { \"HTTPPort\": 80, \"HTTPSPort\": 443, \"OriginProtocolPolicy\": \"http-only\" } }"
  fi
  echo "==> Acceso de CloudFront al bucket: $MODO"

  if [ "$MODO" = "website" ]; then
    echo "==> Sin permisos para OAC/OAI: bucket como sitio web estático (solo lectura pública del build)"
    aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
      "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false"
    aws s3 website "s3://$BUCKET" --index-document index.html --error-document index.html
    cat > /tmp/politica.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [ {
    "Sid": "LecturaPublicaDelSitio",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$BUCKET/*"
  } ]
}
JSON
    aws s3api put-bucket-policy --bucket "$BUCKET" --policy file:///tmp/politica.json
  fi

  echo "==> Creando distribución CloudFront (HTTPS)"
  cat > /tmp/distribucion.json <<JSON
{
  "CallerReference": "farmaexpress-$(date +%s)",
  "Comment": "FarmaExpress frontend",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "Origins": { "Quantity": 1, "Items": [ $ORIGEN ] },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-frontend",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "AllowedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] },
    "Compress": true
  },
  "CustomErrorResponses": { "Quantity": 2, "Items": [
    { "ErrorCode": 403, "ResponsePagePath": "/index.html", "ResponseCode": "200", "ErrorCachingMinTTL": 0 },
    { "ErrorCode": 404, "ResponsePagePath": "/index.html", "ResponseCode": "200", "ErrorCachingMinTTL": 0 }
  ] },
  "PriceClass": "PriceClass_100"
}
JSON
  read -r DISTRIBUTION_ID DOMINIO < <(aws cloudfront create-distribution \
    --distribution-config file:///tmp/distribucion.json \
    --query 'Distribution.[Id,DomainName]' --output text)

  if [ "$MODO" = "oac" ]; then
    PRINCIPAL='{ "Service": "cloudfront.amazonaws.com" }'
    CONDICION=", \"Condition\": { \"StringEquals\": { \"AWS:SourceArn\": \"arn:aws:cloudfront::$ACCOUNT_ID:distribution/$DISTRIBUTION_ID\" } }"
  elif [ "$MODO" = "oai" ]; then
    PRINCIPAL="{ \"CanonicalUser\": \"$OAI_CANONICO\" }"
    CONDICION=""
  fi
  if [ "$MODO" != "website" ]; then
    echo "==> Permitiendo que solo CloudFront lea el bucket"
    cat > /tmp/politica.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [ {
    "Sid": "SoloCloudFront",
    "Effect": "Allow",
    "Principal": $PRINCIPAL,
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$BUCKET/*"$CONDICION
  } ]
}
JSON
    aws s3api put-bucket-policy --bucket "$BUCKET" --policy file:///tmp/politica.json
  fi
else
  echo "==> Invalidando caché de CloudFront"
  aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/index.html" "/" >/dev/null
  DOMINIO=$(aws cloudfront get-distribution --id "$DISTRIBUTION_ID" --query Distribution.DomainName --output text)
fi

echo
echo "Frontend publicado (CloudFront tarda ~5 minutos la primera vez):"
echo "  URL             = https://$DOMINIO"
echo "  BUCKET          = $BUCKET"
echo "  DISTRIBUTION_ID = $DISTRIBUTION_ID"
echo
echo "Pendiente en Entra ID: agrega https://$DOMINIO como Redirect URI (plataforma SPA) de la App Registration."
echo "Pendiente en API Gateway: el CORS debe permitir el origen https://$DOMINIO."
