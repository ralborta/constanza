# 🗄️ Guía Completa: Configurar Base de Datos en Railway

## 📋 Resumen

Tu proyecto necesita una base de datos PostgreSQL para funcionar. Tienes dos opciones:

1. **Railway Postgres** (más fácil, recomendado)
2. **Supabase** (si ya tienes cuenta)

---

## 🚀 Opción 1: Railway Postgres (Recomendado)

### Paso 1: Crear Postgres en Railway

1. Ve a Railway Dashboard: https://railway.app
2. Abre tu proyecto
3. Click en **"+ New"** → **"Database"** → **"Postgres"**
4. Railway crea automáticamente:
   - Una base de datos PostgreSQL
   - La variable `DATABASE_URL` en todos tus servicios
   - Todo configurado y listo

### Paso 2: Verificar que DATABASE_URL se agregó

1. Ve a tu servicio `api-gateway`
2. Pestaña **"Variables"**
3. Expande **"Variables added by Railway"**
4. Deberías ver `DATABASE_URL` con un valor como:
   ```
   postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
   ```

### Paso 3: Aplicar el Schema de la Base de Datos

Necesitas ejecutar las migraciones SQL para crear las tablas. Tienes dos opciones:

#### Opción A: Desde Railway (Recomendado)

1. En Railway, ve a tu servicio `api-gateway`
2. Pestaña **"Settings"** → **"Deploy"**
3. Agrega un **"Deploy Hook"** o usa el **"Raw Editor"** para ejecutar comandos
4. O mejor: agrega esto al **"Start Command"**:

```bash
cd /app && pnpm --filter @constanza/api-gateway prisma migrate deploy --schema=../../infra/prisma/schema.prisma && pnpm --filter @constanza/api-gateway start
```

#### Opción B: Desde tu máquina local (temporal)

1. Obtén la `DATABASE_URL` de Railway (Settings → Variables)
2. Ejecuta localmente:

```bash
cd /Users/ralborta/Constanza
export DATABASE_URL="postgresql://..." # La URL de Railway
cd infra/prisma
pnpm prisma migrate deploy
```

O ejecuta las migraciones SQL directamente:

```bash
# Conectarte a la DB de Railway y ejecutar:
psql $DATABASE_URL < infra/supabase/migrations/001_initial_schemas.sql
psql $DATABASE_URL < infra/supabase/migrations/002_rls_policies.sql
```

---

## 🗄️ Opción 2: Supabase (Si ya tienes cuenta)

### Paso 1: Obtener DATABASE_URL de Supabase

1. Ve a Supabase Dashboard: https://supabase.com
2. Selecciona tu proyecto
3. Ve a **"Settings"** → **"Database"**
4. Busca **"Connection string"** → **"URI"**
5. Copia la URL (formato: `postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres`)

### Paso 2: Agregar DATABASE_URL en Railway

1. En Railway → servicio `api-gateway`
2. **"Variables"** → **"+ New Variable"**
3. Name: `DATABASE_URL`
4. Value: La URL de Supabase que copiaste
5. Guarda

### Paso 3: Aplicar Migraciones

Ejecuta las migraciones SQL en Supabase:

1. En Supabase Dashboard → **"SQL Editor"**
2. Ejecuta el contenido de: `infra/supabase/migrations/001_initial_schemas.sql`
3. Luego ejecuta: `infra/supabase/migrations/002_rls_policies.sql`

---

## ✅ Verificación

Después de configurar la DB, verifica:

1. **En Railway logs**, deberías ver:
   - ✅ Servidor iniciado sin errores
   - ❌ NO deberías ver: "Can't reach database server" o "Connection refused"

2. **Prueba el endpoint de health:**
   ```bash
   curl https://tu-api.railway.app/health
   ```

3. **Prueba crear un cliente:**
   - Debería funcionar sin "Error del servidor"
   - Debería crear el cliente en la DB

---

## 🔧 Variables Finales en Railway

Después de todo, deberías tener en Railway (`api-gateway`):

| Variable | Valor | ¿De dónde? |
|----------|-------|------------|
| `DATABASE_URL` | `postgresql://...` | Railway Postgres (automático) o Supabase (manual) |
| `ALLOWED_ORIGINS` | `https://constanza-web.vercel.app,...` | Manual (agregar) |
| `JWT_SECRET` | `WYDq2Nd9WeoMH5CseQAaDxNsnea9YkWS8DhoBZZKn74=` | Manual (agregar) |
| `SEED_SECRET` | `*******` | Ya lo tienes ✅ |
| `PORT` | `3000` | Opcional (tiene fallback) |

---

## 🚨 Si sigue dando "Error del servidor"

1. **Revisa los logs de Railway:**
   - Busca errores de conexión a la DB
   - Busca errores de Prisma

2. **Verifica que las tablas existan:**
   ```sql
   -- Conectarte a la DB y verificar:
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'core';
   ```
   Deberías ver: `tenants`, `users`, `customers`, `customer_cuits`, etc.

3. **Verifica que Prisma Client esté generado:**
   - En Railway, el build debería ejecutar: `pnpm generate`
   - Verifica en los logs del build

---

## 📝 Resumen de Pasos

1. ✅ Crear Postgres en Railway (o usar Supabase)
2. ✅ Verificar que `DATABASE_URL` esté configurada
3. ✅ Aplicar migraciones SQL (crear tablas)
4. ✅ Agregar `ALLOWED_ORIGINS` y `JWT_SECRET` en Railway
5. ✅ Configurar `NEXT_PUBLIC_API_URL` en Vercel
6. ✅ Redeploy ambos servicios
7. ✅ Probar subir archivo Excel

---

¿Necesitas ayuda con algún paso específico?

