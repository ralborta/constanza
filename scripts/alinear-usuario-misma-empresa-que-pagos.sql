-- =============================================================================
-- Alinear TU usuario (backoffice) con la MISMA empresa (tenant) que los pagos
-- =============================================================================
-- Contexto:
-- - NO hace falta crear un "cliente Revolucia" en core.customers para ver transferencias.
--   Los "clientes" son quienes DEBEN; la empresa que cobra (Revolucia) es el TENANT.
-- - Los pagos Cresium viven en pay.payments con un tenant_id = empresa cobradora.
-- - Tu login usa core.users.tenant_id; la API solo muestra pagos de ESE tenant.
--
-- Quien tenga acceso a Postgres (Railway / Supabase SQL) debe ejecutar esto.
-- Reemplazá los placeholders antes de correr el UPDATE.
--
-- PASO 1 — Ver empresas (tenants)
-- =============================================================================
SELECT id, name, slug FROM core.tenants ORDER BY name;

-- PASO 2 — Ver de qué tenant son los últimos pagos Cresium (objetivo habitual)
-- =============================================================================
SELECT tenant_id, COUNT(*) AS cantidad
FROM pay.payments
WHERE source_system = 'CRESIUM'
GROUP BY tenant_id
ORDER BY cantidad DESC;

-- PASO 3 — Ver tu usuario actual
-- =============================================================================
-- Reemplazá el email:
SELECT id, email, tenant_id, codigo_unico, perfil
FROM core.users
WHERE email = 'TU_EMAIL@EJEMPLO.COM';

-- PASO 4 — UPDATE (solo si el PASO 2 y 3 tienen sentido)
-- =============================================================================
-- Reemplazá:
--   @TENANT_DESTINO = UUID donde ya están los pagos Cresium (o el de Revolucia en core.tenants)
--   @TU_EMAIL = tu mail de login
--
-- ⚠️ Antes: no puede existir OTRO usuario con el mismo email en el tenant destino
--    (unique tenant_id + email). Si existe, hay que resolver a mano (borrar duplicado o otro mail).
--
-- BEGIN;
-- UPDATE core.users
-- SET tenant_id = 'TENANT_DESTINO_UUID_AQUI'::uuid,
--     updated_at = NOW()
-- WHERE email = 'TU_EMAIL@EJEMPLO.COM';
-- COMMIT;
--
-- Después: cerrar sesión en la web y volver a loguearte para que el JWT traiga el tenant nuevo.
