#!/bin/bash

# Script para ejecutar el seed de la base de datos
# Uso: ./scripts/seed-db.sh

set -e

echo "🌱 Ejecutando seed de la base de datos..."

# Verificar que DATABASE_URL esté configurada
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL no está configurada"
  echo "Por favor, configura la variable de entorno DATABASE_URL"
  echo "Ejemplo: export DATABASE_URL='postgresql://user:pass@host:port/db'"
  exit 1
fi

# Ir al directorio de prisma
cd "$(dirname "$0")/../infra/prisma"

# Ejecutar el seed
echo "📦 Instalando dependencias..."
pnpm install

echo "🌱 Ejecutando seed..."
pnpm seed

echo "✅ Seed completado exitosamente!"

