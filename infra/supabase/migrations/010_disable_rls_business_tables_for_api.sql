-- RLS + variables de sesión (set_config en la transacción Prisma) suelen fallar con
-- poolers de conexión (PgBouncer, proxies de Railway/Supabase): la query ve otro
-- backend o la sesión no aplica → errores 500 o listas vacías.
--
-- Igual que 008 para core.users / core.tenants: el aislamiento por tenant lo hace
-- la API con `where: { tenantId }` desde el JWT; desactivamos RLS en tablas que
-- consulta el api-gateway con Prisma.

ALTER TABLE core.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE core.customer_cuits DISABLE ROW LEVEL SECURITY;
ALTER TABLE core.invoices DISABLE ROW LEVEL SECURITY;

ALTER TABLE pay.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE pay.payment_applications DISABLE ROW LEVEL SECURITY;

ALTER TABLE bindx.echeqs DISABLE ROW LEVEL SECURITY;

ALTER TABLE contact.events DISABLE ROW LEVEL SECURITY;

ALTER TABLE ops.decision_items DISABLE ROW LEVEL SECURITY;
