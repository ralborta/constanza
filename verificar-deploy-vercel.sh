#!/bin/bash

echo "🔍 Verificando configuración para deploy en Vercel..."
echo ""

# Verificar que estamos en el root del proyecto
if [ ! -f "pnpm-workspace.yaml" ]; then
  echo "❌ Error: Ejecuta este script desde el root del proyecto"
  exit 1
fi

echo "✅ Estamos en el root del proyecto"
echo ""

# Verificar que el script vercel-build existe
if grep -q "vercel-build" apps/web/package.json; then
  echo "✅ Script 'vercel-build' encontrado en apps/web/package.json"
else
  echo "❌ Error: Script 'vercel-build' no encontrado"
  exit 1
fi

# Verificar que NEXT_PUBLIC_API_URL está configurada (si existe .env.local)
if [ -f "apps/web/.env.local" ]; then
  if grep -q "NEXT_PUBLIC_API_URL" apps/web/.env.local; then
    echo "✅ NEXT_PUBLIC_API_URL encontrada en apps/web/.env.local"
    grep "NEXT_PUBLIC_API_URL" apps/web/.env.local
  else
    echo "⚠️  NEXT_PUBLIC_API_URL no encontrada en apps/web/.env.local"
  fi
else
  echo "ℹ️  No hay apps/web/.env.local (normal, las variables van en Vercel)"
fi

echo ""
echo "📋 Checklist para Vercel:"
echo ""
echo "1. Root Directory: apps/web"
echo "2. Install Command: cd ../.. && pnpm install --frozen-lockfile"
echo "3. Build Command: pnpm run vercel-build"
echo "4. Output Directory: .next"
echo "5. 'Include files outside root directory': Enabled"
echo "6. NEXT_PUBLIC_API_URL: https://constanzaapi-gateway-production.up.railway.app"
echo ""
echo "🚀 Para hacer deploy:"
echo "   git add ."
echo "   git commit -m 'fix: actualizar configuración'"
echo "   git push origin main"
echo ""
echo "✅ Vercel hará deploy automáticamente"





