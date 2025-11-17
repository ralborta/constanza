# 🔍 Por Qué No Ves las Tablas en Railway Dashboard

## ⚠️ Problema

Railway Dashboard → Postgres → Database → **Data** muestra "You have no tables".

## ✅ Explicación

**Railway Dashboard solo muestra tablas del esquema `public` por defecto.**

Tus tablas están en otros esquemas:
- `core` (tenants, users, customers, invoices, etc.)
- `pay` (payments, payment_applications)
- `bindx` (echeqs)
- `contact` (sequences, runs, events, batch_jobs)
- `ops` (decision_items)

Por eso Railway Dashboard dice "no tables" - está buscando en `public`, pero tus tablas están en `core`, `pay`, etc.

## ✅ Cómo Verificar que las Tablas SÍ Existen

### Opción 1: Query SQL desde Railway (RECOMENDADO)

1. Railway Dashboard → Postgres service
2. Pestaña **"Database"** → **"Data"** (o busca "Query Editor")
3. Ejecuta este query:

```sql
SELECT 
  schemaname as schema,
  tablename as tabla
FROM pg_tables 
WHERE schemaname IN ('core', 'pay', 'bindx', 'contact', 'ops', 'audit')
ORDER BY schemaname, tablename;
```

Esto te mostrará **TODAS** las tablas en los esquemas correctos.

### Opción 2: Contar Tablas por Esquema

```sql
SELECT 
  schemaname as schema,
  COUNT(*) as cantidad_tablas
FROM pg_tables 
WHERE schemaname IN ('core', 'pay', 'bindx', 'contact', 'ops', 'audit')
GROUP BY schemaname
ORDER BY schemaname;
```

Deberías ver algo como:
```
schema  | cantidad_tablas
--------|----------------
core    | 8
pay     | 2
bindx   | 1
contact | 4
ops     | 1
```

### Opción 3: Ver Tablas del Esquema `core`

```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'core'
ORDER BY tablename;
```

Deberías ver:
- tenants
- users
- customers
- customer_cuits
- invoices
- promises
- policy_rules
- asociados

### Opción 4: Prisma Studio (Desde tu Máquina)

```bash
cd infra/prisma
pnpm prisma studio
```

Esto abre Prisma Studio en tu navegador y muestra **TODAS** las tablas de **TODOS** los esquemas.

## 🚨 NO Necesitas Deploy

**Las tablas YA están creadas en Postgres.**

No necesitas hacer deploy porque:
1. `prisma db push` se conecta **directamente** a Postgres
2. Crea las tablas **inmediatamente** en la base de datos
3. No depende de Railway deploy ni de GitHub

## 🔍 Verificación Rápida

Ejecuta esto desde Railway Query Editor:

```sql
-- Verificar que existen usuarios (del seed)
SELECT email, nombre, apellido, perfil 
FROM core.users;
```

Deberías ver:
- admin@constanza.com
- operador1@constanza.com

Si ves estos usuarios, **las tablas están creadas y funcionando**.

## 📋 Resumen

- ✅ Las tablas **SÍ existen** en Postgres
- ❌ Railway Dashboard **NO las muestra** porque busca en `public`
- ✅ Usa **Query SQL** o **Prisma Studio** para verlas
- ✅ **NO necesitas deploy** - ya están creadas

## 🎯 Próximo Paso

Ejecuta el query SQL en Railway para confirmar que las tablas existen. Si ves las tablas listadas, todo está bien y puedes usar la app.

