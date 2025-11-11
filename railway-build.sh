#!/bin/bash
# Script de build para Railway
# Railway ejecutará este script si está configurado

set -e

echo "🔧 Configurando pnpm..."
corepack enable
corepack prepare pnpm@8.15.0 --activate

echo "📦 Instalando dependencias..."
pnpm install --frozen-lockfile

echo "🔨 Generando Prisma Client..."
cd infra/prisma
pnpm run generate
cd ../..

echo "🏗️  Building servicio: $RAILWAY_SERVICE_NAME"
cd apps/$RAILWAY_SERVICE_NAME
pnpm build

echo "✅ Build completado!"

