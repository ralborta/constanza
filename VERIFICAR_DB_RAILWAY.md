# 🔍 Cómo Verificar si Tienes Base de Datos en Railway

## 📋 Pasos para Verificar

### 1. Verificar si Tienes PostgreSQL en Railway

1. **Ve a Railway Dashboard:** https://railway.app
2. **Abre tu proyecto** (el que tiene tus servicios)
3. **Busca en la lista de servicios:**
   - ¿Ves un servicio llamado **"Postgres"** o **"PostgreSQL"**?
   - O un servicio con ícono de base de datos 🗄️

**Si SÍ lo ves:**
- ✅ Tienes PostgreSQL configurado
- Continúa con el paso 2

**Si NO lo ves:**
- ❌ Necesitas crear PostgreSQL
- Ve a la sección "Crear PostgreSQL" más abajo

---

### 2. Verificar que DATABASE_URL Está Configurada

1. **En Railway Dashboard**, ve a tu servicio **`api-gateway`**
2. **Pestaña "Variables"**
3. **Busca `DATABASE_URL`** en:
   - **"Variables added by Railway"** (sección expandible)
   - O en **"Variables"** (si la agregaste manualmente)

**Si SÍ está:**
- ✅ `DATABASE_URL` configurada
- Debería verse algo como: `postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway`
- Continúa con el paso 3

**Si NO está:**
- ❌ Necesitas agregar `DATABASE_URL`
- Si tienes Postgres en Railway, debería aparecer automáticamente
- Si usas Supabase, agrégalo manualmente

---

### 3. Verificar que las Tablas Existen

Tienes dos opciones:

#### Opción A: Desde Railway Dashboard (Más Fácil)

1. **Ve a tu servicio PostgreSQL** en Railway
2. **Pestaña "Data"** o **"Connect"**
3. **Click en "Query"** o **"Open in TablePlus"** (si está disponible)
4. **Ejecuta esta query:**
   ```sql
   SELECT schema_name 
   FROM information_schema.schemata 
   WHERE schema_name IN ('core', 'pay', 'bindx', 'contact', 'ops', 'audit');
   ```
5. **Deberías ver 6 esquemas listados**

**Si SÍ ves los esquemas:**
- ✅ Esquemas creados
- Continúa con verificar tablas

**Si NO ves los esquemas:**
- ❌ Necesitas ejecutar las migraciones SQL
- Ve a la sección "Aplicar Migraciones" más abajo

#### Opción B: Desde tu Máquina Local

1. **Obtén la `DATABASE_URL` de Railway:**
   - Ve a tu servicio `api-gateway` → Variables
   - Copia el valor de `DATABASE_URL`

2. **Conéctate y verifica:**
   ```bash
   # Conectarte a la DB
   psql "tu_DATABASE_URL_aqui"
   
   # Ver esquemas
   \dn
   
   # Ver tablas en el esquema core
   \dt core.*
   
   # Salir
   \q
   ```

---

## 🆕 Si NO Tienes PostgreSQL en Railway

### Crear PostgreSQL en Railway

1. **En Railway Dashboard**, dentro de tu proyecto
2. **Click en "+ New"** (botón verde)
3. **Selecciona "Database"**
4. **Selecciona "Postgres"**
5. **Railway automáticamente:**
   - Crea la base de datos PostgreSQL
   - Agrega `DATABASE_URL` a todos tus servicios
   - Todo listo para usar

**Después de crear:**
- Ve al paso 3 (Verificar que las tablas existen)
- Si no hay tablas, aplica las migraciones (ver abajo)

---

## 🔧 Si Tienes PostgreSQL pero NO Tienes Tablas

### Aplicar Migraciones SQL

Tienes dos opciones:

#### Opción A: Desde Railway Dashboard (Recomendado)

1. **Ve a tu servicio PostgreSQL** en Railway
2. **Pestaña "Data"** o busca un botón **"Query"** o **"SQL Editor"**
3. **Ejecuta el contenido de estos archivos en orden:**

   **Primero:** `infra/supabase/migrations/001_initial_schemas.sql`
   - Esto crea los esquemas (core, pay, bindx, contact, ops, audit)

   **Segundo:** `infra/supabase/migrations/002_rls_policies.sql`
   - Esto crea las políticas RLS (Row Level Security)

