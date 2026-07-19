#!/usr/bin/env bash
# build-prod.sh — Compila el frontend con las variables de producción
# y genera el zip listo para subir a Dokploy.
#
# Uso:
#   chmod +x build-prod.sh
#   ./build-prod.sh
#
# El script te pedirá los valores si no los tiene en .env.production

set -e

echo ""
echo "=== BUILD DE PRODUCCIÓN - PIXEL TALES FRONTEND ==="
echo ""

# ── Leer variables de producción ──────────────────────────────────────────────
# Si existe .env.production lo usamos, si no pedimos los valores
if [ -f ".env.production" ]; then
  echo "→ Usando .env.production"
  export $(grep -v '^#' .env.production | xargs)
else
  echo "No se encontró .env.production"
  echo ""
  read -p "URL de tu API en producción (ej: https://api.tudominio.com/api): " VITE_API_URL
  read -p "API Key (deja vacío si no la usas): " VITE_API_KEY
  export VITE_API_URL
  export VITE_API_KEY
fi

echo ""
echo "→ VITE_API_URL = $VITE_API_URL"
echo "→ VITE_API_KEY = ${VITE_API_KEY:+(configurada)}"
echo ""

# ── Instalar dependencias y compilar ──────────────────────────────────────────
echo "→ Instalando dependencias..."
pnpm install --frozen-lockfile

echo "→ Compilando..."
pnpm build

echo "→ Build completado en dist/"
echo ""

# ── Crear zip para Dokploy ────────────────────────────────────────────────────
ZIP_NAME="../game-frontend-dokploy.zip"
rm -f "$ZIP_NAME"

zip -r "$ZIP_NAME" \
  dist/ \
  Dockerfile \
  nginx.conf

echo "✓ Zip creado: $(realpath $ZIP_NAME)"
echo ""
echo "=== PASOS EN DOKPLOY ==================================="
echo "  1. Nueva aplicación → Upload → sube game-frontend-dokploy.zip"
echo "  2. Build method: Dockerfile"
echo "  3. Puerto expuesto: 80"
echo "  4. Deploy"
echo "========================================================"
echo ""
