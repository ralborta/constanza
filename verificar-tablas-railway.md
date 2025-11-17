# 🔍 Verificación: Tablas en Railway DB

## ✅ Estado Actual

Las tablas **SÍ existen** en la base de datos de Railway:

### Tablas por Esquema:

- **core**: 8 tablas
  - tenants
  - users
  - customers
  - customer_cuits
  - invoices
  - promises
  - policy_rules
  - asociados

- **pay**: 2 tablas
  - payments
  - payment_applications

- **bindx**: 1 tabla
  - echeqs

- **contact**: 4 tablas
  - sequences
  - runs
  - events
  - batch_jobs

- **ops**: 1 tabla
  - decision_items

**Total: 16 tablas** ✅

---

## 🔧 Si api-gateway no ve las tablas

### Posibles causas:

1. **DATABASE_URL incorrecta en Railway**
   - Verifica que en Railway → api-gateway → Variables
   - La DATABASE_URL sea exactamente:
     ```
     postgresql://postgres:CIcAzTslXvtZkhMeumvOFPOPHzLNYpXf@nozomi.proxy.rlwy.net:57027/railway
     ```

2. **Prisma Client no generado en Railway**
   - En Railway, el build debe ejecutar: `pnpm prisma generate`
   - Verifica los logs del build de api-gateway

3. **Problema de conexión desde Railway**
   - Verifica los logs de api-gateway en Railway
   - Busca errores como "Can't reach database server"

4. **Esquemas no visibles**
   - Prisma necesita que los esquemas estén en el `search_path`
   - Verifica que el schema.prisma tenga los esquemas correctos

---

## ✅ Solución: Verificar desde Railway

1. **Ve a Railway Dashboard**
2. **Abre tu servicio api-gateway**
3. **Pestaña "Logs"**
4. **Busca errores relacionados con:**
   - "relation does not exist"
   - "schema does not exist"
   - "Can't reach database server"

5. **Verifica Variables:**
   - Railway → api-gateway → Variables
   - Debe tener `DATABASE_URL` con el valor correcto

---

## 🔧 Si necesitas regenerar Prisma Client en Railway

El build de Railway debería ejecutar automáticamente:
```bash
pnpm --filter @constanza/api-gateway prisma generate --schema=../../infra/prisma/schema.prisma
```

Si no lo hace, verifica el Dockerfile o el build command en Railway.

---

## 📋 Comandos para verificar localmente

```bash
# Verificar tablas
psql "postgresql://postgres:CIcAzTslXvtZkhMeumvOFPOPHzLNYpXf@nozomi.proxy.rlwy.net:57027/railway" -c "\dt core.*"

# Verificar esquemas
psql "postgresql://postgres:CIcAzTslXvtZkhMeumvOFPOPHzLNYpXf@nozomi.proxy.rlwy.net:57027/railway" -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('core', 'pay', 'bindx', 'contact', 'ops', 'audit');"

# Probar conexión desde Prisma
cd infra/prisma
pnpm prisma db pull
```

---

¿Qué error específico ves en los logs de Railway?

