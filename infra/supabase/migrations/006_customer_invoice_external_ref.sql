-- Referencia estable en sistemas externos (ERP / facturación) para sincronización / upsert.
ALTER TABLE core.customers
  ADD COLUMN IF NOT EXISTS external_ref TEXT;

ALTER TABLE core.invoices
  ADD COLUMN IF NOT EXISTS external_ref TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS customers_tenant_external_ref_key
  ON core.customers (tenant_id, external_ref)
  WHERE external_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_tenant_external_ref_key
  ON core.invoices (tenant_id, external_ref)
  WHERE external_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_tenant_external_ref ON core.customers (tenant_id, external_ref);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_external_ref ON core.invoices (tenant_id, external_ref);
