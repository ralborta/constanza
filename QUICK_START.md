# 🚀 Quick Start - Subir a GitHub

## Opción 1: Script Automático (Recomendado)

```bash
cd /Users/ralborta/Constanza
./push-to-github.sh TU_USUARIO_GITHUB
```

El script te guiará paso a paso.

## Opción 2: Manual

### 1. Crear repositorio en GitHub

Ve a: https://github.com/new

- **Nombre**: `constanza`
- **Descripción**: Sistema de Cobranzas B2B Omnicanal
- **Público** ✅
- **NO marques** ninguna opción (README, .gitignore, license)

Click en "Create repository"

### 2. Subir código

```bash
cd /Users/ralborta/Constanza

# Agregar remote (reemplaza TU_USUARIO con tu usuario)
git remote add origin https://github.com/TU_USUARIO/constanza.git

# Subir
git push -u origin main
```

### 3. Configurar Secrets

Ve a: https://github.com/TU_USUARIO/constanza/settings/secrets/actions

Agrega estos secrets (ver `GITHUB_SETUP.md` para detalles):

- `DATABASE_URL`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `RAILWAY_TOKEN`
- `JWT_SECRET`
- `REDIS_URL`
- `CUCURU_WEBHOOK_SECRET`
- `BUILDERBOT_API_KEY`
- `ELEVENLABS_API_KEY`

## ✅ Listo!

Tu repositorio estará en: `https://github.com/TU_USUARIO/constanza`

