# 🌱 Instrucciones para Ejecutar el Seed

## ⚠️ Problema Actual

El endpoint `/seed` no está disponible porque **Railway no ha deployado el último commit** (`68107df`) que incluye el endpoint.

## ✅ Solución Rápida

### Opción 1: Forzar Redeploy en Railway (RECOMENDADO)

1. Ve a: https://railway.app
2. Selecciona el proyecto
3. Click en el servicio **`api-gateway`**
4. Ve a **"Deployments"** (o pestaña "Deploy")
5. Click en **"Redeploy"** o **"Deploy Latest Commit"**
6. Espera 2-3 minutos a que termine el deploy
7. Ejecuta el seed:

```bash
curl -X POST https://api-gateway-production.railway.app/seed \
  -H "Content-Type: application/json" \
  -H "x-seed-secret: constanza-seed-2025"
```

### Opción 2: Verificar que SEED_SECRET esté configurado

Antes de ejecutar el seed, asegúrate de que `SEED_SECRET` esté configurado en Railway:

1. Railway → `api-gateway` → **Settings** → **Variables**
2. Agregar variable:
   - **Name**: `SEED_SECRET`
   - **Value**: `constanza-seed-2025`
3. Guardar (Railway hará redeploy automáticamente)

### Opción 3: Ejecutar Seed Localmente (si tienes DATABASE_URL)

Si tienes acceso a la base de datos localmente:

```bash
export DATABASE_URL="tu-url-de-supabase"
cd infra/prisma
pnpm seed
```

## 📝 Credenciales que se crearán

Después de ejecutar el seed exitosamente:

- **Admin**: `admin@constanza.com` / `admin123`
- **Operador 1**: `operador1@constanza.com` / `operador123`
- **Cliente**: `cliente@acme.com` / `cliente123`

## 🔍 Verificar que el Endpoint esté Disponible

```bash
# Debe responder 200 (no 404)
curl -X POST https://api-gateway-production.railway.app/seed \
  -H "Content-Type: application/json" \
  -H "x-seed-secret: constanza-seed-2025"
```

Si responde `404 Not Found` → Railway no ha deployado el último commit
Si responde `503` → `SEED_SECRET` no está configurado
Si responde `401` → `SEED_SECRET` no coincide
Si responde `200` → ✅ Seed ejecutado exitosamente

