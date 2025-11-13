#!/bin/bash
set -euo pipefail

echo "🌱 Ejecutando seed automáticamente..."

# Intentar obtener la URL del API Gateway desde Railway CLI
API_URL=""
SEED_SECRET="${SEED_SECRET:-constanza-seed-2025}"

# Método 1: Intentar obtener desde Railway CLI
if command -v railway &> /dev/null; then
  echo "📡 Intentando obtener URL desde Railway CLI..."
  
  # Intentar obtener el servicio api-gateway
  RAILWAY_URL=$(railway domain 2>/dev/null | grep -i "api-gateway" | head -1 | awk '{print $NF}' || echo "")
  
  if [ -n "$RAILWAY_URL" ]; then
    API_URL="https://${RAILWAY_URL}"
    echo "✅ URL obtenida desde Railway CLI: $API_URL"
  fi
fi

# Método 2: Si no se obtuvo, intentar URLs comunes
if [ -z "$API_URL" ]; then
  echo "🔍 Intentando URLs comunes de Railway..."
  
  COMMON_URLS=(
    "https://api-gateway-production.up.railway.app"
    "https://api-gateway.up.railway.app"
    "https://api-gateway-production.railway.app"
  )
  
  for url in "${COMMON_URLS[@]}"; do
    echo "  Probando: $url/health"
    if curl -s -f -o /dev/null -w "%{http_code}" "$url/health" | grep -q "200"; then
      API_URL="$url"
      echo "✅ Servicio encontrado en: $API_URL"
      break
    fi
  done
fi

# Método 3: Si aún no se encontró, pedir al usuario
if [ -z "$API_URL" ]; then
  echo ""
  echo "⚠️  No se pudo obtener la URL automáticamente."
  echo "Por favor, proporciona la URL de tu API Gateway en Railway:"
  echo "  (Ejemplo: https://api-gateway-production.up.railway.app)"
  read -p "URL: " API_URL
fi

# Validar que la URL no esté vacía
if [ -z "$API_URL" ]; then
  echo "❌ Error: URL no proporcionada"
  exit 1
fi

# Remover trailing slash si existe
API_URL="${API_URL%/}"

echo ""
echo "🚀 Ejecutando seed en: $API_URL/seed"
echo ""

# Ejecutar el curl
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/seed" \
  -H "Content-Type: application/json" \
  -H "x-seed-secret: $SEED_SECRET")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📋 Respuesta del servidor:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""
echo "HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
  echo ""
  echo "✅ ¡Seed ejecutado exitosamente!"
  echo ""
  echo "📝 Credenciales de prueba:"
  echo "  Admin: admin@constanza.com / admin123"
  echo "  Operador: operador1@constanza.com / operador123"
  echo "  Cliente: cliente@acme.com / cliente123"
else
  echo ""
  echo "❌ Error ejecutando seed (HTTP $HTTP_CODE)"
  echo ""
  echo "Posibles causas:"
  echo "  1. El servicio no está deployado o no está corriendo"
  echo "  2. SEED_SECRET no coincide (configurado: $SEED_SECRET)"
  echo "  3. La URL no es correcta"
  exit 1
fi

