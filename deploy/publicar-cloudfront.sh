#!/usr/bin/env bash
# Publica el frontend de FarmaExpress en Amazon S3 + CloudFront (HTTPS).
# Se ejecuta en AWS CloudShell, dentro de la carpeta del repo clonado:
#   git clone https://github.com/<tu-usuario>/frontend-farmaexpress.git && cd frontend-farmaexpress
#   export API_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com
#   bash deploy/publicar-cloudfront.sh
#
# La primera vez crea el bucket y la distribución. Las siguientes veces, con
#   export BUCKET=<bucket> DISTRIBUTION_ID=<id>
# solo sube la nueva versión e invalida la caché.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${API_URL:?Define API_URL con la URL del API Gateway}"
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
VITE_AZURE_REDIRECT_URI=
ENV
npm ci --no-audit --no-fund
npm run build

if ! aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
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
  echo "==> Creando distribución CloudFront (HTTPS) con acceso privado al bucket (OAC)"
  OAC_ID=$(aws cloudfront create-origin-access-control --origin-access-control-config \
    "Name=farmaexpress-oac-$(date +%s),SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" \
    --query OriginAccessControl.Id --output text)

  cat > /tmp/distribucion.json <<JSON
{
  "CallerReference": "farmaexpress-$(date +%s)",
  "Comment": "FarmaExpress frontend",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "Origins": { "Quantity": 1, "Items": [ {
    "Id": "s3-frontend",
    "DomainName": "$BUCKET.s3.$REGION.amazonaws.com",
    "OriginAccessControlId": "$OAC_ID",
    "S3OriginConfig": { "OriginAccessIdentity": "" }
  } ] },
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

  echo "==> Permitiendo que solo CloudFront lea el bucket"
  cat > /tmp/politica.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [ {
    "Sid": "SoloCloudFront",
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$BUCKET/*",
    "Condition": { "StringEquals": { "AWS:SourceArn": "arn:aws:cloudfront::$ACCOUNT_ID:distribution/$DISTRIBUTION_ID" } }
  } ]
}
JSON
  aws s3api put-bucket-policy --bucket "$BUCKET" --policy file:///tmp/politica.json
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
