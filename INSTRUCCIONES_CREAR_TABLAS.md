# 🚨 INSTRUCCIONES: Crear Tablas en Railway

## ⚠️ Problema Actual

Railway Dashboard muestra "You have no tables" - las tablas NO están creadas.

## ✅ Solución: Crear Tablas desde Railway Shell

### Paso 1: Abrir Shell en Railway

1. **Ve a Railway Dashboard**
2. **Abre el servicio `@constanza/api-gateway`**
3. **Busca botón "Shell" o "Console"** (puede estar en Settings o en la parte superior)
4. **Click para abrir el shell**

### Paso 2: Ejecutar Comandos

Una vez en el shell, ejecuta estos comandos **uno por uno**:

```bash
# 1. Ir a la carpeta de Prisma
cd infra/prisma

# 2. Verificar que DATABASE_URL esté configurada
cat .env

# 3. Crear los esquemas primero
pnpm prisma db execute --stdin <<EOF
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS pay;
CREATE SCHEMA IF NOT EXISTS bindx;
CREATE SCHEMA IF NOT EXISTS contact;
CREATE SCHEMA IF NOT EXISTS ops;
CREATE SCHEMA IF NOT EXISTS audit;
EOF

# 4. Forzar creación de todas las tablas
pnpm prisma db push --force-reset --accept-data-loss

# 5. Verificar que se crearon
pnpm prisma db execute --stdin <<EOF
SELECT table_schema, COUNT(*) as tablas 
FROM information_schema.tables 
WHERE table_schema IN ('core', 'pay', 'bindx', 'contact', 'ops', 'audit')
GROUP BY table_schema;
EOF
```

### Paso 3: Verificar Resultado

Después de ejecutar, deberías ver:
- Esquemas creados (core, pay, bindx, contact, ops, audit)
- Tablas creadas (16 tablas en total)

## 🔍 Si No Funciona

### Verificar DATABASE_URL

```bash
cd infra/prisma
echo $DATABASE_URL
```

Debe mostrar algo como:
```
postgresql://postgres:...@nozomi.proxy.rlwy.net:57027/railway
```

### Verificar Conexión

```bash
cd infra/prisma
pnpm prisma db pull
```

Si esto funciona, la conexión está bien.

## 📋 Tablas que Deberían Crearse

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

## 🆘 Si Sigue Sin Funcionar

1. **Verifica los logs del servicio api-gateway** - busca errores de Prisma
2. **Verifica que DATABASE_URL sea correcta** en Railway → Variables
3. **Intenta crear una tabla manualmente** desde Railway Dashboard para verificar conexión



