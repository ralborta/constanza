#!/bin/bash

# Script para crear y subir repositorio a GitHub
# Uso: ./push-to-github.sh TU_USUARIO_GITHUB

set -e

if [ -z "$1" ]; then
  echo "❌ Error: Debes proporcionar tu usuario de GitHub"
  echo "Uso: ./push-to-github.sh TU_USUARIO_GITHUB"
  exit 1
fi

GITHUB_USER=$1
REPO_NAME="constanza"

echo "🚀 Preparando repositorio para GitHub..."
echo "Usuario: $GITHUB_USER"
echo "Repositorio: $REPO_NAME"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
  echo "❌ Error: No estás en el directorio raíz del proyecto"
  exit 1
fi

# Verificar que git está inicializado
if [ ! -d ".git" ]; then
  echo "❌ Error: Git no está inicializado"
  exit 1
fi

# Verificar si ya existe el remote
if git remote get-url origin > /dev/null 2>&1; then
  echo "⚠️  Ya existe un remote 'origin'"
  read -p "¿Deseas reemplazarlo? (y/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git remote remove origin
  else
    echo "❌ Cancelado"
    exit 1
  fi
fi

echo "📝 Creando repositorio en GitHub..."
echo ""
echo "Por favor, crea el repositorio en GitHub:"
echo "1. Ve a: https://github.com/new"
echo "2. Nombre: $REPO_NAME"
echo "3. Descripción: Sistema de Cobranzas B2B Omnicanal"
echo "4. Público ✅"
echo "5. NO marques 'Add a README file'"
echo "6. NO marques 'Add .gitignore'"
echo "7. NO marques 'Choose a license'"
echo "8. Click en 'Create repository'"
echo ""
read -p "Presiona Enter cuando hayas creado el repositorio..."

# Agregar remote
echo ""
echo "🔗 Agregando remote..."
git remote add origin https://github.com/$GITHUB_USER/$REPO_NAME.git

# Verificar que podemos conectar
echo "🔍 Verificando conexión..."
if git ls-remote --heads origin > /dev/null 2>&1; then
  echo "✅ Conexión exitosa"
else
  echo "❌ Error: No se pudo conectar al repositorio"
  echo "Verifica que:"
  echo "  1. El repositorio existe en GitHub"
  echo "  2. Tienes permisos de escritura"
  echo "  3. Tu usuario es correcto: $GITHUB_USER"
  exit 1
fi

# Push
echo ""
echo "📤 Subiendo código a GitHub..."
git push -u origin main

echo ""
echo "✅ ¡Repositorio creado y código subido exitosamente!"
echo ""
echo "🔗 URL: https://github.com/$GITHUB_USER/$REPO_NAME"
echo ""
echo "📋 Próximos pasos:"
echo "  1. Configurar Secrets en GitHub (Settings → Secrets → Actions)"
echo "  2. Ver GITHUB_SETUP.md para la lista completa de secrets"
echo "  3. Conectar Railway y Vercel"

