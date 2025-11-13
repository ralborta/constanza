#!/bin/bash
set -euo pipefail

API_URL="https://api-gateway-production.railway.app"
SEED_SECRET="constanza-seed-2025"

echo "🚀 Ejecutando seed - Proceso completo automático"
echo "================================================"
echo ""

# Paso 1: Verificar que el servicio esté activo
echo "1️⃣ Verificando que el servicio esté activo..."
if curl -s -f "$API_URL/health" > /dev/null; then
  echo "   ✅ Servicio activo"
else
  echo "   ❌ Servicio no responde. Verifica que esté deployado en Railway."
  exit 1
fi

# Paso 2: Intentar ejecutar el seed (máximo 30 intentos, cada 10 segundos)
echo ""
echo "2️⃣ Intentando ejecutar seed (esperando a que Railway deploye el último commit)..."
echo "   (Esto puede tardar hasta 5 minutos si Railway está deployando)"

for i in {1..30}; do
  HTTP_CODE=$(curl -s -o /tmp/seed-response.json -w "%{http_code}" -X POST "$API_URL/seed" \
    -H "Content-Type: application/json" \
    -H "x-seed-secret: $SEED_SECRET" \
    --max-time 5)
  
  case "$HTTP_CODE" in
    200)
      echo ""
      echo "   ✅ ¡ÉXITO! Seed ejecutado correctamente"
      echo ""
      echo "📋 Respuesta del servidor:"
      cat /tmp/seed-response.json | jq . 2>/dev/null || cat /tmp/seed-response.json
      echo ""
      echo "🎉 ¡Base de datos poblada exitosamente!"
      echo ""
      echo "📝 Credenciales de prueba:"
      echo "   👤 Admin:"
      echo "      Email: admin@constanza.com"
      echo "      Password: admin123"
      echo ""
      echo "   👤 Operador 1:"
      echo "      Email: operador1@constanza.com"
      echo "      Password: operador123"
      echo ""
      echo "   👤 Cliente:"
      echo "      Email: cliente@acme.com"
      echo "      Password: cliente123"
      echo ""
      exit 0
      ;;
    503)
      echo ""
      echo "   ⚠️  SEED_SECRET no configurado en Railway (503)"
      echo ""
      echo "   📋 Solución:"
      echo "   1. Ve a Railway Dashboard → api-gateway → Settings → Variables"
      echo "   2. Agrega variable: SEED_SECRET = $SEED_SECRET"
      echo "   3. Guarda (Railway hará redeploy automáticamente)"
      echo "   4. Espera 2-3 minutos y ejecuta este script nuevamente"
      exit 1
      ;;
    401)
      echo ""
      echo "   ❌ SEED_SECRET incorrecto (401)"
      echo ""
      echo "   📋 Solución:"
      echo "   Verifica que SEED_SECRET en Railway sea exactamente: $SEED_SECRET"
      exit 1
      ;;
    404)
      if [ $i -eq 1 ]; then
        echo "   ⏳ Endpoint aún no disponible (Railway no ha deployado el último commit)"
      fi
      if [ $((i % 6)) -eq 0 ]; then
        echo "   ⏳ Intento $i/30... (esperando deploy de Railway)"
      fi
      if [ $i -lt 30 ]; then
        sleep 10
      fi
      ;;
    *)
      echo "   ⚠️  Respuesta inesperada: HTTP $HTTP_CODE"
      if [ $i -lt 30 ]; then
        sleep 10
      fi
      ;;
  esac
done

# Si llegamos aquí, no se pudo ejecutar después de 30 intentos
echo ""
echo "❌ No se pudo ejecutar el seed después de 30 intentos (5 minutos)"
echo ""
echo "📋 Posibles causas y soluciones:"
echo ""
echo "1. Railway no ha deployado el último commit:"
echo "   → Ve a Railway Dashboard → api-gateway → Deployments"
echo "   → Click en 'Redeploy' o 'Deploy Latest Commit'"
echo "   → Espera 2-3 minutos y ejecuta este script nuevamente"
echo ""
echo "2. SEED_SECRET no está configurado:"
echo "   → Railway → api-gateway → Settings → Variables"
echo "   → Agrega: SEED_SECRET = $SEED_SECRET"
echo ""
echo "3. El servicio está usando un commit viejo:"
echo "   → Verifica en Railway que el commit sea: $(git log --oneline -1 | cut -d' ' -f1)"
echo "   → Si no, haz 'Redeploy' manualmente"
echo ""
echo "💡 Tip: Puedes ejecutar este script nuevamente después de hacer redeploy:"
echo "   ./ejecutar-seed-completo.sh"
echo ""
exit 1

