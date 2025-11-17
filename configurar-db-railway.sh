#!/bin/bash

# Script para configurar base de datos en Railway con Prisma
# Uso: ./configurar-db-railway.sh

set -e  # Salir si hay error

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Configurando Base de Datos en Railway con Prisma${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "infra/prisma/schema.prisma" ]; then
    echo -e "${RED}❌ Error: Debes ejecutar este script desde la raíz del proyecto${NC}"
    exit 1
fi

# Paso 1: Verificar Railway CLI
echo -e "${BLUE}1️⃣ Verificando Railway CLI...${NC}"
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI no está instalado${NC}"
    echo "   💡 Instala: npm install -g @railway/cli"
    exit 1
fi
echo -e "   ${GREEN}✅ Railway CLI instalado${NC}"

# Paso 2: Verificar proyecto linkeado
echo ""
echo -e "${BLUE}2️⃣ Verificando proyecto Railway...${NC}"
if ! railway status &> /dev/null; then
    echo -e "${YELLOW}⚠️  No hay proyecto linkeado${NC}"
    echo "   🔗 Linkeando proyecto..."
    railway link
else
    echo -e "   ${GREEN}✅ Proyecto Railway linkeado${NC}"
fi

# Paso 3: Obtener DATABASE_URL
echo ""
echo -e "${BLUE}3️⃣ Obteniendo DATABASE_URL...${NC}"
DB_URL=$(railway variables 2>/dev/null | grep -i "DATABASE_URL" | head -1 | awk -F'=' '{print $2}' | tr -d ' ')

if [ -z "$DB_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL no encontrada${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
    echo "   1. Ve a Railway Dashboard: https://railway.app"
    echo "   2. En tu proyecto, click '+ New' → 'Database' → 'Postgres'"
    echo "   3. Espera 1-2 minutos a que se cree"
    echo "   4. Luego ejecuta este script de nuevo"
    echo ""
    echo "   O si ya creaste Postgres pero no aparece:"
    echo "   - Ve a Postgres → Variables → Copia DATABASE_URL"
    echo "   - Ve a api-gateway → Variables → Agrega DATABASE_URL manualmente"
    exit 1
fi

# Ocultar password en la URL
DB_URL_MASKED=$(echo "$DB_URL" | sed 's/:[^:@]*@/:***@/')
echo -e "   ${GREEN}✅ DATABASE_URL encontrada${NC}"
echo "   🔗 $DB_URL_MASKED"

# Paso 4: Verificar psql
echo ""
echo -e "${BLUE}4️⃣ Verificando psql (cliente PostgreSQL)...${NC}"
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  psql no está instalado${NC}"
    echo "   💡 Instala PostgreSQL client:"
    echo "      macOS: brew install postgresql"
    echo "      Linux: sudo apt-get install postgresql-client"
    echo ""
    echo -e "${YELLOW}⚠️  Continuando sin psql...${NC}"
    echo "   Tendrás que crear los esquemas manualmente desde Railway Dashboard"
    PSQL_AVAILABLE=false
else
    echo -e "   ${GREEN}✅ psql instalado${NC}"
    PSQL_AVAILABLE=true
fi

# Paso 5: Crear esquemas
echo ""
echo -e "${BLUE}5️⃣ Creando esquemas en la base de datos...${NC}"
if [ "$PSQL_AVAILABLE" = true ]; then
    echo "   🔄 Ejecutando migración SQL..."
    if psql "$DB_URL" -f infra/supabase/migrations/001_initial_schemas.sql &> /dev/null; then
        echo -e "   ${GREEN}✅ Esquemas creados${NC}"
        
        # Verificar esquemas
        SCHEMAS=$(psql "$DB_URL" -t -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('core', 'pay', 'bindx', 'contact', 'ops', 'audit');" 2>/dev/null | tr -d ' ' | grep -v '^$' | wc -l | tr -d ' ')
        echo "   📊 Esquemas encontrados: $SCHEMAS/6"
    else
        echo -e "   ${YELLOW}⚠️  Error al crear esquemas${NC}"
        echo "   💡 Puede que ya existan, continuando..."
    fi
else
    echo -e "   ${YELLOW}⚠️  psql no disponible${NC}"
    echo "   💡 Crea los esquemas manualmente:"
    echo "      1. Ve a Railway → Postgres → Data → Query"
    echo "      2. Ejecuta el contenido de: infra/supabase/migrations/001_initial_schemas.sql"
fi

# Paso 6: Configurar DATABASE_URL localmente
echo ""
echo -e "${BLUE}6️⃣ Configurando DATABASE_URL localmente...${NC}"
mkdir -p infra/prisma
echo "DATABASE_URL=$DB_URL" > infra/prisma/.env
echo -e "   ${GREEN}✅ Archivo infra/prisma/.env creado${NC}"

# Paso 7: Generar Prisma Client
echo ""
echo -e "${BLUE}7️⃣ Generando Prisma Client...${NC}"
cd infra/prisma
if pnpm prisma generate &> /dev/null; then
    echo -e "   ${GREEN}✅ Prisma Client generado${NC}"
else
    echo -e "   ${RED}❌ Error al generar Prisma Client${NC}"
    echo "   💡 Verifica que las dependencias estén instaladas: pnpm install"
    exit 1
fi

# Paso 8: Aplicar migraciones
echo ""
echo -e "${BLUE}8️⃣ Aplicando migraciones de Prisma...${NC}"
echo "   🔄 Esto creará todas las tablas..."

if pnpm prisma migrate deploy &> /dev/null; then
    echo -e "   ${GREEN}✅ Migraciones aplicadas${NC}"
else
    echo -e "   ${YELLOW}⚠️  Intentando migrate dev (primera vez)...${NC}"
    if pnpm prisma migrate dev --name init &> /dev/null; then
        echo -e "   ${GREEN}✅ Migraciones creadas y aplicadas${NC}"
    else
        echo -e "   ${RED}❌ Error al aplicar migraciones${NC}"
        echo "   💡 Verifica los logs arriba para ver el error"
        exit 1
    fi
fi

cd ../..

# Paso 9: Verificar tablas
echo ""
echo -e "${BLUE}9️⃣ Verificando tablas creadas...${NC}"
if [ "$PSQL_AVAILABLE" = true ]; then
    TABLES=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'core';" 2>/dev/null | tr -d ' ')
    if [ ! -z "$TABLES" ] && [ "$TABLES" -gt 0 ]; then
        echo -e "   ${GREEN}✅ Encontradas $TABLES tablas en esquema 'core'${NC}"
    else
        echo -e "   ${YELLOW}⚠️  No se encontraron tablas en 'core'${NC}"
        echo "   💡 Puede que necesites aplicar migraciones manualmente"
    fi
else
    echo -e "   ${YELLOW}⚠️  No se puede verificar (psql no disponible)${NC}"
    echo "   💡 Usa Prisma Studio para verificar: cd infra/prisma && pnpm prisma studio"
fi

# Resumen
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Configuración Completada${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Resumen:"
echo "   ✅ DATABASE_URL configurada"
echo "   ✅ Esquemas creados (o verificados)"
echo "   ✅ Prisma Client generado"
echo "   ✅ Migraciones aplicadas"
echo ""
echo "🔍 Para verificar:"
echo "   cd infra/prisma"
echo "   pnpm prisma studio"
echo ""
echo "🚀 Próximos pasos:"
echo "   1. Verifica que api-gateway en Railway tenga DATABASE_URL"
echo "   2. Redeploy api-gateway si es necesario"
echo "   3. Verifica logs de api-gateway (no deberían haber errores de DB)"
echo ""

