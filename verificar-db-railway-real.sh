#!/bin/bash

# Script para verificar la DATABASE_URL real de Railway y las tablas

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Verificando DATABASE_URL real de Railway...${NC}"
echo ""

# Intentar obtener DATABASE_URL desde Railway de diferentes formas
echo -e "${BLUE}1️⃣ Intentando obtener DATABASE_URL desde Railway...${NC}"

# Método 1: Variables del proyecto
DB_URL=$(railway variables 2>/dev/null | grep -i "^DATABASE_URL=" | head -1 | cut -d'=' -f2- | tr -d ' ')

# Método 2: Desde Postgres service
if [ -z "$DB_URL" ]; then
    echo "   Intentando desde servicio Postgres..."
    DB_URL=$(railway variables --service Postgres 2>/dev/null | grep -i "^DATABASE_URL=" | head -1 | cut -d'=' -f2- | tr -d ' ')
fi

# Método 3: Desde Postgres (minúscula)
if [ -z "$DB_URL" ]; then
    DB_URL=$(railway variables --service postgres 2>/dev/null | grep -i "^DATABASE_URL=" | head -1 | cut -d'=' -f2- | tr -d ' ')
fi

if [ -z "$DB_URL" ]; then
    echo -e "   ${RED}❌ No se pudo obtener DATABASE_URL automáticamente${NC}"
    echo ""
    echo -e "${YELLOW}📋 Obtén DATABASE_URL manualmente:${NC}"
    echo "   1. Ve a Railway Dashboard"
    echo "   2. Abre tu servicio Postgres"
    echo "   3. Pestaña 'Variables'"
    echo "   4. Copia DATABASE_URL"
    echo ""
    read -p "   Pega aquí la DATABASE_URL: " DB_URL
else
    DB_URL_MASKED=$(echo "$DB_URL" | sed 's/:[^:@]*@/:***@/')
    echo -e "   ${GREEN}✅ DATABASE_URL encontrada${NC}"
    echo "   🔗 $DB_URL_MASKED"
fi

if [ -z "$DB_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL es requerida${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}2️⃣ Verificando tablas en esta base de datos...${NC}"

if command -v psql &> /dev/null; then
    TABLES=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema IN ('core', 'pay', 'bindx', 'contact', 'ops', 'audit');" 2>/dev/null | tr -d ' ')
    
    if [ ! -z "$TABLES" ] && [ "$TABLES" -gt 0 ]; then
        echo -e "   ${GREEN}✅ Encontradas $TABLES tablas${NC}"
        
        echo ""
        echo -e "${BLUE}3️⃣ Listando tablas por esquema...${NC}"
        psql "$DB_URL" -c "SELECT table_schema, COUNT(*) as tablas FROM information_schema.tables WHERE table_schema IN ('core', 'pay', 'bindx', 'contact', 'ops', 'audit') GROUP BY table_schema ORDER BY table_schema;" 2>/dev/null
        
        echo ""
        echo -e "${BLUE}4️⃣ Listando tablas en esquema 'core'...${NC}"
        psql "$DB_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'core' ORDER BY table_name;" 2>/dev/null
    else
        echo -e "   ${RED}❌ No se encontraron tablas${NC}"
        echo ""
        echo -e "${YELLOW}💡 Necesitas crear las tablas${NC}"
        echo "   Ejecuta: ./configurar-db-con-url.sh '$DB_URL'"
    fi
else
    echo -e "   ${YELLOW}⚠️  psql no instalado${NC}"
    echo "   Instala: brew install postgresql"
fi

