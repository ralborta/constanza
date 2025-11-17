#!/bin/bash

# Script para configurar DB con DATABASE_URL proporcionada
# Uso: ./configurar-db-con-url.sh

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Configurando Base de Datos con Prisma${NC}"
echo ""

# Solicitar DATABASE_URL
if [ -z "$1" ]; then
    echo -e "${YELLOW}📋 Necesito la DATABASE_URL de Railway${NC}"
    echo ""
    echo "Para obtenerla:"
    echo "1. Ve a https://railway.app"
    echo "2. Abre tu proyecto 'cucuru-bridge'"
    echo "3. Ve a tu servicio PostgreSQL"
    echo "4. Pestaña 'Variables'"
    echo "5. Copia el valor de DATABASE_URL"
    echo ""
    read -p "Pega aquí la DATABASE_URL: " DB_URL
    echo ""
else
    DB_URL="$1"
fi

if [ -z "$DB_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL es requerida${NC}"
    exit 1
fi

DB_URL_MASKED=$(echo "$DB_URL" | sed 's/:[^:@]*@/:***@/')
echo -e "${GREEN}✅ DATABASE_URL recibida${NC}"
echo "   🔗 $DB_URL_MASKED"
echo ""

# Verificar psql
echo -e "${BLUE}1️⃣ Verificando psql...${NC}"
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
echo -e "${BLUE}2️⃣ Creando esquemas...${NC}"
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
echo -e "${BLUE}3️⃣ Configurando .env local...${NC}"
mkdir -p infra/prisma
echo "DATABASE_URL=$DB_URL" > infra/prisma/.env
echo -e "   ${GREEN}✅ infra/prisma/.env creado${NC}"

# Generar Prisma Client
echo ""
echo -e "${BLUE}4️⃣ Generando Prisma Client...${NC}"
cd infra/prisma
if pnpm prisma generate 2>&1 | grep -q "Generated Prisma Client\|Already up to date"; then
    echo -e "   ${GREEN}✅ Prisma Client generado${NC}"
else
    echo -e "   ${YELLOW}⚠️  Verificando...${NC}"
    pnpm prisma generate
fi

# Aplicar migraciones
echo ""
echo -e "${BLUE}5️⃣ Aplicando migraciones...${NC}"
if pnpm prisma migrate deploy &> /dev/null; then
    echo -e "   ${GREEN}✅ Migraciones aplicadas${NC}"
else
    echo -e "   ${YELLOW}⚠️  Intentando migrate dev (primera vez)...${NC}"
    pnpm prisma migrate dev --name init || true
fi

cd ../..

# Verificar
echo ""
echo -e "${BLUE}6️⃣ Verificando...${NC}"
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

