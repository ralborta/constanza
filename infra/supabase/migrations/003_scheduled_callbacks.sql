-- Cronograma de callbacks generados desde resúmenes de llamadas (IA)
-- Schema: contact
CREATE TABLE IF NOT EXISTS contact.scheduled_callbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES core.invoices(id) ON DELETE SET NULL,
  source_contact_event_id UUID REFERENCES contact.events(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_callbacks_tenant_status ON contact.scheduled_callbacks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_callbacks_scheduled_at ON contact.scheduled_callbacks(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_callbacks_customer_id ON contact.scheduled_callbacks(customer_id);

COMMENT ON TABLE contact.scheduled_callbacks IS 'Callbacks y seguimientos extraídos del resumen de llamadas (IA). Cronograma de llamadas.';
