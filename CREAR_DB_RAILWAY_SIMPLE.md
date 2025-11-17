# 🚀 Crear Base de Datos PostgreSQL en Railway - Guía Simple

## 📋 Resumen

Vamos a crear PostgreSQL en Railway y configurarlo con Prisma. **Solo Prisma, sin Supabase** para evitar confusiones.

---

## ✅ Paso 1: Crear PostgreSQL en Railway

1. **Ve a Railway Dashboard:** https://railway.app
2. **Abre tu proyecto** (el que tiene tus servicios como `api-gateway`, `notifier`, etc.)
3. **Click en el botón verde "+ New"** (arriba a la derecha)
4. **Selecciona "Database"**
5. **Selecciona "Postgres"**

**¡Listo!** Railway automáticamente:
- ✅ Crea la base de datos PostgreSQL
- ✅ Agrega `DATABASE_URL` a TODOS tus servicios
- ✅ Todo configurado automáticamente

**Tiempo estimado:** 1-2 minutos

---

## ✅ Paso 2: Verificar que DATABASE_URL se Agregó

1. **Ve a tu servicio `api-gateway`** en Railway
2. **Pestaña "Variables"**
3. **Expande "Variables added by Railway"** (sección desplegable)
4. **Deberías ver `DATABASE_URL`** con un valor como:
   ```
   postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
   ```

**Si la ves:** ✅ Perfecto, continúa al Paso 3

**Si NO la ves:**
- Espera 30 segundos y recarga la página
- O ve a tu servicio Postgres → Variables → Copia `DATABASE_URL`
- Luego ve a `api-gateway` → Variables → "+ New Variable" → Agrega `DATABASE_URL`

---

## ✅ Paso 3: Crear los Esquemas en la Base de Datos

Necesitas crear los esquemas (core, pay, bindx, contact, ops, audit) en PostgreSQL.

### Opción A: Desde Railway Dashboard (Más Fácil)

1. **Ve a tu servicio PostgreSQL** en Railway
2. **Pestaña "Data"** o busca botón **"Query"** o **"Connect"**
3. **Si ves un editor SQL o botón "Query":**
   - Abre el archivo: `infra/supabase/migrations/001_initial_schemas.sql`
   - Copia TODO su contenido
   - Pégalo en el editor SQL de Railway
   - Ejecuta (botón "Run" o "Execute")

4. **Verifica que se crearon:**
   ```sql
   SELECT schema_name 
   FROM information_schema.schemata 
   WHERE schema_name IN ('core', 'pay', 'bindx', 'contact', 'ops', 'audit');
   ```
   Deberías ver 6 esquemas listados.

### Opción B: Desde tu Máquina Local

1. **Obtén la DATABASE_URL de Railway:**
   - Ve a `api-gateway` → Variables → Copia `DATABASE_URL`

2. **Ejecuta el script SQL:**
   ```bash
   cd /Users/ralborta/Constanza
   
   # Exportar DATABASE_URL (reemplaza con tu URL real)
   export DATABASE_URL="postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway"
   
   # Aplicar migración SQL
   psql "$DATABASE_URL" < infra/supabase/migrations/001_initial_schemas.sql
   ```

**Si no tienes `psql` instalado:**
```bash
# macOS
brew install postgresql

# O usa la Opción A (desde Railway Dashboard)
```

---

## ✅ Paso 4: Aplicar Migraciones de Prisma

Ahora necesitas crear las tablas usando Prisma.

### Opción A: Desde Railway (Recomendado para Producción)

1. **Ve a tu servicio `api-gateway`** en Railway
2. **Pestaña "Settings"** → **"Deploy"**
3. **Busca "Start Command"** o **"Deploy Command"**
4. **Agrega esto ANTES del comando start:**
   ```bash
   cd /app && pnpm --filter @constanza/api-gateway prisma generate --schema=../../infra/prisma/schema.prisma && pnpm --filter @constanza/api-gateway prisma migrate deploy --schema=../../infra/prisma/schema.prisma && pnpm --filter @constanza/api-gateway start
   ```

5. **Guarda y redeploy** (Railway redeployeará automáticamente)

