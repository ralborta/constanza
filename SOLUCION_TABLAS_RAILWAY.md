# 🔧 Solución: Tablas No Visibles en Railway Dashboard

## ⚠️ Problema

Railway Dashboard → Postgres → Database → Data solo muestra `_prisma_migrations`, pero no las otras tablas.

## 🔍 Explicación

**Railway Dashboard solo muestra tablas del esquema `public` por defecto.**

Las tablas de tu proyecto están en otros esquemas:
- `core` (tenants, users, customers, invoices, etc.)
- `pay` (payments, payment_applications)
- `bindx` (echeqs)
- `contact` (sequences, runs, events, batch_jobs)
- `ops` (decision_items)
- `audit` (si lo usas)

## ✅ Solución: Verificar desde Railway Shell

### Opción 1: Desde Railway Dashboard Shell

1. **Ve a Railway Dashboard**
2. **Abre `@constanza/api-gateway`**
3. **Busca botón "Shell" o "Console"**
4. **Ejecuta:**

```bash
cd infra/prisma
pnpm prisma db push --force-reset
```

Esto creará todas las tablas en los esquemas correctos.

### Opción 2: Verificar si las tablas existen

Desde Railway Shell, ejecuta:

```bash
cd infra/prisma
pnpm prisma db execute --stdin <<< "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN ('core', 'pay', 'bindx', 'contact', 'ops') ORDER BY table_schema, table_name;"
```

Esto te mostrará todas las tablas en los esquemas.

### Opción 3: Usar Prisma Studio (desde Railway)

```bash
cd infra/prisma
pnpm prisma studio
```

Esto abrirá Prisma Studio donde podrás ver TODAS las tablas de todos los esquemas.

## 📋 Verificación Final

Después de ejecutar `prisma db push`, deberías tener:

**Esquema `core`:**
- tenants
- users
- customers
- customer_cuits
- invoices
- promises
- policy_rules
- asociados

**Esquema `pay`:**
- payments
- payment_applications

**Esquema `bindx`:**
- echeqs

**Esquema `contact`:**
- sequences
- runs
- events
- batch_jobs

**Esquema `ops`:**
- decision_items

## 💡 Nota sobre Railway Dashboard

Railway Dashboard → Postgres → Database → Data **solo muestra el esquema `public`**.

Para ver las tablas de otros esquemas, necesitas:
- Usar Prisma Studio
- O conectarte directamente con `psql`
- O usar el query editor de Railway (si está disponible)

## 🚀 Comando Rápido

```bash
# Desde Railway Shell del servicio api-gateway
cd infra/prisma && pnpm prisma db push --force-reset
```

Esto creará todas las tablas en los esquemas correctos.







