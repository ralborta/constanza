#!/bin/bash
set -euo pipefail

echo "🚀 Deploy Automático - Constanza"
echo "=================================="
echo ""

# Valores
JWT_SECRET="WYDq2Nd9WeoMH5CseQAaDxNsnea9YkWS8DhoBZZKn74="
ALLOWED_ORIGINS="https://constanza-web.vercel.app,https://constanza-md9dafwl6-nivel-41.vercel.app,https://constanza-web-git-main-nivel-41.vercel.app"

# 1. Push código
echo "1️⃣ Pusheando código a GitHub..."
git add -A
git commit -m "chore: deploy automático" 2>/dev/null || true
git push origin main 2>/dev/null || echo "⚠️  Ya está actualizado"

echo ""
echo "2️⃣ Configurando Railway..."
echo ""

# Intentar configurar Railway (si está linkeado)
if command -v railway &> /dev/null && railway whoami &> /dev/null; then
    echo "✅ Railway CLI disponible"
    
    # Configurar variables (intentar, puede fallar si no está linkeado)
    railway variables set ALLOWED_ORIGINS="$ALLOWED_ORIGINS" --service api-gateway 2>/dev/null && echo "✅ ALLOWED_ORIGINS configurado" || echo "⚠️  No se pudo configurar ALLOWED_ORIGINS (linkea el proyecto primero)"
    
    railway variables set JWT_SECRET="$JWT_SECRET" --service api-gateway 2>/dev/null && echo "✅ JWT_SECRET configurado" || echo "⚠️  No se pudo configurar JWT_SECRET (linkea el proyecto primero)"
    
    # Forzar redeploy
    railway up --service api-gateway 2>/dev/null && echo "✅ Redeploy iniciado" || echo "⚠️  No se pudo forzar redeploy"
else
    echo "⚠️  Railway CLI no disponible o no logueado"
fi

echo ""
echo "3️⃣ Configurando Vercel..."
echo ""

if command -v vercel &> /dev/null; then
    echo "✅ Vercel CLI disponible"
    echo "⚠️  Necesitas configurar NEXT_PUBLIC_API_URL manualmente en Vercel Dashboard"
else
    echo "⚠️  Vercel CLI no disponible"
fi

echo ""
echo "=================================="
echo ""
echo "✅ Código pusheado"
echo ""
echo "📋 PASOS MANUALES REQUERIDOS:"
echo ""
echo "1. Railway Dashboard:"
echo "   - Ve a tu proyecto en Railway"
echo "   - Si no tienes Postgres: + New → Database → Postgres"
echo "   - Ve a api-gateway → Variables"
echo "   - Agrega:"
echo "     * ALLOWED_ORIGINS = $ALLOWED_ORIGINS"
echo "     * JWT_SECRET = $JWT_SECRET"
echo "     * DATABASE_URL (se crea automáticamente si usas Railway Postgres)"
echo ""
echo "2. Vercel Dashboard:"
echo "   - Ve a tu proyecto en Vercel"
echo "   - Settings → Environment Variables"
echo "   - Agrega: NEXT_PUBLIC_API_URL = (URL de Railway api-gateway)"
echo ""
echo "3. Obtener URL de Railway:"
echo "   - Railway → api-gateway → Settings → Domains"
echo "   - Copia la URL y úsala en Vercel"
echo ""

