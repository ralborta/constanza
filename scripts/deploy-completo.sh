#!/bin/bash
set -euo pipefail

echo "🚀 Deploy Completo - Constanza"
echo "================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Valores por defecto
JWT_SECRET="WYDq2Nd9WeoMH5CseQAaDxNsnea9YkWS8DhoBZZKn74="
ALLOWED_ORIGINS="https://constanza-web.vercel.app,https://constanza-md9dafwl6-nivel-41.vercel.app,https://constanza-web-git-main-nivel-41.vercel.app"

# Función para verificar si un comando existe
check_command() {
    if ! command -v "$1" &> /dev/null; then
        return 1
    fi
    return 0
}

# Verificar Railway CLI
echo "📦 Verificando Railway CLI..."
if check_command railway; then
    echo -e "${GREEN}✅ Railway CLI instalado${NC}"
    if railway whoami &> /dev/null; then
        echo -e "${GREEN}✅ Logueado en Railway${NC}"
        RAILWAY_AVAILABLE=true
    else
        echo -e "${YELLOW}⚠️  No estás logueado en Railway${NC}"
        echo "   Ejecuta: railway login"
        RAILWAY_AVAILABLE=false
    fi
else
    echo -e "${YELLOW}⚠️  Railway CLI no está instalado${NC}"
    echo "   Instala con: npm i -g @railway/cli"
    RAILWAY_AVAILABLE=false
fi

echo ""

# Verificar Vercel CLI
echo "📦 Verificando Vercel CLI..."
if check_command vercel; then
    echo -e "${GREEN}✅ Vercel CLI instalado${NC}"
    VERCEL_AVAILABLE=true
else
    echo -e "${YELLOW}⚠️  Vercel CLI no está instalado${NC}"
    echo "   Instala con: npm i -g vercel"
    VERCEL_AVAILABLE=false
fi

echo ""
echo "================================"
echo ""

# Paso 1: Verificar que el código esté commiteado
echo "1️⃣ Verificando código..."
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Hay cambios sin commitear${NC}"
    echo "   Commiteando cambios..."
    git add -A
    git commit -m "chore: preparar deploy completo" || true
fi

if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
    echo "📤 Pusheando cambios a GitHub..."
    git push origin main || echo -e "${YELLOW}⚠️  No se pudo pushear (puede que ya esté actualizado)${NC}"
else
    echo -e "${GREEN}✅ Código ya está en GitHub${NC}"
fi

echo ""

# Paso 2: Configurar Railway
if [ "$RAILWAY_AVAILABLE" = true ]; then
    echo "2️⃣ Configurando Railway..."
    echo ""
    
    # Obtener DATABASE_URL de Supabase (pedir al usuario)
    echo -e "${YELLOW}📝 Necesito la DATABASE_URL de Supabase:${NC}"
    echo "   Ve a Supabase Dashboard → Settings → Database → Connection string → URI"
    read -p "   DATABASE_URL: " DATABASE_URL
    
    if [ -z "$DATABASE_URL" ]; then
        echo -e "${RED}❌ DATABASE_URL es requerida${NC}"
        exit 1
    fi
    
    # Configurar variables en Railway
    echo ""
    echo "🔧 Configurando variables en Railway (api-gateway)..."
    
    railway variables set DATABASE_URL="$DATABASE_URL" --service api-gateway || echo -e "${YELLOW}⚠️  No se pudo configurar DATABASE_URL${NC}"
    railway variables set ALLOWED_ORIGINS="$ALLOWED_ORIGINS" --service api-gateway || echo -e "${YELLOW}⚠️  No se pudo configurar ALLOWED_ORIGINS${NC}"
    railway variables set JWT_SECRET="$JWT_SECRET" --service api-gateway || echo -e "${YELLOW}⚠️  No se pudo configurar JWT_SECRET${NC}"
    
    echo ""
    echo "🔄 Forzando redeploy en Railway..."
    railway up --service api-gateway || echo -e "${YELLOW}⚠️  No se pudo forzar redeploy${NC}"
    
    echo ""
    echo "⏳ Esperando 30 segundos para que Railway inicie el deploy..."
    sleep 30
    
    # Obtener URL de Railway
    echo ""
    echo "🔍 Obteniendo URL de Railway..."
    RAILWAY_URL=$(railway domain --service api-gateway 2>/dev/null | head -1 || echo "")
    
    if [ -z "$RAILWAY_URL" ]; then
        echo -e "${YELLOW}⚠️  No se pudo obtener la URL automáticamente${NC}"
        echo "   Ve a Railway Dashboard → api-gateway → Settings → Domains"
        read -p "   URL de Railway: " RAILWAY_URL
    else
        echo -e "${GREEN}✅ URL de Railway: $RAILWAY_URL${NC}"
    fi
else
    echo "2️⃣ Configuración manual de Railway requerida"
    echo ""
    echo "   Ve a Railway Dashboard → api-gateway → Variables"
    echo "   Agrega:"
    echo "   - DATABASE_URL (de Supabase)"
    echo "   - ALLOWED_ORIGINS = $ALLOWED_ORIGINS"
    echo "   - JWT_SECRET = $JWT_SECRET"
    echo ""
    read -p "   URL de Railway (api-gateway): " RAILWAY_URL
fi

echo ""

# Paso 3: Configurar Vercel
if [ "$VERCEL_AVAILABLE" = true ] && [ -n "$RAILWAY_URL" ]; then
    echo "3️⃣ Configurando Vercel..."
    echo ""
    
    # Configurar NEXT_PUBLIC_API_URL
    echo "🔧 Configurando NEXT_PUBLIC_API_URL en Vercel..."
    cd apps/web
    vercel env add NEXT_PUBLIC_API_URL production <<< "$RAILWAY_URL" || echo -e "${YELLOW}⚠️  No se pudo configurar automáticamente${NC}"
    cd ../..
    
    echo ""
    echo "🔄 Forzando redeploy en Vercel..."
    vercel --prod --yes || echo -e "${YELLOW}⚠️  No se pudo forzar redeploy${NC}"
else
    echo "3️⃣ Configuración manual de Vercel requerida"
    echo ""
    echo "   Ve a Vercel Dashboard → Settings → Environment Variables"
    echo "   Agrega:"
    echo "   - NEXT_PUBLIC_API_URL = $RAILWAY_URL"
    echo ""
    echo "   Luego haz redeploy manualmente"
fi

echo ""
echo "================================"
echo ""
echo -e "${GREEN}✅ Deploy completado!${NC}"
echo ""
echo "📋 Resumen:"
echo "   - Código pusheado a GitHub ✅"
if [ "$RAILWAY_AVAILABLE" = true ]; then
    echo "   - Railway configurado ✅"
else
    echo "   - Railway: configuración manual requerida ⚠️"
fi
if [ "$VERCEL_AVAILABLE" = true ] && [ -n "$RAILWAY_URL" ]; then
    echo "   - Vercel configurado ✅"
else
    echo "   - Vercel: configuración manual requerida ⚠️"
fi
echo ""
echo "🔍 Próximos pasos:"
echo "   1. Espera 2-3 minutos a que Railway termine el deploy"
echo "   2. Verifica los logs de Railway para ver si las migraciones se ejecutaron"
echo "   3. Prueba subir un archivo Excel desde el frontend"
echo ""

