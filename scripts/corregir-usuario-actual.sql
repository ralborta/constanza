-- Script SQL para corregir el usuario actual
-- Ejecutar desde Railway Shell: pnpm prisma db execute --stdin < scripts/corregir-usuario-actual.sql
-- O reemplazar 'tu-email@ejemplo.com' con tu email real antes de ejecutar

-- 1. Ver todos los usuarios actuales
SELECT 
  u.id,
  u.email,
  u.nombre,
  u.apellido,
  u.perfil,
  u.activo,
  u.tenant_id,
  t.slug as tenant_slug
FROM core.users u
LEFT JOIN core.tenants t ON u.tenant_id = t.id
ORDER BY u.created_at DESC;

-- 2. Verificar que existe el tenant 'demo'
SELECT id, name, slug FROM core.tenants WHERE slug = 'demo';

-- 3. Corregir usuario específico (REEMPLAZA 'tu-email@ejemplo.com' con tu email)
-- Esto actualiza el perfil a ADM y activa el usuario
UPDATE core.users 
SET 
  perfil = 'ADM',
  activo = true,
  updated_at = NOW()
WHERE email = 'tu-email@ejemplo.com'
RETURNING id, email, nombre, apellido, perfil, activo;

-- 4. Si el usuario no existe, crear uno nuevo
-- Primero necesitas el tenant_id del tenant 'demo'
-- Reemplaza 'TENANT_ID_AQUI' con el ID real del tenant
-- Reemplaza 'tu-email@ejemplo.com' con tu email
-- Reemplaza 'Tu Nombre' y 'Tu Apellido' con tus datos
-- Reemplaza 'HASH_BCRYPT_AQUI' con un hash bcrypt de tu contraseña

-- Para generar el hash bcrypt, ejecuta en Node.js:
-- node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('tu-password', 10).then(h => console.log(h));"

/*
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
  'HASH_BCRYPT_AQUI',  -- Generar con: node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('tu-password', 10).then(h => console.log(h));"
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
  updated_at = NOW()
RETURNING id, email, nombre, apellido, perfil, activo;
*/

-- 5. Verificar resultado final
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
WHERE u.email = 'tu-email@ejemplo.com';

