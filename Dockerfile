# syntax=docker/dockerfile:1
# Frontend de FarmaExpress: build de Vite servido por nginx.
# Las variables VITE_* se fijan al compilar (quedan dentro del JavaScript), por eso van como build args.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_API_BASE_URL=http://localhost:8080
ARG VITE_AZURE_CLIENT_ID
ARG VITE_AZURE_TENANT_ID
ARG VITE_AZURE_API_CLIENT_ID
# Vacío = el propio dominio donde se sirve la app (window.location.origin).
ARG VITE_AZURE_REDIRECT_URI=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_AZURE_CLIENT_ID=$VITE_AZURE_CLIENT_ID \
    VITE_AZURE_TENANT_ID=$VITE_AZURE_TENANT_ID \
    VITE_AZURE_API_CLIENT_ID=$VITE_AZURE_API_CLIENT_ID \
    VITE_AZURE_REDIRECT_URI=$VITE_AZURE_REDIRECT_URI
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
