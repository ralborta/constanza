#!/bin/bash

# Script para crear tablas en Railway desde el shell local

set -e

echo "🔧 Creando tablas en Railway..."
echo ""

# Obtener DATABASE_URL desde Railway
echo "📡 Obteniendo DATABASE_URL desde Railway..."
DATABASE_URL=$(railway variables --service @constanza/api-gateway --json | jq -r '.[] | select(.name == "DATABASE_URL") | .value' 2>/dev/null || echo "")

if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  No se pudo obtener DATABASE_URL automáticamente"
    echo "💡 Usa la URL que tienes en Railway Dashboard → Postgres → Variables"
    read -p "Ingresa DATABASE_URL: " DATABASE_URL
fi

echo "✅ DATABASE_URL obtenida"
echo ""

# Crear esquemas primero
echo "📦 Creando esquemas..."
railway run --service @constanza/api-gateway sh -c "cd infra/prisma && pnpm prisma db execute --stdin" <<'EOF'
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS pay;
CREATE SCHEMA IF NOT EXISTS bindx;
CREATE SCHEMA IF NOT EXISTS contact;
CREATE SCHEMA IF NOT EXISTS ops;
CREATE SCHEMA IF NOT EXISTS audit;
EOF

echo "✅ Esquemas creados"
echo ""

# Crear tablas con Prisma
echo "🚀 Creando tablas con Prisma..."
railway run --service @constanza/api-gateway sh -c "cd infra/prisma && pnpm prisma db push --force-reset --accept-data-loss --skip-generate" 2>&1 | tail -10

echo ""
echo "✅ Tablas creadas"
echo ""

# Verificar tablas
echo "🔍 Verificando tablas creadas..."
railway run --service @constanza/api-gateway sh -c "cd infra/prisma && pnpm prisma db execute --stdin" <<'EOF'
SELECT 
  table_schema,
  COUNT(*) as total_tablas
FROM information_schema.tables 
WHERE table_schema IN ('core', 'pay', 'bindx', 'contact', 'ops', 'audit')
GROUP BY table_schema
ORDER BY table_schema;
EOF

echo ""
echo "🎉 ¡Completado!"
echo ""
echo "💡 Para ver las tablas, usa Prisma Studio:"
echo "   railway run --service @constanza/api-gateway sh -c 'cd infra/prisma && pnpm prisma studio'"







