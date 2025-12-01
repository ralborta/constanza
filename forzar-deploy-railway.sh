#!/bin/bash

# Script para forzar deploy en Railway

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Forzando deploy en Railway...${NC}"
echo ""

# Verificar Railway CLI
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI no instalado${NC}"
    exit 1
fi

# Verificar autenticación
if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ No estás autenticado. Ejecuta: railway login${NC}"
    exit 1
fi

# Verificar proyecto linkeado
if ! railway status &> /dev/null; then
    echo -e "${RED}❌ Proyecto no linkeado. Ejecuta: railway link${NC}"
    exit 1
fi

echo -e "${BLUE}1️⃣ Verificando estado del proyecto...${NC}"
railway status

echo ""
echo -e "${BLUE}2️⃣ Intentando forzar deploy...${NC}"

# Intentar diferentes métodos
if railway up 2>&1 | head -20; then
    echo -e "${GREEN}✅ Deploy iniciado${NC}"
else
    echo -e "${YELLOW}⚠️  Método 'railway up' no funcionó${NC}"
    echo ""
    echo -e "${BLUE}3️⃣ Intentando método alternativo...${NC}"
    
    if railway deploy 2>&1 | head -20; then
        echo -e "${GREEN}✅ Deploy iniciado${NC}"
    else
        echo -e "${YELLOW}⚠️  No se pudo forzar deploy automáticamente${NC}"
        echo ""
        echo -e "${BLUE}📋 Debes hacerlo manualmente:${NC}"
        echo "   1. Ve a Railway Dashboard: https://railway.app"
        echo "   2. Abre tu proyecto 'cucuru-bridge'"
        echo "   3. Para cada servicio (@constanza/api-gateway, etc.)"
        echo "   4. Click en 'Redeploy' o 'Deploy'"
        echo ""
        echo "   O haz un push vacío a GitHub:"
        echo "   git commit --allow-empty -m 'trigger deploy' && git push"
    fi
fi

echo ""
echo -e "${BLUE}💡 Alternativa: Push vacío a GitHub${NC}"
echo "   Esto puede trigger el deploy automático si tienes CI/CD configurado"
read -p "   ¿Quieres hacer un push vacío? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    git commit --allow-empty -m "chore: trigger Railway deploy" && git push origin main
    echo -e "${GREEN}✅ Push vacío realizado${NC}"
fi



