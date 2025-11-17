#!/bin/bash

# Script para corregir usuario administrador y verificar base de datos
# Ejecutar desde Railway Shell del servicio api-gateway

set -e

echo "🔧 Corrigiendo usuario administrador y verificando base de datos..."
echo ""

# Ir a la carpeta de Prisma
cd infra/prisma || { echo "❌ Error: No se encontró la carpeta infra/prisma"; exit 1; }

echo "📋 Paso 1: Verificando DATABASE_URL..."
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL no está configurada"
  echo "   Ve a Railway → api-gateway → Variables y agrega DATABASE_URL"
  exit 1
fi
echo "✅ DATABASE_URL configurada"

echo ""
echo "📋 Paso 2: Creando esquemas si no existen..."
pnpm prisma db execute --stdin <<EOF
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS pay;
CREATE SCHEMA IF NOT EXISTS bindx;
CREATE SCHEMA IF NOT EXISTS contact;
CREATE SCHEMA IF NOT EXISTS ops;
CREATE SCHEMA IF NOT EXISTS audit;
EOF
echo "✅ Esquemas verificados"

echo ""
echo "📋 Paso 3: Creando/actualizando tablas..."
pnpm prisma db push --accept-data-loss
echo "✅ Tablas verificadas"

echo ""
echo "📋 Paso 4: Verificando tablas creadas..."
pnpm prisma db execute --stdin <<EOF
SELECT table_schema, COUNT(*) as tablas
FROM information_schema.tables 
WHERE table_schema IN ('core', 'pay', 'bindx', 'contact', 'ops', 'audit')
GROUP BY table_schema
ORDER BY table_schema;
EOF

echo ""
echo "📋 Paso 5: Ejecutando seed para crear usuarios..."
pnpm seed

echo ""
echo "✅ Proceso completado!"
echo ""
echo "📝 Credenciales creadas:"
echo "   Admin: admin@constanza.com / admin123"
echo "   Operador: operador1@constanza.com / operador123"
echo "   Cliente: cliente@acme.com / cliente123"
echo ""
echo "🎯 Ahora puedes iniciar sesión con admin@constanza.com y cargar archivos"

