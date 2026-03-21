# Base de datos: migraciones necesarias (producción)

Si en logs ves:

`The column payments.total_amount_cents does not exist in the current database`

el **webhook ya funciona**; falta aplicar SQL en **el mismo Postgres** que usa `DATABASE_URL` (Railway → Postgres → Query).

## 1. Obligatorio para `rail-cucuru` y `api-gateway`

```sql
ALTER TABLE pay.payments
  ADD COLUMN IF NOT EXISTS total_amount_cents INTEGER;

COMMENT ON COLUMN pay.payments.total_amount_cents IS
  'Centavos informados por origen externo cuando aún no hay filas en pay.payment_applications.';
```

## 2. Recomendado (Cresium: metadata + CVU tenant)

```sql
ALTER TABLE core.tenants
  ADD COLUMN IF NOT EXISTS cresium_cvu_cobro TEXT;

ALTER TABLE pay.payments
  ADD COLUMN IF NOT EXISTS metadata JSONB;
```

Archivos equivalentes en el repo: `infra/supabase/migrations/004_*.sql` y `005_*.sql`.

Después de ejecutar el SQL, **no hace falta** redeploy: el siguiente webhook debería insertar sin 500.
