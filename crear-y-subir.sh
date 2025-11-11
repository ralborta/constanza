#!/bin/bash

# Script para crear repositorio en GitHub y subir código
# Requiere: GitHub CLI (gh) instalado

set -e

echo "🚀 Creando repositorio en GitHub y subiendo código..."
echo ""

# Verificar que gh está instalado
if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI (gh) no está instalado"
  echo ""
  echo "Instálalo con:"
  echo "  brew install gh"
  echo ""
  echo "O crea el repositorio manualmente en:"
  echo "  https://github.com/new"
  echo ""
  echo "Luego ejecuta:"
  echo "  git push -u origin main"
  exit 1
fi

# Verificar que estás autenticado
if ! gh auth status &> /dev/null; then
  echo "❌ No estás autenticado en GitHub CLI"
  echo ""
  echo "Ejecuta: gh auth login"
  exit 1
fi

echo "✅ GitHub CLI configurado"
echo ""

# Crear repositorio
echo "📝 Creando repositorio 'constanza' en GitHub..."
gh repo create constanza --public --description "Sistema de Cobranzas B2B Omnicanal" --source=. --remote=origin --push

echo ""
echo "✅ ¡Repositorio creado y código subido exitosamente!"
echo ""
echo "🔗 URL: https://github.com/$(gh api user --jq .login)/constanza"
echo ""
echo "📋 Próximos pasos:"
echo "  1. Configurar Secrets en GitHub (Settings → Secrets → Actions)"
echo "  2. Ver GITHUB_SETUP.md para la lista completa"
echo "  3. Crear proyectos en Railway y Vercel"

