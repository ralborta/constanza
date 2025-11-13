#!/bin/bash
set -euo pipefail

API_URL="https://api-gateway-production.railway.app"
SEED_SECRET="${SEED_SECRET:-constanza-seed-2025}"
MAX_ATTEMPTS=10
WAIT_SECONDS=30

echo "🌱 Esperando a que Railway deploye el último commit..."
echo "URL: $API_URL"
echo ""

# Verificar que el servicio esté corriendo
echo "🔍 Verificando que el servicio esté activo..."
if ! curl -s -f "$API_URL/health" > /dev/null; then
  echo "❌ El servicio no está respondiendo. Verifica que esté deployado en Railway."
  exit 1
fi
echo "✅ Servicio activo"

# Intentar hasta MAX_ATTEMPTS veces
for i in $(seq 1 $MAX_ATTEMPTS); do
  echo ""
  echo "🔄 Intento $i/$MAX_ATTEMPTS..."
  
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/seed" \
    -H "Content-Type: application/json" \
    -H "x-seed-secret: $SEED_SECRET")
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "✅ ¡Endpoint encontrado! Ejecutando seed..."
    echo ""
    
    RESPONSE=$(curl -s -X POST "$API_URL/seed" \
      -H "Content-Type: application/json" \
      -H "x-seed-secret: $SEED_SECRET")
    
    echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
    echo ""
    echo "🎉 ¡Seed ejecutado exitosamente!"
    echo ""
    echo "📝 Credenciales de prueba:"
    echo "  Admin: admin@constanza.com / admin123"
    echo "  Operador: operador1@constanza.com / operador123"
    echo "  Cliente: cliente@acme.com / cliente123"
    exit 0
  elif [ "$HTTP_CODE" = "404" ]; then
    echo "⏳ Endpoint aún no disponible (404). Esperando $WAIT_SECONDS segundos..."
    if [ $i -lt $MAX_ATTEMPTS ]; then
      sleep $WAIT_SECONDS
    fi
  elif [ "$HTTP_CODE" = "503" ]; then
    echo "⚠️  SEED_SECRET no configurado en Railway (503)"
    echo "   Configura SEED_SECRET=$SEED_SECRET en Railway → api-gateway → Variables"
    exit 1
  elif [ "$HTTP_CODE" = "401" ]; then
    echo "❌ SEED_SECRET incorrecto (401)"
    echo "   Verifica que SEED_SECRET en Railway coincida con: $SEED_SECRET"
    exit 1
  else
    echo "⚠️  Respuesta inesperada: HTTP $HTTP_CODE"
    if [ $i -lt $MAX_ATTEMPTS ]; then
      sleep $WAIT_SECONDS
    fi
  fi
done

echo ""
echo "❌ No se pudo ejecutar el seed después de $MAX_ATTEMPTS intentos"
echo ""
echo "Posibles soluciones:"
echo "  1. Ve a Railway → api-gateway → Deployments → Redeploy"
echo "  2. Verifica que el último commit esté deployado"
echo "  3. Verifica que SEED_SECRET esté configurado en Railway"
exit 1

