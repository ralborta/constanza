#!/bin/bash
# Script para linkear Railway y configurar DB
# Ejecuta: ./linkear-y-configurar.sh

echo "🔗 Linkeando proyecto Railway..."
railway link

echo ""
echo "✅ Si el link fue exitoso, ejecuta ahora:"
echo "   ./setup-db-completo.sh"
