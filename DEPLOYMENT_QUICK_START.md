# 🚀 Quick Start - Railway y Vercel

## Orden de Configuración

### 1️⃣ Vercel (Frontend) - 5 minutos

1. Ve a: https://vercel.com/new
2. Conecta: `ralborta/constanza`
3. Configura:
   - **Root Directory**: `apps/web`
   - **Framework**: Next.js (auto-detectado)
4. Variables de entorno:
   ```
   NEXT_PUBLIC_API_URL=https://api-gateway-production.up.railway.app
   ```
   (Actualiza después con la URL real de Railway)
5. Deploy → Listo ✅

---

### 2️⃣ Railway (Microservicios) - 15 minutos

#### Paso 1: Crear Proyecto

1. Ve a: https://railway.app/new
2. "New Project" → "Deploy from GitHub repo"
3. Selecciona: `ralborta/constanza`

#### Paso 2: Crear Redis

1. "New Service" → "Database" → "Redis"
2. Railway crea Redis automáticamente ✅

#### Paso 3: Crear Servicios

Para cada servicio, repite:

**API Gateway:**
1. "New Service" → "GitHub Repo" → `ralborta/constanza`
2. Settings → Root Directory: `apps/api-gateway`
3. Variables:
   ```
   PORT=3000
   JWT_SECRET=genera-un-secret-seguro
   DATABASE_URL=tu-supabase-url
   REDIS_URL=${{Redis.REDIS_URL}}
   ALLOWED_ORIGINS=https://tu-app.vercel.app
   ```

**Notifier:**
1. "New Service" → "GitHub Repo" → `ralborta/constanza`
2. Settings → Root Directory: `apps/notifier`
3. Variables:
   ```
   PORT=3001
   REDIS_URL=${{Redis.REDIS_URL}}
   DATABASE_URL=tu-supabase-url
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tu-email
   SMTP_PASS=tu-app-password
   BUILDERBOT_API_KEY=tu-key
   ELEVENLABS_API_KEY=tu-key
   ```

**Rail Cucuru:**
1. "New Service" → "GitHub Repo" → `ralborta/constanza`
2. Settings → Root Directory: `apps/rail-cucuru`
3. Variables:
   ```
   PORT=3003
   CUCURU_WEBHOOK_SECRET=tu-secret
   DATABASE_URL=tu-supabase-url
   REDIS_URL=${{Redis.REDIS_URL}}
   ```

#### Paso 4: Obtener URLs

1. En cada servicio → Settings → Domains
2. Click "Generate Domain"
3. Copia la URL (ej: `api-gateway-production.up.railway.app`)
4. Actualiza `NEXT_PUBLIC_API_URL` en Vercel

---

## ✅ Checklist

- [ ] Vercel: Proyecto creado y deployado
- [ ] Railway: Proyecto creado
- [ ] Railway: Redis creado
- [ ] Railway: API Gateway creado y funcionando
- [ ] Railway: Notifier creado
- [ ] Railway: Rail Cucuru creado
- [ ] Variables de entorno configuradas en todos
- [ ] URLs actualizadas (Vercel → Railway)
- [ ] Health checks funcionando

---

## 🔍 Verificar

```bash
# API Gateway
curl https://api-gateway-production.up.railway.app/health

# Notifier
curl https://notifier-production.up.railway.app/health

# Rail Cucuru
curl https://rail-cucuru-production.up.railway.app/health
```

---

## 📚 Documentación Completa

Ver `DEPLOYMENT_SETUP.md` para detalles completos.

