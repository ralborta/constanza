# 🔍 Cómo Verificar las Tablas en Railway

## ⚠️ Importante

**Railway Dashboard → Postgres → Database → Data SOLO muestra tablas del esquema `public`.**

Tus tablas están en otros esquemas (core, pay, bindx, contact, ops, audit), por eso no las ves ahí.

## ✅ Cómo Verificar que las Tablas Existen

### Opción 1: Prisma Studio (Más Fácil)

1. **Railway Dashboard → `@constanza/api-gateway` → Shell**
2. **Ejecuta:**
   ```bash
   cd infra/prisma
   pnpm prisma studio
   ```
3. **Esto abrirá Prisma Studio en tu navegador**
4. **Verás TODAS las tablas de TODOS los esquemas**

### Opción 2: Query SQL desde Railway

1. **Railway Dashboard → Postgres**
2. **Busca "Query Editor" o "SQL Editor"** (puede estar en "Database" → "Data" o en otra pestaña)
3. **Ejecuta este query:**
   ```sql
   SELECT table_schema, table_name 
   FROM information_schema.tables 
   WHERE table_schema IN ('core', 'pay', 'bindx', 'contact', 'ops', 'audit')
   ORDER BY table_schema, table_name;
   ```
4. **Esto mostrará todas las tablas en los esquemas**

### Opción 3: Desde Railway Shell

1. **Railway Dashboard → `@constanza/api-gateway` → Shell**
2. **Ejecuta:**
   ```bash
   cd infra/prisma
   pnpm prisma db execute --stdin <<EOF
   SELECT table_schema, COUNT(*) as tablas
   FROM information_schema.tables 
   WHERE table_schema IN ('core', 'pay', 'bindx', 'contact', 'ops', 'audit')
   GROUP BY table_schema;
   EOF
   ```

## 📋 Tablas que Deberían Estar

**Esquema `core` (8 tablas):**
- tenants
- users
- customers
- customer_cuits
- invoices
- promises
- policy_rules
- asociados

**Esquema `pay` (2 tablas):**
- payments
- payment_applications

**Esquema `bindx` (1 tabla):**
- echeqs

**Esquema `contact` (4 tablas):**
- sequences
- runs
- events
- batch_jobs

**Esquema `ops` (1 tabla):**
- decision_items

**Total: 16 tablas**

## 🚨 Si Realmente No Hay Tablas

Si después de verificar con Prisma Studio o SQL queries no ves las tablas:

1. **Railway Dashboard → `@constanza/api-gateway` → Shell**
2. **Ejecuta:**
   ```bash
   cd infra/prisma
   pnpm prisma db push --force-reset --accept-data-loss
   ```
3. **Verifica con Prisma Studio:**
   ```bash
   pnpm prisma studio
   ```

---

**La forma más fácil de verificar: Usa Prisma Studio desde Railway Shell**



