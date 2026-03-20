-- RLS en users/tenants exige current_setting('app.tenant_id') antes de cualquier SELECT.
-- En /auth/login aún no hay JWT → no se puede setear sesión → el login no ve filas (o falla).
-- La API ya restringe por tenant_id en código; deshabilitamos RLS solo en estas tablas de catálogo.
ALTER TABLE core.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE core.tenants DISABLE ROW LEVEL SECURITY;
