# Constanza - Sistema de Cobranzas B2B Omnicanal

## 🚀 Setup Rápido

Ver [README_SETUP.md](../README_SETUP.md) para instrucciones detalladas.

## 📦 Estructura del Monorepo

```
apps/
  ├── api-gateway/      # Fastify API Gateway
  ├── web/              # Next.js Dashboard
  ├── notifier/         # BullMQ Worker (Email/WhatsApp/Voice)
  └── rail-cucuru/     # Webhooks Cucuru ✅

packages/
  └── events/          # Contratos Zod compartidos

infra/
  ├── prisma/          # Schema y migraciones
  └── supabase/        # Migraciones SQL (RLS)
```

## 🔧 Desarrollo

```bash
# Instalar dependencias
pnpm install

# Desarrollo (todos los servicios)
pnpm dev

# O individual
cd apps/api-gateway && pnpm dev
cd apps/web && pnpm dev
cd apps/notifier && pnpm dev
```

## 📝 Crear Repositorio en GitHub

1. Ve a https://github.com/new
2. Crea un nuevo repositorio (ej: `constanza`)
3. Ejecuta estos comandos:

```bash
cd /Users/ralborta/Constanza
git remote add origin https://github.com/TU_USUARIO/constanza.git
git branch -M main
git push -u origin main
```

## 🔐 Secrets en GitHub

Configurar en Settings → Secrets and variables → Actions:

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

