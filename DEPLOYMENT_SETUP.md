# 🚀 Guía de Despliegue - Railway y Vercel

## 📋 Resumen

- **Vercel**: Frontend (`apps/web` - Next.js)
- **Railway**: Todos los microservicios (api-gateway, notifier, rail-cucuru, etc.)
- **Supabase**: Base de datos (ya debería estar configurado)
- **Railway Redis**: Para BullMQ (colas)

---

## 1. Vercel (Frontend)

### Crear Proyecto

1. Ve a: https://vercel.com/new
2. Conecta tu repositorio de GitHub: `ralborta/constanza`
3. Configuración:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `cd ../.. && pnpm install && pnpm --filter @constanza/web build`
   - **Output Directory**: `.next`
   - **Install Command**: `pnpm install`

### Variables de Entorno

En Vercel → Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://api-gateway-production.up.railway.app
```

(Actualiza con la URL real de tu API Gateway en Railway)

### Deploy

Vercel detectará automáticamente los pushes a `main` y desplegará.

---

## 2. Railway (Microservicios)

### Crear Proyecto

1. Ve a: https://railway.app/new
2. Click en "New Project"
3. Selecciona "Deploy from GitHub repo"
4. Conecta tu repositorio: `ralborta/constanza`

### Crear Servicios

Necesitas crear un servicio por cada microservicio:

#### A) API Gateway

1. Click en "New Service" → "GitHub Repo"
2. Selecciona `ralborta/constanza`
3. Configuración:
   - **Root Directory**: `apps/api-gateway`
   - **Build Command**: `cd ../.. && pnpm install && pnpm --filter @constanza/api-gateway build`
   - **Start Command**: `cd apps/api-gateway && pnpm start`

**Variables de Entorno:**
```
PORT=3000
JWT_SECRET=tu-secret-super-seguro-aqui
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
ALLOWED_ORIGINS=https://tu-app.vercel.app
```

#### B) Notifier

1. Click en "New Service" → "GitHub Repo"
2. Selecciona `ralborta/constanza`
3. Configuración:
   - **Root Directory**: `apps/notifier`
   - **Build Command**: `cd ../.. && pnpm install && pnpm --filter @constanza/notifier build`
   - **Start Command**: `cd apps/notifier && pnpm start`

**Variables de Entorno:**
```
PORT=3001
REDIS_URL=${{Redis.REDIS_URL}}
DATABASE_URL=${{Postgres.DATABASE_URL}}
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
SMTP_FROM=noreply@constanza.com
BUILDERBOT_API_KEY=tu-builderbot-key
BUILDERBOT_API_URL=https://api.builderbot.cloud
ELEVENLABS_API_KEY=tu-elevenlabs-key
ELEVENLABS_AGENT_ID=tu-agent-id
```

#### C) Rail Cucuru

1. Click en "New Service" → "GitHub Repo"
2. Selecciona `ralborta/constanza`
3. Configuración:
   - **Root Directory**: `apps/rail-cucuru`
   - **Build Command**: `cd ../.. && pnpm install && pnpm --filter @constanza/rail-cucuru build`
   - **Start Command**: `cd apps/rail-cucuru && pnpm start`

**Variables de Entorno:**
```
PORT=3003
CUCURU_WEBHOOK_SECRET=tu-cucuru-secret
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

### Crear Redis (Railway)

1. Click en "New Service" → "Database" → "Redis"
2. Railway creará automáticamente un Redis
3. Las variables `REDIS_URL` se inyectarán automáticamente en los servicios

### Crear Postgres (Opcional - si no usas Supabase)

Si prefieres usar Railway Postgres en lugar de Supabase:

1. Click en "New Service" → "Database" → "PostgreSQL"
2. Railway creará automáticamente una base de datos
3. La variable `DATABASE_URL` se inyectará automáticamente

**Nota**: Si usas Supabase, configura `DATABASE_URL` manualmente con la URL de Supabase.

---

## 3. Configurar Domains (Opcional)

### Railway (API Gateway)

1. En el servicio `api-gateway` → Settings → Domains
2. Click en "Generate Domain" o agrega un dominio personalizado
3. Copia la URL (ej: `api-gateway-production.up.railway.app`)
4. Actualiza `NEXT_PUBLIC_API_URL` en Vercel con esta URL

### Vercel (Frontend)

1. En tu proyecto → Settings → Domains
2. Vercel ya te da un dominio (ej: `constanza.vercel.app`)
3. O agrega un dominio personalizado

---

## 4. Verificar Despliegue

### Health Checks

```bash
# API Gateway
curl https://api-gateway-production.up.railway.app/health

# Notifier
curl https://notifier-production.up.railway.app/health

# Rail Cucuru
curl https://rail-cucuru-production.up.railway.app/health
```

### Frontend

Abre: `https://tu-app.vercel.app`

---

## 5. Configurar Webhooks

### Cucuru → Rail Cucuru

En la configuración de Cucuru, apunta el webhook a:
```
https://rail-cucuru-production.up.railway.app/wh/cucuru/payment.applied
```

Con header:
```
X-Cucuru-Signature: <hmac_sha256>
```

---

## 📝 Checklist

- [ ] Repositorio en GitHub creado y código subido
- [ ] Proyecto en Vercel creado y conectado
- [ ] Variables de entorno en Vercel configuradas
- [ ] Proyecto en Railway creado
- [ ] Servicio API Gateway en Railway
- [ ] Servicio Notifier en Railway
- [ ] Servicio Rail Cucuru en Railway
- [ ] Redis en Railway creado
- [ ] Variables de entorno en cada servicio configuradas
- [ ] Health checks funcionando
- [ ] Frontend accesible
- [ ] Webhooks configurados

---

## 🔧 Troubleshooting

### Build falla en Railway

- Verifica que `pnpm` esté instalado
- Revisa los logs en Railway
- Asegúrate de que el `Root Directory` sea correcto

### Variables de entorno no funcionan

- Verifica que uses `${{Service.VARIABLE}}` para servicios de Railway
- Para Supabase, usa la URL completa

### Frontend no conecta con API

- Verifica `NEXT_PUBLIC_API_URL` en Vercel
- Asegúrate de que Railway esté exponiendo el puerto correcto
- Revisa CORS en api-gateway

