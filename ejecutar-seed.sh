#!/bin/bash

# Script para ejecutar el seed desde Railway
# Uso: ./ejecutar-seed.sh

# Reemplaza esta URL con la URL real de tu API Gateway en Railway
API_URL="${API_GATEWAY_URL:-https://api-gateway-production.up.railway.app}"

# Reemplaza este secret con el que configuraste en Railway
SEED_SECRET="${SEED_SECRET:-constanza-seed-2025}"

echo "🌱 Ejecutando seed en Railway..."
echo "URL: $API_URL"
echo ""

curl -X POST "$API_URL/seed" \
  -H "Content-Type: application/json" \
  -H "x-seed-secret: $SEED_SECRET" \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "✅ Seed ejecutado!"

