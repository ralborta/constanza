#!/bin/bash

# Script para crear tablas desde Railway (usando la URL interna)

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Creando tablas desde Railway...${NC}"
echo ""

# Verificar Railway CLI
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI no instalado${NC}"
    exit 1
fi

# Verificar que esté linkeado
if ! railway status &> /dev/null; then
    echo -e "${RED}❌ Proyecto no linkeado. Ejecuta: railway link${NC}"
    exit 1
fi

echo -e "${BLUE}1️⃣ Generando Prisma Client en Railway...${NC}"
railway run --service @constanza/api-gateway pnpm --filter @constanza/api-gateway prisma generate --schema=../../infra/prisma/schema.prisma 2>&1 | tail -10

echo ""
echo -e "${BLUE}2️⃣ Creando tablas en la base de datos...${NC}"
railway run --service @constanza/api-gateway pnpm --filter @constanza/api-gateway prisma db push --schema=../../infra/prisma/schema.prisma 2>&1 | tail -20

echo ""
echo -e "${GREEN}✅ Proceso completado${NC}"
echo ""
echo "Las tablas deberían estar creadas ahora en Railway."

