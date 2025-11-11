-- Row Level Security Policies
-- Aplicar después de crear las tablas con Prisma

-- ============================================
-- CORE SCHEMA
-- ============================================

-- Tenants (no necesita RLS, solo lectura por admin)
ALTER TABLE core.tenants ENABLE ROW LEVEL SECURITY;

-- Users
ALTER TABLE core.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_tenant_isolation ON core.users
  FOR ALL
  USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- Customers
ALTER TABLE core.customers ENABLE ROW LEVEL SECURITY;

-- Política para empleados/operadores (ven todos los clientes del tenant)
CREATE POLICY customers_employees ON core.customers
  FOR ALL
  USING (
    tenant_id = (current_setting('app.tenant_id', true))::uuid
    AND (current_setting('app.perfil', true))::text IN ('ADM', 'OPERADOR_1', 'OPERADOR_2')
  );

-- Política para clientes (solo ven su propio registro)
CREATE POLICY customers_self ON core.customers
  FOR SELECT
  USING (
    tenant_id = (current_setting('app.tenant_id', true))::uuid
    AND (current_setting('app.perfil', true))::text = 'CLIENTE'
    AND id = (current_setting('app.customer_id', true))::uuid
  );

-- Invoices
ALTER TABLE core.invoices ENABLE ROW LEVEL SECURITY;

-- Política para empleados/operadores
CREATE POLICY invoices_employees ON core.invoices
  FOR ALL
  USING (
    tenant_id = (current_setting('app.tenant_id', true))::uuid
    AND (current_setting('app.perfil', true))::text IN ('ADM', 'OPERADOR_1', 'OPERADOR_2')
  );

-- Política para clientes (solo ven sus propias facturas)
CREATE POLICY invoices_customers ON core.invoices
  FOR SELECT
  USING (
    tenant_id = (current_setting('app.tenant_id', true))::uuid
    AND (current_setting('app.perfil', true))::text = 'CLIENTE'
    AND customer_id = (current_setting('app.customer_id', true))::uuid
  );

-- ============================================
-- PAY SCHEMA
-- ============================================

-- Payments
ALTER TABLE pay.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_employees ON pay.payments
  FOR ALL
  USING (
    tenant_id = (current_setting('app.tenant_id', true))::uuid
    AND (current_setting('app.perfil', true))::text IN ('ADM', 'OPERADOR_1', 'OPERADOR_2')
  );

-- Payment Applications
ALTER TABLE pay.payment_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_applications_employees ON pay.payment_applications
  FOR ALL
  USING (
    tenant_id = (current_setting('app.tenant_id', true))::uuid
    AND (current_setting('app.perfil', true))::text IN ('ADM', 'OPERADOR_1', 'OPERADOR_2')
  );

-- Clientes ven aplicaciones de sus facturas (a través de JOIN con invoices)
-- Se maneja a nivel de aplicación

-- ============================================
-- BINDX SCHEMA
-- ============================================

-- E-cheques
ALTER TABLE bindx.echeqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY echeqs_employees ON bindx.echeqs
  FOR ALL
  USING (
    tenant_id = (current_setting('app.tenant_id', true))::uuid
    AND (current_setting('app.perfil', true))::text IN ('ADM', 'OPERADOR_1', 'OPERADOR_2')
  );

CREATE POLICY echeqs_customers ON bindx.echeqs
  FOR SELECT
  USING (
    tenant_id = (current_setting('app.tenant_id', true))::uuid
    AND (current_setting('app.perfil', true))::text = 'CLIENTE'
    AND customer_id = (current_setting('app.customer_id', true))::uuid
  );

-- ============================================
-- CONTACT SCHEMA
-- ============================================

-- Contact Events
ALTER TABLE contact.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY contact_events_employees ON contact.events
  FOR ALL
  USING (
    tenant_id = (current_setting('app.tenant_id', true))::uuid
    AND (current_setting('app.perfil', true))::text IN ('ADM', 'OPERADOR_1', 'OPERADOR_2')
  );

CREATE POLICY contact_events_customers ON contact.events
  FOR SELECT
  USING (
    tenant_id = (current_setting('app.tenant_id', true))::uuid
    AND (current_setting('app.perfil', true))::text = 'CLIENTE'
    AND customer_id = (current_setting('app.customer_id', true))::uuid
  );

-- ============================================
-- OPS SCHEMA
-- ============================================

-- Decision Items (solo empleados)
ALTER TABLE ops.decision_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY decision_items_employees ON ops.decision_items
  FOR ALL
  USING (
    tenant_id = (current_setting('app.tenant_id', true))::uuid
    AND (current_setting('app.perfil', true))::text IN ('ADM', 'OPERADOR_1', 'OPERADOR_2')
  );

-- ============================================
-- NOTA: Las variables app.tenant_id, app.perfil, app.customer_id
-- se deben setear desde la aplicación después de validar el JWT
-- usando: SET LOCAL app.tenant_id = 'uuid';
-- ============================================

