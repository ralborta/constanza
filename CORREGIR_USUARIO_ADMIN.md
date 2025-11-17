# 🔧 Corregir Usuario Administrador y Base de Datos

## 🚨 Problema

El usuario administrador está "falso" o mal configurado, las tablas pueden no existir correctamente, y no se pueden cargar archivos.

## ✅ Solución Completa

### Paso 1: Verificar y Crear Tablas

**En Railway Shell del servicio `api-gateway`:**

```bash
cd infra/prisma

# 1. Verificar que DATABASE_URL esté configurada
echo $DATABASE_URL

# 2. Crear esquemas si no existen
pnpm prisma db execute --stdin <<EOF
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS pay;
CREATE SCHEMA IF NOT EXISTS bindx;
CREATE SCHEMA IF NOT EXISTS contact;
CREATE SCHEMA IF NOT EXISTS ops;
CREATE SCHEMA IF NOT EXISTS audit;
EOF

# 3. Crear todas las tablas
pnpm prisma db push --force-reset --accept-data-loss

# 4. Verificar que se crearon
pnpm prisma db execute --stdin <<EOF
SELECT table_schema, COUNT(*) as tablas
FROM information_schema.tables 
WHERE table_schema IN ('core', 'pay', 'bindx', 'contact', 'ops', 'audit')
GROUP BY table_schema;
EOF
```

### Paso 2: Ejecutar Seed para Crear Usuarios Correctos

**Opción A: Usando el endpoint de seed (si está disponible):**

```bash
curl -X POST https://api-gateway-production.up.railway.app/seed \
  -H "Content-Type: application/json" \
  -H "x-seed-secret: constanza-seed-2025"
```

**Opción B: Desde Railway Shell:**

```bash
cd infra/prisma
pnpm seed
```

Esto creará:
- Tenant "demo"
- Usuario admin: `admin@constanza.com` / `admin123` (perfil: ADM)
- Usuario operador: `operador1@constanza.com` / `operador123` (perfil: OPERADOR_1)
- Cliente: `cliente@acme.com` / `cliente123`

### Paso 3: Corregir Usuario Actual (si ya existe)

Si tu usuario actual existe pero tiene el perfil incorrecto, ejecuta esto:

**En Railway Shell:**

```bash
cd infra/prisma
pnpm prisma db execute --stdin <<EOF
-- Reemplaza 'tu-email@ejemplo.com' con tu email real
UPDATE core.users 
SET perfil = 'ADM', activo = true
WHERE email = 'tu-email@ejemplo.com';

-- Verificar que se actualizó
SELECT id, email, nombre, apellido, perfil, activo, tenant_id
FROM core.users
WHERE email = 'tu-email@ejemplo.com';
EOF
```

### Paso 4: Crear o Corregir tu Usuario Específico

Si necesitas crear tu propio usuario administrador:

**En Railway Shell:**

```bash
cd infra/prisma
pnpm prisma db execute --stdin <<EOF
-- 1. Obtener el tenant_id (asumiendo que es 'demo')
SELECT id, slug FROM core.tenants WHERE slug = 'demo';

-- 2. Crear o actualizar tu usuario (reemplaza los valores)
-- Primero necesitas el tenant_id del paso anterior
INSERT INTO core.users (
  id, tenant_id, codigo_unico, nombre, apellido, email, 
  password_hash, perfil, activo, created_at, updated_at
)
VALUES (
  gen_random_uuid(),
  'TENANT_ID_AQUI',  -- Reemplaza con el ID del tenant
  'ADM-002',
  'Tu Nombre',
  'Tu Apellido',
  'tu-email@ejemplo.com',
  '$2a$10$TuHashAqui',  -- Necesitas generar el hash de bcrypt
  'ADM',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (tenant_id, email) 
DO UPDATE SET 
  perfil = 'ADM',
  activo = true,
  updated_at = NOW();
EOF
```

**O mejor, usa el script de seed que genera el hash correctamente:**

```bash
cd infra/prisma
node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('tu-password', 10).then(hash => {
  console.log('Hash:', hash);
});
"
```

### Paso 5: Verificar que Todo Esté Correcto

**Verificar tablas:**
```bash
cd infra/prisma
pnpm prisma studio
```

**Verificar usuarios:**
```bash
cd infra/prisma
pnpm prisma db execute --stdin <<EOF
SELECT 
  u.id,
  u.email,
  u.nombre,
  u.apellido,
  u.perfil,
  u.activo,
  t.slug as tenant_slug
FROM core.users u
JOIN core.tenants t ON u.tenant_id = t.id
ORDER BY u.created_at DESC;
EOF
```

## 🎯 Solución Rápida: Usar el Usuario del Seed

La forma más rápida es usar el usuario que crea el seed:

1. **Ejecuta el seed** (Paso 2)
2. **Inicia sesión con:**
   - Email: `admin@constanza.com`
   - Password: `admin123`
3. **Ahora deberías poder cargar archivos** porque este usuario tiene perfil `ADM`

## 🔍 Verificar que Funciona

1. Inicia sesión con `admin@constanza.com` / `admin123`
2. Ve a la página de Clientes
3. Intenta cargar un archivo Excel
4. Debería funcionar ahora

## ⚠️ Si Aún No Funciona

1. **Verifica los logs de Railway:**
   - Railway → `api-gateway` → Logs
   - Busca errores relacionados con:
     - "relation does not exist"
     - "schema does not exist"
     - "permission denied"

2. **Verifica que DATABASE_URL esté correcta:**
   - Railway → `api-gateway` → Variables
   - Debe tener `DATABASE_URL` con la URL correcta de PostgreSQL

3. **Verifica que las tablas existan:**
   ```bash
   cd infra/prisma
   pnpm prisma studio
   ```
   Deberías ver las tablas `customers` y `customer_cuits` en el esquema `core`

## 📝 Notas

- El seed es **idempotente**: puedes ejecutarlo múltiples veces sin problemas
- Si el usuario ya existe, el seed solo actualiza la contraseña
- El perfil `ADM` tiene todos los permisos, incluyendo cargar archivos
- El perfil `OPERADOR_1` también puede cargar archivos

