#!/bin/bash

# Script para linkear Railway automáticamente
# Intenta diferentes métodos para linkear el proyecto

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔗 Intentando linkear proyecto Railway...${NC}"
echo ""

# Verificar autenticación
if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ No estás autenticado en Railway${NC}"
    echo "   Ejecuta: railway login"
    exit 1
fi

# Verificar si ya está linkeado
if railway status &> /dev/null; then
    echo -e "${GREEN}✅ Ya hay un proyecto linkeado${NC}"
    railway status
    exit 0
fi

echo -e "${YELLOW}⚠️  No se puede linkear automáticamente sin el Project ID${NC}"
echo ""
echo -e "${BLUE}📋 Opciones:${NC}"
echo ""
echo "1. Linkear manualmente (recomendado):"
echo "   ${GREEN}railway link${NC}"
echo "   Luego selecciona tu proyecto de la lista"
echo ""
echo "2. Si conoces el Project ID:"
echo "   ${GREEN}railway link -p TU_PROJECT_ID${NC}"
echo ""
echo "3. Obtener Project ID desde Railway Dashboard:"
echo "   - Ve a https://railway.app"
echo "   - Abre tu proyecto"
echo "   - El Project ID está en la URL o en Settings"
echo ""
echo "4. Una vez linkeado, ejecuta:"
echo "   ${GREEN}./setup-db-completo.sh${NC}"

