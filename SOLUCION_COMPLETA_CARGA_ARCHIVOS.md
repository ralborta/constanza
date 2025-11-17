# 🚀 Solución Completa: Cargar Archivos de Clientes

## 🚨 Problema Identificado

No se pueden cargar archivos con datos de clientes porque:
1. El usuario administrador está mal configurado (perfil incorrecto o no existe)
2. Las tablas de la base de datos pueden no existir correctamente
3. El usuario actual no tiene permisos suficientes (requiere perfil `ADM` o `OPERADOR_1`)

## ✅ Solución Paso a Paso

### Opción 1: Solución Rápida (RECOMENDADA)

**Usa el usuario administrador que crea el seed:**

1. **Ejecuta el seed desde Railway Shell:**
   ```bash
   # Railway → api-gateway → Shell
   cd infra/prisma
   pnpm seed
   ```

2. **Inicia sesión con las credenciales del seed:**
   - Email: `admin@constanza.com`
   - Password: `admin123`

3. **Ahora deberías poder cargar archivos** ✅

### Opción 2: Corregir tu Usuario Actual

Si quieres usar tu propio usuario:

#### Paso 1: Verificar y Crear Tablas

```bash
# En Railway Shell del servicio api-gateway
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
pnpm prisma db push --accept-data-loss
```

#### Paso 2: Corregir tu Usuario

**Opción A: Si tu usuario ya existe, actualizar perfil:**

```bash
cd infra/prisma
pnpm prisma db execute --stdin <<EOF
-- Reemplaza 'tu-email@ejemplo.com' con tu email real
UPDATE core.users 
SET perfil = 'ADM', activo = true, updated_at = NOW()
WHERE email = 'tu-email@ejemplo.com';

-- Verificar
SELECT id, email, nombre, apellido, perfil, activo
FROM core.users
WHERE email = 'tu-email@ejemplo.com';
EOF
```

**Opción B: Crear nuevo usuario administrador:**

```bash
cd infra/prisma

# 1. Generar hash de contraseña (reemplaza 'mi-password' con tu contraseña)
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('mi-password', 10).then(h => console.log('Hash:', h));"

# 2. Obtener tenant_id
pnpm prisma db execute --stdin <<EOF
SELECT id, slug FROM core.tenants WHERE slug = 'demo';
EOF

# 3. Crear usuario (reemplaza los valores)
pnpm prisma db execute --stdin <<EOF
INSERT INTO core.users (
  id, tenant_id, codigo_unico, nombre, apellido, email, 
  password_hash, perfil, activo, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  t.id,
  'ADM-002',
  'Tu Nombre',
  'Tu Apellido',
  'tu-email@ejemplo.com',
  'HASH_GENERADO_EN_PASO_1',
  'ADM',
  true,
  NOW(),
  NOW()
FROM core.tenants t
WHERE t.slug = 'demo'
ON CONFLICT (tenant_id, email) 
DO UPDATE SET 
  perfil = 'ADM',
  activo = true,
  updated_at = NOW();
EOF
```

#### Paso 3: Verificar

1. Cierra sesión y vuelve a iniciar sesión con tu usuario
2. Ve a la página de Clientes
3. Intenta cargar un archivo Excel
4. Debería funcionar ahora ✅

### Opción 3: Usar el Script Automático

He creado un script que hace todo automáticamente:

```bash
# En Railway Shell
cd /app  # o donde esté el proyecto
./scripts/corregir-usuario-admin.sh
```

Este script:
- ✅ Verifica DATABASE_URL
- ✅ Crea esquemas si no existen
- ✅ Crea/actualiza todas las tablas
- ✅ Ejecuta el seed para crear usuarios
- ✅ Muestra las credenciales

## 🔍 Verificación Final

### 1. Verificar que las tablas existen:

```bash
cd infra/prisma
pnpm prisma studio
```

Deberías ver:
- `core.customers` ✅
- `core.customer_cuits` ✅
- `core.users` ✅
- `core.tenants` ✅

### 2. Verificar tu usuario:

```bash
cd infra/prisma
pnpm prisma db execute --stdin <<EOF
SELECT 
  u.email,
  u.nombre,
  u.apellido,
  u.perfil,
  u.activo,
  t.slug as tenant
FROM core.users u
JOIN core.tenants t ON u.tenant_id = t.id
WHERE u.email = 'tu-email@ejemplo.com';
EOF
```

Debe mostrar:
- `perfil = 'ADM'` ✅
- `activo = true` ✅

### 3. Probar carga de archivo:

1. Inicia sesión
2. Ve a Clientes
3. Click en "Cargar desde Excel"
4. Selecciona un archivo Excel con formato:
   - Columnas: Código Único, Razón Social, Email (requeridas)
   - Opcionales: Teléfono, CUIT, Código Venta
5. Debería cargar correctamente ✅

## 📋 Formato del Archivo Excel

El archivo Excel debe tener estas columnas en la primera fila:

| Código Único | Razón Social | Email | Teléfono | CUIT | Código Venta |
|-------------|--------------|-------|----------|------|--------------|
| CLI-001 | Acme Inc | acme@example.com | +5491123456789 | 20123456789 | 000 |

**Nota:** Los nombres de columnas son flexibles (acepta mayúsculas/minúsculas, con/sin acentos).

## ⚠️ Errores Comunes

### Error: "No se envió ningún archivo"
- Verifica que el archivo sea `.xlsx` o `.xls`
- Verifica que el tamaño sea menor a 10MB

### Error: "Error de conexión a la base de datos"
- Verifica que `DATABASE_URL` esté configurada en Railway
- Verifica que las tablas existan (usar Prisma Studio)

### Error: 401 o 403
- Tu usuario no tiene perfil `ADM` o `OPERADOR_1`
- Ejecuta el script de corrección de usuario

### Error: "relation does not exist"
- Las tablas no existen
- Ejecuta: `pnpm prisma db push` desde Railway Shell

## 💡 Recomendación

**La forma más rápida es usar el usuario del seed:**
- Email: `admin@constanza.com`
- Password: `admin123`

Este usuario siempre tiene perfil `ADM` y todos los permisos.

## 📞 Si Nada Funciona

1. Revisa los logs de Railway:
   - Railway → `api-gateway` → Logs
   - Busca errores específicos

2. Verifica variables de entorno:
   - Railway → `api-gateway` → Variables
   - Debe tener `DATABASE_URL` configurada

3. Ejecuta el script completo de corrección:
   ```bash
   ./scripts/corregir-usuario-admin.sh
   ```

