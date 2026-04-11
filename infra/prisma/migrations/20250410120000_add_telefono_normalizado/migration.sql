-- AlterTable
ALTER TABLE "core"."customers" ADD COLUMN IF NOT EXISTS "telefono_normalizado" VARCHAR(32);

-- Backfill desde teléfono legible (solo dígitos)
UPDATE "core"."customers"
SET "telefono_normalizado" = NULLIF(regexp_replace(COALESCE("telefono", ''), '\D', '', 'g'), '');

UPDATE "core"."customers"
SET "telefono_normalizado" = NULL
WHERE "telefono_normalizado" IS NOT NULL AND "telefono_normalizado" = '';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customers_telefono_normalizado_idx" ON "core"."customers"("telefono_normalizado");
