#!/bin/bash
set -euo pipefail

echo "🚀 Forzando redeploy en Railway y ejecutando seed..."
echo ""

# Verificar si Railway CLI está disponible
if ! command -v railway &> /dev/null; then
  echo "⚠️  Railway CLI no está instalado"
  echo "   Instala con: npm i -g @railway/cli"
  echo ""
  echo "   O ejecuta el seed manualmente después de que Railway deploye:"
  echo "   ./ejecutar-seed-esperar.sh"
  exit 1
fi

# Verificar si está logueado
if ! railway whoami &> /dev/null; then
  echo "⚠️  No estás logueado en Railway CLI"
  echo "   Ejecuta: railway login"
  exit 1
fi

# Intentar hacer redeploy del servicio api-gateway
echo "🔄 Forzando redeploy del servicio api-gateway..."
if railway up --service api-gateway 2>&1 | tee /tmp/railway-redeploy.log; then
  echo "✅ Redeploy iniciado"
else
  echo "⚠️  No se pudo forzar redeploy automáticamente"
  echo "   Ve a Railway Dashboard y haz 'Redeploy' manualmente"
fi

echo ""
echo "⏳ Esperando a que el deploy termine (esto puede tardar 2-3 minutos)..."
sleep 60

# Ahora ejecutar el seed
echo ""
echo "🌱 Ejecutando seed..."
./ejecutar-seed-esperar.sh

