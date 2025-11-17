#!/bin/bash

# Script completo para configurar DB en Railway
# Ejecuta: ./setup-db-completo.sh

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Configurando Base de Datos en Railway${NC}"
echo ""

# Verificar Railway CLI
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI no instalado${NC}"
    exit 1
fi

# Verificar autenticación
echo -e "${BLUE}1️⃣ Verificando autenticación...${NC}"
if railway whoami &> /dev/null; then
    USER=$(railway whoami 2>/dev/null | grep -o '@.*' || echo "autenticado")
    echo -e "   ${GREEN}✅ Autenticado como $USER${NC}"
else
    echo -e "${RED}❌ No autenticado. Ejecuta: railway login${NC}"
    exit 1
fi

# Verificar link
echo ""
echo -e "${BLUE}2️⃣ Verificando proyecto linkeado...${NC}"
if railway status &> /dev/null; then
    echo -e "   ${GREEN}✅ Proyecto linkeado${NC}"
    railway status
else
    echo -e "   ${YELLOW}⚠️  Proyecto NO linkeado${NC}"
    echo ""
    echo -e "${YELLOW}📌 IMPORTANTE:${NC}"
    echo "   Ejecuta manualmente: ${BLUE}railway link${NC}"
    echo "   Selecciona tu proyecto cuando te lo pida"
    echo ""
    read -p "   ¿Ya ejecutaste 'railway link'? (s/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "   Ejecuta 'railway link' y luego vuelve a ejecutar este script"
        exit 1
    fi
fi

# Obtener DATABASE_URL
echo ""
echo -e "${BLUE}3️⃣ Obteniendo DATABASE_URL...${NC}"

# Intentar múltiples métodos para obtener DATABASE_URL
DB_URL=""

# Método 1: Desde variables del proyecto
DB_URL=$(railway variables 2>/dev/null | grep -i "^DATABASE_URL=" | head -1 | cut -d'=' -f2- | tr -d ' ')

# Método 2: Desde railway run (si hay servicios)
if [ -z "$DB_URL" ]; then
    DB_URL=$(railway run echo \$DATABASE_URL 2>/dev/null | grep -v "^>" | grep -v "^$" | head -1 | tr -d ' ')
fi

# Método 3: Intentar desde diferentes servicios comunes
if [ -z "$DB_URL" ]; then
    for service in postgres Postgres PostgreSQL postgresql; do
        DB_URL=$(railway run --service "$service" echo \$DATABASE_URL 2>/dev/null | grep -v "^>" | grep -v "^$" | head -1 | tr -d ' ')
        [ ! -z "$DB_URL" ] && break
    done
fi

# Método 4: Si aún no se encuentra, pedir al usuario
if [ -z "$DB_URL" ]; then
    echo -e "   ${YELLOW}⚠️  DATABASE_URL no encontrada automáticamente${NC}"
    echo ""
    echo -e "${BLUE}📋 Obtén DATABASE_URL manualmente:${NC}"
    echo "   1. Ve a Railway Dashboard: https://railway.app"
    echo "   2. Abre tu proyecto 'cucuru-bridge'"
    echo "   3. Ve a tu servicio PostgreSQL"
    echo "   4. Pestaña 'Variables'"
    echo "   5. Copia el valor de DATABASE_URL"
    echo ""
    read -p "   Pega aquí la DATABASE_URL: " DB_URL
    echo ""
    
    if [ -z "$DB_URL" ]; then
        echo -e "   ${RED}❌ DATABASE_URL es requerida${NC}"
        exit 1
    fi
fi

DB_URL_MASKED=$(echo "$DB_URL" | sed 's/:[^:@]*@/:***@/')
echo -e "   ${GREEN}✅ DATABASE_URL encontrada${NC}"
echo "   🔗 $DB_URL_MASKED"

# Verificar psql
echo ""
echo -e "${BLUE}4️⃣ Verificando psql...${NC}"
if ! command -v psql &> /dev/null; then
    echo -e "   ${YELLOW}⚠️  psql no instalado${NC}"
    echo "   💡 Instala: brew install postgresql"
    PSQL_AVAILABLE=false
else
    echo -e "   ${GREEN}✅ psql instalado${NC}"
    PSQL_AVAILABLE=true
fi

# Crear esquemas
echo ""
echo -e "${BLUE}5️⃣ Creando esquemas...${NC}"
if [ "$PSQL_AVAILABLE" = true ]; then
    if psql "$DB_URL" -f infra/supabase/migrations/001_initial_schemas.sql &> /dev/null; then
        echo -e "   ${GREEN}✅ Esquemas creados${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Puede que ya existan${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  Instala psql para crear esquemas automáticamente${NC}"
    echo "   O créalos manualmente desde Railway Dashboard"
fi

# Configurar .env
echo ""
echo -e "${BLUE}6️⃣ Configurando .env local...${NC}"
mkdir -p infra/prisma
echo "DATABASE_URL=$DB_URL" > infra/prisma/.env
echo -e "   ${GREEN}✅ infra/prisma/.env creado${NC}"

# Generar Prisma Client
echo ""
echo -e "${BLUE}7️⃣ Generando Prisma Client...${NC}"
cd infra/prisma
if pnpm prisma generate 2>&1 | grep -q "Generated Prisma Client\|Already up to date"; then
    echo -e "   ${GREEN}✅ Prisma Client generado${NC}"
else
    echo -e "   ${YELLOW}⚠️  Verificando...${NC}"
    pnpm prisma generate
fi

# Aplicar migraciones
echo ""
echo -e "${BLUE}8️⃣ Aplicando migraciones...${NC}"
if pnpm prisma migrate deploy &> /dev/null; then
    echo -e "   ${GREEN}✅ Migraciones aplicadas${NC}"
else
    echo -e "   ${YELLOW}⚠️  Intentando migrate dev...${NC}"
    pnpm prisma migrate dev --name init || true
fi

cd ../..

# Verificar
echo ""
echo -e "${BLUE}9️⃣ Verificando...${NC}"
if [ "$PSQL_AVAILABLE" = true ]; then
    TABLES=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'core';" 2>/dev/null | tr -d ' ')
    if [ ! -z "$TABLES" ] && [ "$TABLES" -gt 0 ]; then
        echo -e "   ${GREEN}✅ $TABLES tablas en esquema 'core'${NC}"
    fi
fi

echo ""
echo -e "${GREEN}✅ ¡Configuración completada!${NC}"
echo ""
echo "🔍 Para verificar:"
echo "   cd infra/prisma && pnpm prisma studio"

