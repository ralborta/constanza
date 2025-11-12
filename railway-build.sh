#!/bin/bash
# Script de build para Railway
# Railway ejecutará este script si está configurado

set -e

echo "🔧 Configurando pnpm..."
corepack enable
corepack prepare pnpm@9.12.0 --activate

echo "📦 Instalando dependencias..."
pnpm install --frozen-lockfile

echo "🔨 Generando Prisma Client..."
cd infra/prisma
pnpm run generate
cd ../..

echo "✅ Verificando que Prisma Client se generó..."
if [ ! -d "node_modules/.prisma" ] && [ ! -d "infra/prisma/node_modules/.prisma" ]; then
  echo "⚠️  Prisma Client no encontrado, regenerando..."
  cd infra/prisma
  pnpm run generate
  cd ../..
fi

echo "🏗️  Building servicio: $RAILWAY_SERVICE_NAME"
cd apps/$RAILWAY_SERVICE_NAME
pnpm build

echo "✅ Build completado!"

