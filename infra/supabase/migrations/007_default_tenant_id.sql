-- El login de desarrollo y rutas legacy pueden usar tenant_id fijo 00000000-0000-0000-0000-000000000001.
-- Si no existe fila en core.tenants, los INSERT (customers, etc.) fallan por FK.
INSERT INTO core.tenants (id, name, slug, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Tenant por defecto',
  'constanza-default',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
