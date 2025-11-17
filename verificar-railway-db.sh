#!/bin/bash

# Script para verificar configuración de DB en Railway
# Uso: ./verificar-railway-db.sh

echo "🔍 Verificando Base de Datos en Railway..."
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar Railway CLI
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI no está instalado${NC}"
    echo "   💡 Instala: npm install -g @railway/cli"
    echo ""
    echo -e "${YELLOW}⚠️  Puedes verificar manualmente desde Railway Dashboard:${NC}"
    echo "   1. Ve a https://railway.app"
    echo "   2. Abre tu proyecto"
    echo "   3. Busca servicio 'Postgres' o 'PostgreSQL'"
    echo "   4. Ve a api-gateway → Variables → Busca DATABASE_URL"
    exit 1
fi

# Verificar si está linkeado
echo -e "${BLUE}1️⃣ Verificando proyecto Railway linkeado...${NC}"
if railway status &> /dev/null; then
    echo -e "   ${GREEN}✅ Proyecto Railway linkeado${NC}"
    PROJECT_NAME=$(railway status 2>/dev/null | head -1 || echo "desconocido")
    echo "   📦 Proyecto: $PROJECT_NAME"
else
    echo -e "   ${YELLOW}⚠️  No hay proyecto linkeado localmente${NC}"
    echo "   💡 Ejecuta: railway link"
    echo ""
    echo -e "${YELLOW}⚠️  Puedes verificar manualmente desde Railway Dashboard${NC}"
    exit 1
fi

echo ""

# Verificar DATABASE_URL
echo -e "${BLUE}2️⃣ Verificando DATABASE_URL...${NC}"
DB_URL=$(railway variables 2>/dev/null | grep -i "DATABASE_URL" | head -1 | awk -F'=' '{print $2}' | tr -d ' ')

if [ -z "$DB_URL" ]; then
    echo -e "   ${RED}❌ DATABASE_URL no encontrada${NC}"
    echo ""
    echo "   💡 Soluciones:"
    echo "   1. Si tienes Postgres en Railway:"
    echo "      - Ve a tu servicio Postgres → Variables"
    echo "      - Copia DATABASE_URL"
    echo "      - Ve a api-gateway → Variables → Agrega DATABASE_URL"
    echo ""
    echo "   2. Si usas Supabase:"
    echo "      - Obtén DATABASE_URL de Supabase Dashboard"
    echo "      - Agrégalo en Railway → api-gateway → Variables"
    exit 1
else
    # Ocultar password
    DB_URL_MASKED=$(echo "$DB_URL" | sed 's/:[^:@]*@/:***@/')
    echo -e "   ${GREEN}✅ DATABASE_URL encontrada${NC}"
    echo "   🔗 $DB_URL_MASKED"
    
    # Detectar si es Railway o Supabase
    if echo "$DB_URL" | grep -q "railway.app"; then
        echo "   🚂 Parece ser Railway Postgres"
    elif echo "$DB_URL" | grep -q "supabase.co"; then
        echo "   🗄️  Parece ser Supabase"
    else
        echo "   ❓ Origen desconocido"
    fi
fi

echo ""

# Intentar verificar conexión
echo -e "${BLUE}3️⃣ Verificando conexión a la base de datos...${NC}"
if command -v psql &> /dev/null; then
    # Intentar conectar (timeout de 5 segundos)
    if timeout 5 psql "$DB_URL" -c "SELECT 1;" &> /dev/null; then
        echo -e "   ${GREEN}✅ Conexión exitosa${NC}"
        
        # Verificar esquemas
        echo ""
        echo -e "${BLUE}4️⃣ Verificando esquemas...${NC}"
        SCHEMAS=$(psql "$DB_URL" -t -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('core', 'pay', 'bindx', 'contact', 'ops', 'audit');" 2>/dev/null | tr -d ' ' | grep -v '^$')
        
        if [ -z "$SCHEMAS" ]; then
            echo -e "   ${RED}❌ No se encontraron los esquemas necesarios${NC}"
            echo "   💡 Necesitas ejecutar las migraciones SQL:"
            echo "      psql \"\$DATABASE_URL\" < infra/supabase/migrations/001_initial_schemas.sql"
        else
            SCHEMA_COUNT=$(echo "$SCHEMAS" | wc -l | tr -d ' ')
            echo -e "   ${GREEN}✅ Encontrados $SCHEMA_COUNT esquemas${NC}"
            echo "$SCHEMAS" | sed 's/^/      - /'
            
            # Verificar tablas en core
            echo ""
            echo -e "${BLUE}5️⃣ Verificando tablas en esquema 'core'...${NC}"
            TABLES=$(psql "$DB_URL" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'core';" 2>/dev/null | tr -d ' ' | grep -v '^$')
            
            if [ -z "$TABLES" ]; then
                echo -e "   ${YELLOW}⚠️  No se encontraron tablas en 'core'${NC}"
                echo "   💡 Necesitas aplicar migraciones de Prisma:"
                echo "      cd infra/prisma && pnpm prisma migrate deploy"
            else
                TABLE_COUNT=$(echo "$TABLES" | wc -l | tr -d ' ')
                echo -e "   ${GREEN}✅ Encontradas $TABLE_COUNT tablas${NC}"
                echo "$TABLES" | head -5 | sed 's/^/      - /'
                if [ "$TABLE_COUNT" -gt 5 ]; then
                    echo "      ... y $((TABLE_COUNT - 5)) más"
                fi
            fi
        fi
    else
        echo -e "   ${RED}❌ No se pudo conectar${NC}"
        echo "   💡 Verifica que:"
        echo "      - DATABASE_URL sea correcta"
        echo "      - La base de datos esté accesible"
        echo "      - No haya problemas de red/firewall"
    fi
else
    echo -e "   ${YELLOW}⚠️  psql no está instalado${NC}"
    echo "   💡 Instala PostgreSQL client para verificar conexión"
    echo "      macOS: brew install postgresql"
    echo "      Linux: sudo apt-get install postgresql-client"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📋 Resumen${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Para verificar manualmente desde Railway Dashboard:"
echo "  1. Ve a https://railway.app"
echo "  2. Abre tu proyecto"
echo "  3. Busca servicio 'Postgres' o 'PostgreSQL'"
echo "  4. Ve a api-gateway → Variables → Verifica DATABASE_URL"
echo "  5. Ve a Postgres → Data → Query para verificar tablas"
echo ""

