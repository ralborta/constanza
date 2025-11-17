# 🔧 Crear Tablas con SQL Directo

## ⚠️ Problema

Railway Dashboard muestra "You have no tables" y Prisma dice que está sincronizado, pero las tablas no aparecen.

## ✅ Solución: Crear Tablas desde Railway Dashboard

### Opción 1: Usar Prisma Studio (Más Fácil)

1. **Railway Dashboard → `@constanza/api-gateway` → Shell**
2. **Ejecuta:**
   ```bash
   cd infra/prisma
   pnpm prisma studio
   ```
3. **Esto abrirá Prisma Studio** donde podrás ver y crear las tablas

### Opción 2: Crear Tablas con SQL Directo

1. **Railway Dashboard → Postgres → Database**
2. **Busca "Query Editor" o "SQL Editor"** (puede estar en la pestaña "Data" o "Database")
3. **Ejecuta el contenido de:** `infra/supabase/migrations/001_initial_schemas.sql`
   - Esto crea los esquemas

4. **Luego ejecuta Prisma db push desde Shell:**
   ```bash
   cd infra/prisma
   pnpm prisma db push --force-reset
   ```

### Opción 3: Desde Railway Shell del api-gateway

1. **Railway Dashboard → `@constanza/api-gateway` → Shell**
2. **Ejecuta:**
   ```bash
   cd infra/prisma
   
   # Crear esquemas
   pnpm prisma db execute --stdin <<EOF
   CREATE SCHEMA IF NOT EXISTS core;
   CREATE SCHEMA IF NOT EXISTS pay;
   CREATE SCHEMA IF NOT EXISTS bindx;
   CREATE SCHEMA IF NOT EXISTS contact;
   CREATE SCHEMA IF NOT EXISTS ops;
   CREATE SCHEMA IF NOT EXISTS audit;
   EOF
   
   # Crear tablas
   pnpm prisma db push --force-reset --accept-data-loss
   ```

## 🔍 Verificación

Después de crear las tablas, verifica con:

```bash
cd infra/prisma
pnpm prisma studio
```

O desde Railway Dashboard → Postgres → Query Editor:

```sql
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema IN ('core', 'pay', 'bindx', 'contact', 'ops', 'audit')
ORDER BY table_schema, table_name;
```

## 💡 Por Qué Railway Dashboard Muestra "You have no tables"

Railway Dashboard → Postgres → Database → Data **solo muestra tablas del esquema `public`**.

Tus tablas están en otros esquemas (core, pay, bindx, etc.), por eso no las ves ahí.

Para verlas:
- Usa Prisma Studio
- O usa el Query Editor de Railway
- O conecta con psql directamente

---

¿Quieres que te guíe para crear las tablas desde Railway Shell?



