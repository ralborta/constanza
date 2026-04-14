-- Políticas RLS para core.customer_cuits (alineadas con core.customers).
-- Si la tabla tenía RLS sin políticas, o Prisma no podía leer la relación, el listado fallaba.

ALTER TABLE core.customer_cuits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_cuits_employees ON core.customer_cuits;
DROP POLICY IF EXISTS customer_cuits_self ON core.customer_cuits;

CREATE POLICY customer_cuits_employees ON core.customer_cuits
  FOR ALL
  USING (
    tenant_id = (current_setting('app.tenant_id', true))::uuid
    AND (current_setting('app.perfil', true))::text IN ('ADM', 'OPERADOR_1', 'OPERADOR_2')
  );

CREATE POLICY customer_cuits_self ON core.customer_cuits
  FOR SELECT
  USING (
    tenant_id = (current_setting('app.tenant_id', true))::uuid
    AND (current_setting('app.perfil', true))::text = 'CLIENTE'
    AND customer_id = (current_setting('app.customer_id', true))::uuid
  );
