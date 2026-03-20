-- Monto declarado en el pago antes de imputar a facturas (conciliación / webhooks sin match).
ALTER TABLE pay.payments
  ADD COLUMN IF NOT EXISTS total_amount_cents INTEGER;

COMMENT ON COLUMN pay.payments.total_amount_cents IS
  'Centavos informados por origen externo cuando aún no hay filas en pay.payment_applications.';
