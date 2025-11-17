#!/bin/bash
# Script simple para obtener DATABASE_URL de Railway

echo "🔍 Obteniendo DATABASE_URL de Railway..."
echo ""

# Intentar diferentes métodos
echo "Método 1: railway variables..."
railway variables 2>&1 | grep -i "database" || echo "No encontrado"

echo ""
echo "Método 2: railway run..."
railway run echo \$DATABASE_URL 2>&1 | grep -v "^>" | grep -v "^$" || echo "No encontrado"

echo ""
echo "Si no aparece, obtén DATABASE_URL desde Railway Dashboard:"
echo "1. Ve a https://railway.app"
echo "2. Proyecto 'cucuru-bridge'"
echo "3. Servicio PostgreSQL"
echo "4. Variables → DATABASE_URL"

