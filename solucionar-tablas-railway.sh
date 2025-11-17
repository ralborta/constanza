#!/bin/bash

# Script para verificar y solucionar problemas de tablas en Railway

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Verificando conexión y tablas...${NC}"
echo ""

# Verificar conexión local
echo -e "${BLUE}1️⃣ Verificando conexión local...${NC}"
DB_URL="postgresql://postgres:CIcAzTslXvtZkhMeumvOFPOPHzLNYpXf@nozomi.proxy.rlwy.net:57027/railway"

TABLES=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema IN ('core', 'pay', 'bindx', 'contact', 'ops', 'audit');" 2>/dev/null | tr -d ' ')

if [ ! -z "$TABLES" ] && [ "$TABLES" -gt 0 ]; then
    echo -e "   ${GREEN}✅ Encontradas $TABLES tablas en la base de datos${NC}"
else
    echo -e "   ${RED}❌ No se encontraron tablas${NC}"
    exit 1
fi

# Verificar Prisma
echo ""
echo -e "${BLUE}2️⃣ Verificando Prisma...${NC}"
cd infra/prisma

if pnpm prisma validate &> /dev/null; then
    echo -e "   ${GREEN}✅ Schema de Prisma válido${NC}"
else
    echo -e "   ${RED}❌ Error en schema de Prisma${NC}"
    exit 1
fi

# Regenerar Prisma Client
echo ""
echo -e "${BLUE}3️⃣ Regenerando Prisma Client...${NC}"
pnpm prisma generate
echo -e "   ${GREEN}✅ Prisma Client regenerado${NC}"

cd ../..

echo ""
echo -e "${GREEN}✅ Verificación local completada${NC}"
echo ""
echo -e "${YELLOW}📋 Para Railway:${NC}"
echo ""
echo "1. Verifica que DATABASE_URL en Railway sea exactamente:"
echo "   ${BLUE}postgresql://postgres:CIcAzTslXvtZkhMeumvOFPOPHzLNYpXf@nozomi.proxy.rlwy.net:57027/railway${NC}"
echo ""
echo "2. Verifica los logs de api-gateway en Railway:"
echo "   - Busca errores de conexión"
echo "   - Busca 'relation does not exist'"
echo ""
echo "3. Si el build no genera Prisma Client, verifica:"
echo "   - Railway → api-gateway → Settings → Build"
echo "   - Debe ejecutar: pnpm prisma generate"
echo ""
echo "4. Redeploy api-gateway si es necesario"