4. **Después ejecuta las migraciones de Prisma:**
   - Ve a tu servicio `api-gateway`
   - Pestaña "Settings" → "Deploy"
   - Agrega al **"Start Command"**:
     ```bash
     cd /app && pnpm --filter @constanza/api-gateway prisma migrate deploy --schema=../../infra/prisma/schema.prisma && pnpm --filter @constanza/api-gateway start
     ```
   - O ejecuta manualmente desde local (ver Opción B)

#### Opción B: Desde tu Máquina Local

1. **Obtén la `DATABASE_URL` de Railway:**
   ```bash
   # Opción 1: Desde Railway Dashboard
   # Ve a api-gateway → Variables → Copia DATABASE_URL
   
   # Opción 2: Si tienes Railway CLI linkeado
   railway variables
   ```

2. **Aplica las migraciones SQL:**
   ```bash
   cd /Users/ralborta/Constanza
   
   # Exportar DATABASE_URL
   export DATABASE_URL="postgresql://..." # Tu URL de Railway
   
   # Aplicar migraciones SQL
   psql "$DATABASE_URL" < infra/supabase/migrations/001_initial_schemas.sql
   psql "$DATABASE_URL" < infra/supabase/migrations/002_rls_policies.sql
   ```

3. **Aplicar migraciones de Prisma:**
   ```bash
   cd infra/prisma
   pnpm prisma migrate deploy
   ```

---

## ✅ Checklist de Verificación

Marca lo que ya tienes:

- [ ] **PostgreSQL creado en Railway** (servicio visible en dashboard)
- [ ] **`DATABASE_URL` configurada** (visible en api-gateway → Variables)
- [ ] **Esquemas creados** (core, pay, bindx, contact, ops, audit)
- [ ] **Tablas creadas** (tenants, users, customers, invoices, etc.)
- [ ] **Prisma Client generado** (en los logs del build de api-gateway)
- [ ] **Migraciones aplicadas** (sin errores en logs)

---

## 🔍 Cómo Verificar desde los Logs de Railway

### Verificar Prisma Client

1. **Ve a tu servicio `api-gateway`** en Railway
2. **Pestaña "Deployments"** → Click en el último deploy
3. **Busca en los logs:**
   - ✅ Deberías ver: `Running prisma generate`
   - ✅ O: `Generated Prisma Client`
   - ❌ Si ves: `Cannot find module '@prisma/client'` → Prisma Client no generado

### Verificar Conexión a DB

1. **Ve a tu servicio `api-gateway`** en Railway
2. **Pestaña "Logs"** (logs en tiempo real)
3. **Busca:**
   - ✅ `Server listening on port 3000` → Todo bien
   - ❌ `Can't reach database server` → Problema de conexión
   - ❌ `Connection refused` → DATABASE_URL incorrecta
   - ❌ `relation "tenants" does not exist` → Tablas no creadas

---

## 🚨 Problemas Comunes

### "DATABASE_URL no encontrada"

**Solución:**
1. Si tienes Postgres en Railway, debería aparecer automáticamente
2. Si no aparece, ve a Postgres → Variables → Copia `DATABASE_URL`
3. Ve a api-gateway → Variables → "+ New Variable" → Agrega `DATABASE_URL`

### "Tablas no existen"

**Solución:**
1. Aplica las migraciones SQL (ver sección "Aplicar Migraciones" arriba)
2. Verifica que los esquemas existan: `SELECT schema_name FROM information_schema.schemata;`

### "Prisma Client no generado"

**Solución:**
1. Verifica que en el build se ejecute: `pnpm generate`
2. En Railway → api-gateway → Settings → Build
3. Verifica que el Dockerfile esté configurado correctamente

---

## 📝 Resumen Rápido

**Para verificar TODO desde Railway Dashboard:**

1. ✅ ¿Tienes servicio "Postgres"? → SÍ = Tienes DB
2. ✅ ¿Tienes `DATABASE_URL` en api-gateway → Variables? → SÍ = Configurado
3. ✅ ¿Puedes hacer queries en Postgres? → SÍ = DB funciona
4. ✅ ¿Ves tablas en los esquemas? → SÍ = Migraciones aplicadas
5. ✅ ¿Los logs de api-gateway no muestran errores de DB? → SÍ = Todo bien

---

¿Necesitas ayuda con algún paso específico?

