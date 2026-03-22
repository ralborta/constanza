-- =============================================================================
-- Prueba Cresium: alinear tenant del usuario con el de los depósitos
-- =============================================================================
-- La app lista pagos donde pay.payments.tenant_id = JWT.tenant_id (sesión).
-- rail-cucuru inserta con tenant = CRESIUM_TENANT_ID (variable Railway).
--
-- Opción A (recomendada): NO tocar usuarios. En Railway (rail-cucuru) poné:
--   CRESIUM_TENANT_ID = <mismo UUID que devuelve GET /auth/me en tu sesión>
-- Luego redeploy. Nuevos webhooks quedarán alineados.
--
-- Opción B: Ya tenés depósitos en pay.payments con tenant X y querés verlos
-- con tu usuario actual (tenant Y). Mové las filas de pago a Y:
--
--   UPDATE pay.payments
--   SET tenant_id = 'YYYYYYYY-YYYY-YYYY-YYYY-YYYYYYYYYYYY'::uuid
--   WHERE source_system = 'CRESIUM'
--     AND tenant_id = 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'::uuid;
--
-- (Reemplazá Y por el tenant de /auth/me y X por el tenant viejo de las filas.)
--
-- Opción C (solo si sabés lo que hacés): mover el usuario a otro tenant rompe
-- unicidad (tenant_id, email) y FKs; mejor usar A o B.

-- Ver últimos CRESIUM y su tenant_id:
SELECT id, tenant_id, method, source_system, external_ref, created_at
FROM pay.payments
WHERE source_system = 'CRESIUM'
ORDER BY created_at DESC
LIMIT 10;