### Opción B: Desde tu Máquina Local (Más Rápido)

1. **Obtén la DATABASE_URL de Railway:**
   ```bash
   # Opción 1: Desde Railway Dashboard
   # Ve a api-gateway → Variables → Copia DATABASE_URL
   
   # Opción 2: Si tienes Railway CLI linkeado
   railway variables | grep DATABASE_URL
   ```

2. **Configura y aplica migraciones:**
   ```bash
   cd /Users/ralborta/Constanza
   
   # Exportar DATABASE_URL
   export DATABASE_URL="postgresql://..." # Tu URL de Railway
   
   # Ir a la carpeta de Prisma
   cd infra/prisma
   
   # Generar Prisma Client
   pnpm prisma generate
   
   # Aplicar migraciones (crear tablas)
   pnpm prisma migrate deploy
   ```

**Si es la primera vez, usa `migrate dev` en lugar de `migrate deploy`:**
```bash
pnpm prisma migrate dev --name init
```

---

## ✅ Paso 5: Verificar que Todo Funciona

### Verificar desde Railway Logs

1. **Ve a tu servicio `api-gateway`** en Railway
2. **Pestaña "Logs"**
3. **Busca:**
   - ✅ `Server listening on port 3000` → Todo bien
   - ❌ `Can't reach database server` → Problema de conexión
   - ❌ `relation "tenants" does not exist` → Tablas no creadas

### Verificar desde Prisma Studio (Local)

```bash
cd /Users/ralborta/Constanza
export DATABASE_URL="postgresql://..." # Tu URL de Railway
cd infra/prisma
pnpm prisma studio
```

Esto abrirá Prisma Studio en tu navegador donde podrás ver todas las tablas.

### Verificar con Query SQL

```bash
# Conectarte a la DB
psql "tu_DATABASE_URL_aqui"

# Ver tablas en esquema core
\dt core.*

# Deberías ver: tenants, users, customers, invoices, etc.
```

---

## 📋 Checklist Final

Marca cuando completes cada paso:

- [ ] **PostgreSQL creado en Railway** (servicio visible)
- [ ] **`DATABASE_URL` visible en api-gateway → Variables**
- [ ] **Esquemas creados** (core, pay, bindx, contact, ops, audit)
- [ ] **Migraciones de Prisma aplicadas** (tablas creadas)
- [ ] **Logs de api-gateway sin errores de DB**
- [ ] **Prisma Studio muestra las tablas** (opcional, para verificar)

---

## 🚨 Problemas Comunes

### "DATABASE_URL no aparece"

**Solución:**
1. Espera 1-2 minutos después de crear Postgres
2. Recarga la página
3. Si sigue sin aparecer, cópiala manualmente desde Postgres → Variables

### "Error: relation does not exist"

**Solución:**
1. Verifica que los esquemas existan (Paso 3)
2. Aplica migraciones de Prisma (Paso 4)
3. Verifica en Prisma Studio que las tablas existan

### "Can't reach database server"

**Solución:**
1. Verifica que `DATABASE_URL` sea correcta
2. Verifica que Postgres esté corriendo en Railway
3. Verifica que no haya problemas de red

---

## 🎯 Resumen de Comandos Esenciales

```bash
# 1. Obtener DATABASE_URL de Railway
# (Desde Railway Dashboard → api-gateway → Variables)

# 2. Configurar localmente
export DATABASE_URL="postgresql://..."

# 3. Crear esquemas
psql "$DATABASE_URL" < infra/supabase/migrations/001_initial_schemas.sql

# 4. Aplicar migraciones Prisma
cd infra/prisma
pnpm prisma generate
pnpm prisma migrate deploy

# 5. Verificar (opcional)
pnpm prisma studio
```

---

## ✅ ¡Listo!

Una vez completados estos pasos:
- ✅ Tendrás PostgreSQL funcionando en Railway
- ✅ Tendrás todas las tablas creadas con Prisma
- ✅ Tu `api-gateway` podrá conectarse a la base de datos
- ✅ Todo funcionando sin confusiones con Supabase

**Siguiente paso:** Ejecutar el seed de datos (si lo necesitas)

---

¿Necesitas ayuda con algún paso específico?

