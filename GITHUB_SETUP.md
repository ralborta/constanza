# 🚀 Setup de GitHub

## ✅ Ya completado

- ✅ Git inicializado
- ✅ Commit inicial realizado
- ✅ Rama `main` configurada
- ✅ Estructura completa del monorepo

## 📝 Pasos para subir a GitHub

### 1. Crear repositorio en GitHub

1. Ve a https://github.com/new
2. Nombre del repositorio: `constanza` (o el que prefieras)
3. Descripción: "Sistema de Cobranzas B2B Omnicanal"
4. **NO** inicialices con README, .gitignore o licencia (ya los tenemos)
5. Clic en "Create repository"

### 2. Conectar y subir código

Ejecuta estos comandos en tu terminal:

```bash
cd /Users/ralborta/Constanza

# Agregar remote (reemplaza TU_USUARIO con tu usuario de GitHub)
git remote add origin https://github.com/TU_USUARIO/constanza.git

# O si prefieres SSH:
# git remote add origin git@github.com:TU_USUARIO/constanza.git

# Subir código
git push -u origin main
```

### 3. Configurar Secrets en GitHub

Ve a tu repositorio → Settings → Secrets and variables → Actions

Agrega estos secrets:

**Base de datos:**
- `DATABASE_URL` - URL de conexión a Supabase

**Vercel (Frontend):**
- `VERCEL_TOKEN` - Token de Vercel
- `VERCEL_ORG_ID` - ID de organización
- `VERCEL_PROJECT_ID` - ID del proyecto

**Railway (Microservicios):**
- `RAILWAY_TOKEN` - Token de Railway

**Aplicación:**
- `JWT_SECRET` - Secret para firmar JWTs
- `REDIS_URL` - URL de Redis (Railway)

**Integraciones:**
- `CUCURU_WEBHOOK_SECRET` - Secret para webhooks de Cucuru
- `BUILDERBOT_API_KEY` - API key de builderbot.cloud
- `ELEVENLABS_API_KEY` - API key de ElevenLabs
- `BINDX_API_KEY` - API key de BindX (cuando lo implementes)
- `BINDX_WEBHOOK_SECRET` - Secret para webhooks de BindX

### 4. Verificar CI/CD

Después del primer push, ve a:
- Tu repositorio → Actions
- Deberías ver el workflow "Deploy" ejecutándose

## 📦 Estructura subida

```
✅ apps/api-gateway/      - API Gateway (Fastify)
✅ apps/web/              - Dashboard Next.js
✅ apps/notifier/        - Worker BullMQ
✅ apps/rail-cucuru/      - Webhooks Cucuru
✅ packages/events/       - Contratos Zod
✅ infra/prisma/          - Schema y migraciones
✅ infra/supabase/        - Migraciones SQL
✅ .github/workflows/     - CI/CD
✅ railway.json           - Config Railway
```

## 🎉 Listo!

Una vez subido, puedes:
- Ver el código en GitHub
- Configurar CI/CD automático
- Conectar Railway y Vercel
- Colaborar con el equipo

