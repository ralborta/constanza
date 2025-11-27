#!/bin/bash

# Script para crear tablas directamente con SQL desde Railway

echo "🔧 Creando tablas directamente con SQL..."

railway run --service @constanza/api-gateway sh -c "
cd infra/prisma

# Crear esquemas
pnpm prisma db execute --stdin <<'EOF'
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS pay;
CREATE SCHEMA IF NOT EXISTS bindx;
CREATE SCHEMA IF NOT EXISTS contact;
CREATE SCHEMA IF NOT EXISTS ops;
CREATE SCHEMA IF NOT EXISTS audit;
EOF

# Forzar creación de tablas
pnpm prisma db push --force-reset --accept-data-loss
"

echo "✅ Comando ejecutado"







