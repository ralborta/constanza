#!/bin/bash

# Script para verificar Prisma y conexión a la base de datos
# Uso: ./verificar-prisma-db.sh

echo "🔍 Verificando Prisma y Base de Datos..."
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar que Prisma está instalado
echo "1️⃣ Verificando instalación de Prisma..."
if command -v pnpm &> /dev/null; then
    echo "   ✅ pnpm está instalado"
    
    # Verificar Prisma CLI
    if pnpm list -g prisma &> /dev/null || [ -d "node_modules/.bin/prisma" ] || [ -d "infra/prisma/node_modules/.bin/prisma" ]; then
        echo "   ✅ Prisma CLI encontrado"
    else
        echo "   ⚠️  Prisma CLI no encontrado globalmente, pero puede estar en node_modules"
    fi
    
    # Verificar @prisma/client
    if pnpm list @prisma/client &> /dev/null; then
        echo "   ✅ @prisma/client está instalado"
        PRISMA_VERSION=$(pnpm list @prisma/client 2>/dev/null | grep "@prisma/client" | head -1 | awk '{print $2}' || echo "desconocida")
        echo "   📦 Versión: $PRISMA_VERSION"
    else
        echo "   ❌ @prisma/client NO está instalado"
        echo "   💡 Ejecuta: pnpm install"
    fi
else
    echo "   ❌ pnpm NO está instalado"
    echo "   💡 Instala pnpm: npm install -g pnpm"
fi

echo ""

# 2. Verificar que el schema de Prisma existe
echo "2️⃣ Verificando schema de Prisma..."
if [ -f "infra/prisma/schema.prisma" ]; then
    echo "   ✅ schema.prisma encontrado"
    SCHEMA_LINES=$(wc -l < infra/prisma/schema.prisma)
    echo "   📄 Líneas en schema: $SCHEMA_LINES"
else
    echo "   ❌ schema.prisma NO encontrado en infra/prisma/"
fi

echo ""

# 3. Verificar variables de entorno
echo "3️⃣ Verificando variables de entorno..."
if [ -f ".env" ]; then
    echo "   ✅ Archivo .env encontrado"
    if grep -q "DATABASE_URL" .env; then
        DB_URL=$(grep "DATABASE_URL" .env | cut -d '=' -f2- | head -1)
        if [ -z "$DB_URL" ]; then
            echo "   ⚠️  DATABASE_URL está vacía"
        else
            # Ocultar password en la URL
            DB_URL_MASKED=$(echo "$DB_URL" | sed 's/:[^:@]*@/:***@/')
            echo "   ✅ DATABASE_URL configurada: $DB_URL_MASKED"
        fi
    else
        echo "   ❌ DATABASE_URL NO encontrada en .env"
    fi
else
    echo "   ⚠️  Archivo .env NO encontrado en la raíz"
    echo "   💡 Crea un archivo .env con DATABASE_URL"
fi

# Verificar otras variables importantes
echo ""
echo "   Variables adicionales a verificar:"
REQUIRED_VARS=("JWT_SECRET" "ALLOWED_ORIGINS")
for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -f ".env" ] && grep -q "^$VAR=" .env; then
        echo "   ✅ $VAR configurada"
    else
        echo "   ⚠️  $VAR NO configurada (opcional para desarrollo local)"
    fi
done

echo ""

# 4. Verificar que Prisma Client está generado
echo "4️⃣ Verificando Prisma Client generado..."
if [ -d "node_modules/.prisma/client" ] || [ -d "infra/prisma/node_modules/.prisma/client" ]; then
    echo "   ✅ Prisma Client generado"
else
    echo "   ⚠️  Prisma Client NO generado"
    echo "   💡 Ejecuta: cd infra/prisma && pnpm prisma generate"
fi

echo ""

# 5. Intentar conectar a la base de datos (si DATABASE_URL está configurada)
echo "5️⃣ Verificando conexión a la base de datos..."
if [ -f ".env" ] && grep -q "DATABASE_URL" .env; then
    DB_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | head -1)
    if [ ! -z "$DB_URL" ]; then
        # Intentar conectar usando Prisma
        cd infra/prisma 2>/dev/null || cd .
        
        # Verificar si podemos ejecutar prisma db pull o prisma migrate status
        if command -v pnpm &> /dev/null; then
            echo "   🔄 Intentando conectar..."
            if pnpm prisma db execute --stdin <<< "SELECT 1;" --schema=schema.prisma 2>/dev/null || \
               pnpm prisma migrate status --schema=schema.prisma 2>&1 | grep -q "Database.*connected\|All migrations"; then
                echo "   ✅ Conexión a la base de datos exitosa"
            else
                # Intentar método alternativo
                if pnpm prisma db pull --schema=schema.prisma --force 2>&1 | grep -q "Introspecting\|Error"; then
                    ERROR_OUTPUT=$(pnpm prisma db pull --schema=schema.prisma --force 2>&1)
                    if echo "$ERROR_OUTPUT" | grep -q "Can't reach database\|Connection refused\|authentication failed"; then
                        echo "   ❌ Error de conexión a la base de datos"
                        echo "   💡 Verifica que DATABASE_URL sea correcta y que la DB esté accesible"
                    else
                        echo "   ⚠️  No se pudo verificar la conexión automáticamente"
                        echo "   💡 Verifica manualmente ejecutando: cd infra/prisma && pnpm prisma studio"
                    fi
                else
                    echo "   ⚠️  No se pudo verificar la conexión automáticamente"
                fi
            fi
        fi
        
        cd - 2>/dev/null || cd .
    else
        echo "   ⚠️  DATABASE_URL está vacía, no se puede verificar conexión"
    fi
else
    echo "   ⚠️  DATABASE_URL no configurada, no se puede verificar conexión"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Resumen de verificación"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Para verificar manualmente:"
echo "  1. Generar Prisma Client:"
echo "     cd infra/prisma && pnpm prisma generate"
echo ""
echo "  2. Verificar conexión:"
echo "     cd infra/prisma && pnpm prisma studio"
echo "     (Esto abrirá Prisma Studio en el navegador)"
echo ""
echo "  3. Ver estado de migraciones:"
echo "     cd infra/prisma && pnpm prisma migrate status"
echo ""

