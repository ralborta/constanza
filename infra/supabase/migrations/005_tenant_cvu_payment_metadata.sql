ALTER TABLE core.tenants
  ADD COLUMN IF NOT EXISTS cresium_cvu_cobro TEXT;

COMMENT ON COLUMN core.tenants.cresium_cvu_cobro IS
  'CVU de cuenta de cobro de la empresa en Cresium (validación opcional en webhook).';

ALTER TABLE pay.payments
  ADD COLUMN IF NOT EXISTS metadata JSONB;

COMMENT ON COLUMN pay.payments.metadata IS
  'Snapshot depósito Cresium: payload, extractedTaxIds, CVUs, etc.';
