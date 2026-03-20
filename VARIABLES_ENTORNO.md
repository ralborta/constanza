# 🔐 Variables de Entorno - Guía Completa

## 📋 Resumen

Este documento lista todas las variables de entorno necesarias para el proyecto Constanza.

---

## 🗄️ Variables de Base de Datos

### `DATABASE_URL` (REQUERIDA)

**Descripción:** URL de conexión a la base de datos PostgreSQL.

**Formato:**
```
postgresql://usuario:password@host:puerto/nombre_db
```

**Ejemplos:**

**Railway:**
```
postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
```

**Supabase:**
```
postgresql://postgres:[TU_PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

**Local (Docker):**
```
postgresql://postgres:postgres@localhost:5432/constanza
```

**Cómo obtenerla:**
- **Railway:** Se crea automáticamente al agregar Postgres. Ve a tu servicio → Variables → "Variables added by Railway"
- **Supabase:** Settings → Database → Connection string → URI
- **Local:** Configúrala manualmente en tu `.env`

**Verificación:**
```bash
# Verificar que está configurada
echo $DATABASE_URL

# Probar conexión
cd infra/prisma
pnpm prisma db pull
```

---

## 🔒 Variables de Autenticación

### `JWT_SECRET` (REQUERIDA para producción)

**Descripción:** Clave secreta para firmar tokens JWT.

**Formato:** String aleatorio (mínimo 32 caracteres recomendado)

**Ejemplo:**
```
JWT_SECRET=WYDq2Nd9WeoMH5CseQAaDxNsnea9YkWS8DhoBZZKn74=
```

**Generar una nueva:**
```bash
# Opción 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Opción 2: OpenSSL
openssl rand -base64 32
```

**⚠️ Importante:** 
- NO compartas esta clave
- Usa diferentes valores para desarrollo y producción
- Si cambias esta clave, todos los tokens existentes se invalidan

---

## 🌐 Variables de CORS

### `ALLOWED_ORIGINS` (Recomendada)

**Descripción:** Orígenes permitidos para CORS (separados por comas).

**Formato:** URLs separadas por comas (sin espacios)

**Ejemplo:**
```
ALLOWED_ORIGINS=https://constanza-web.vercel.app,http://localhost:3001,http://localhost:3000
```

**Para desarrollo local:**
```
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
```

**Para producción:**
```
ALLOWED_ORIGINS=https://constanza-web.vercel.app,https://app.constanza.com
```

---

## 🚀 Variables del Servidor

### `PORT` (Opcional)

**Descripción:** Puerto donde corre el servidor.

**Valor por defecto:** `3000`

**Ejemplo:**
```
PORT=3000
```

**Nota:** Railway y otros servicios cloud suelen inyectar esta variable automáticamente.

---

### `NODE_ENV` (Recomendada)

**Descripción:** Entorno de ejecución.

**Valores posibles:**
- `development` - Desarrollo local
- `production` - Producción
- `test` - Testing

**Ejemplo:**
```
NODE_ENV=production
```

---

## 🔔 Variables del Notifier (apps/notifier)

### `REDIS_URL` (Requerida para notifier)

**Descripción:** URL de conexión a Redis.

**Formato:**
```
redis://usuario:password@host:puerto
```

**Ejemplos:**

**Railway:**
```
redis://default:password@containers-us-west-xxx.railway.app:6379
```

**Local:**
```
redis://localhost:6379
```

---

### `BUILDERBOT_API_KEY` (Requerida para WhatsApp)

**Descripción:** API Key de BuilderBot para WhatsApp.

**Ejemplo:**
```
BUILDERBOT_API_KEY=tu_api_key_aqui
```

---

### `SMTP_URL` (Requerida para Email)

**Descripción:** URL de conexión SMTP para envío de emails.

**Formato:**
```
smtp://usuario:password@host:puerto
```

**Ejemplo (Gmail):**
```
smtps://usuario@gmail.com:app_password@smtp.gmail.com:465
```

**Ejemplo (SendGrid):**
```
smtp://apikey:TU_API_KEY@smtp.sendgrid.net:587
```

---

### `TTS_URL` (Requerida para Voice)

**Descripción:** URL del servicio de Text-to-Speech.

**Ejemplo:**
```
TTS_URL=https://api.elevenlabs.io/v1/text-to-speech
```

---

## 🔗 Variables de Integración

### `AGENT_API_KEY` (api-gateway, para agentes Email/WhatsApp)

**Descripción:** API key para que los agentes (OpenAI Agent Builder para email, BuilderBot para WhatsApp) consulten contexto de cliente y facturas antes de responder.

**Uso:** Los agentes llaman a `GET /v1/agent/context?email=...` o `?phone=...` con header `X-API-Key: <AGENT_API_KEY>` o `Authorization: Bearer <AGENT_API_KEY>`.

**Ejemplo:**
```
AGENT_API_KEY=tu_clave_secreta_para_agentes
```

**Generar:** Mismo criterio que JWT_SECRET (ej. `openssl rand -base64 32`).

---

### Integración ERP / facturación (api-gateway)

**Alta manual:** `POST /v1/customers`, `POST /v1/invoices` (JWT operador).

**Sincronización por lotes (upsert):** `POST /v1/integrations/ingest` con JSON:
- `customers[]`: `externalRef` opcional (ID en el sistema origen), `codigoUnico` o **`cvu`** (mismo campo: CVU del cliente / Cresium), `razonSocial`, `email`, etc.
- `invoices[]`: `externalRef` opcional, `numero`, `montoPesos`, `fechaVto`, y vínculo al cliente vía `customerId`, `customerExternalRef`, `codigoUnicoCliente` o **`cvuCliente`**.

Los registros existentes se actualizan si coinciden `externalRef` o, si no viene, `codigoUnico` (CVU) / `número de factura`. Conciliación automática Cresium: si el payload trae CVUs y el cliente tiene el mismo valor en `codigoUnico`, se puede imputar por monto exacto (junto con match por CUIT).

Requiere columnas `external_ref` en `core.customers` e `core.invoices` (migración `006_customer_invoice_external_ref.sql`).

**Tenant por defecto:** si el JWT usa el UUID fijo `00000000-0000-0000-0000-000000000001`, debe existir en `core.tenants` o los INSERT fallan por FK. Aplicar migración `007_default_tenant_id.sql` y/o ejecutar `pnpm seed` desde `infra/prisma` (el seed crea el tenant con ese id).

**Login / RLS:** si aplicaste `002_rls_policies.sql`, el `/auth/login` puede fallar porque `core.users` y `core.tenants` tenían RLS sin contexto de sesión. Aplicar `008_disable_rls_users_tenants_for_login.sql` en producción (o ejecutar el SQL a mano).

---

### Cresium — `apps/rail-cucuru` (**único** webhook de pagos entrantes: `POST /wh/cresium/deposito`)

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `CRESIUM_TENANT_ID` | Sí | UUID del tenant en Constanza al que se imputan los depósitos. |
| `CRESIUM_PARTNER_SECRET` | Sí (prod) | *Partner secret* de Cresium para HMAC-SHA256 (misma regla que API: `x-timestamp\|METHOD\|PATH\|BODY` → Base64). |
| `CRESIUM_COMPANY_ID` | No | Si se define, debe coincidir con header `x-company-id` del webhook (ej. `700`). |
| `CRESIUM_SKIP_SIGNATURE_VERIFY` | No | `true` solo en pruebas locales si aún no tenés el secret (⚠️ nunca en producción). |
| `CRESIUM_AMOUNT_UNIT` | No | Por defecto el monto del webhook se interpreta en **pesos** y se convierte a centavos. Si Cresium envía **centavos**, definir `CRESIUM_AMOUNT_UNIT=CENTS`. |
| `CRESIUM_REJECT_CVU_MISMATCH` | No | `true`: rechaza el depósito si en el payload hay CVUs y ninguno coincide con `core.tenants.cresium_cvu_cobro`. |
| `CRESIUM_AUTO_MATCH_AMOUNT_ONLY` | No | `true`: si no hay match por texto/CUIT, intenta imputar cuando **una sola** factura abierta tiene saldo pendiente **igual** al monto (riesgoso en producción). |

**Ejemplo:**
```bash
CRESIUM_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CRESIUM_PARTNER_SECRET=tu_partner_secret
CRESIUM_COMPANY_ID=700
```

**Imputación manual** (depósito sin match de factura en el payload): desde API autenticada, `POST /v1/payments/:paymentId/impute` con body `{ "invoiceId": "<uuid-factura>" }`.

**Base de datos:** aplicar migraciones `004_payment_total_amount_cents.sql` y `005_tenant_cvu_payment_metadata.sql` (`core.tenants.cresium_cvu_cobro`, `pay.payments.metadata`).

---

## 🌱 Variables de Seed

### `SEED_SECRET` (Opcional)

**Descripción:** Secreto para proteger el endpoint de seed en producción.

**Ejemplo:**
```
SEED_SECRET=mi_secreto_super_seguro
```

**⚠️ Importante:** Solo usar en desarrollo o con protección adecuada.

---

## 📝 Archivos .env por Servicio

### Raíz del proyecto (`.env`)

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=...
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
NODE_ENV=development
```

### `apps/api-gateway/.env`

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=...
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
PORT=3000
NODE_ENV=development
SEED_SECRET=dev_secret
```

### `apps/notifier/.env`

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
BUILDERBOT_API_KEY=...
SMTP_URL=smtp://...
TTS_URL=https://...
NODE_ENV=development
```

### `apps/rail-cucuru/.env`

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
CRESIUM_TENANT_ID=...       # UUID tenant Constanza
CRESIUM_PARTNER_SECRET=... # firma webhook (o SKIP solo dev)
CRESIUM_COMPANY_ID=700      # opcional
NODE_ENV=development
```

### `infra/prisma/.env`

```bash
DATABASE_URL=postgresql://...
```

---

## ✅ Checklist de Verificación

### Para desarrollo local:

- [ ] `DATABASE_URL` configurada y accesible
- [ ] `JWT_SECRET` generada (mínimo 32 caracteres)
- [ ] `ALLOWED_ORIGINS` incluye `http://localhost:3000` y `http://localhost:3001`
- [ ] `NODE_ENV=development`

### Para producción (Railway):

- [ ] `DATABASE_URL` configurada (Railway la crea automáticamente)
- [ ] `JWT_SECRET` configurada (diferente a desarrollo)
- [ ] `ALLOWED_ORIGINS` incluye tu dominio de producción
- [ ] `NODE_ENV=production`
- [ ] `SEED_SECRET` configurada (si usas seed en producción)

### Para notifier:

- [ ] `REDIS_URL` configurada
- [ ] `BUILDERBOT_API_KEY` configurada (si usas WhatsApp)
- [ ] `SMTP_URL` configurada (si usas Email)
- [ ] `TTS_URL` configurada (si usas Voice)

---

## 🔍 Cómo Verificar Variables

### 1. Verificar que Prisma está instalado y conectado:

```bash
# Ejecutar script de verificación
./verificar-prisma-db.sh

# O manualmente:
cd infra/prisma
pnpm prisma generate
pnpm prisma studio  # Abre Prisma Studio en el navegador
```

### 2. Verificar variables en Railway:

1. Ve a tu servicio en Railway
2. Pestaña **"Variables"**
3. Verifica que todas las variables requeridas estén configuradas

### 3. Verificar variables localmente:

```bash
# Ver todas las variables
cat .env

# Ver una variable específica
echo $DATABASE_URL

# Verificar que Prisma puede conectarse
cd infra/prisma
pnpm prisma db pull
```

---

## 🚨 Problemas Comunes

### "Can't reach database server"

**Causa:** `DATABASE_URL` incorrecta o base de datos no accesible.

**Solución:**
1. Verifica que `DATABASE_URL` esté correcta
2. Verifica que la base de datos esté corriendo
3. Verifica firewall/red si es remota

### "Prisma Client not generated"

**Causa:** No se ha ejecutado `prisma generate`.

**Solución:**
```bash
cd infra/prisma
pnpm prisma generate
```

### "JWT_SECRET is required"

**Causa:** Variable `JWT_SECRET` no configurada.

**Solución:**
```bash
# Generar una nueva
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Agregar a .env
echo "JWT_SECRET=tu_secreto_generado" >> .env
```

---

## 📚 Referencias

- [Documentación de Prisma](https://www.prisma.io/docs)
- [Railway Variables](https://docs.railway.app/develop/variables)
- [Supabase Connection Strings](https://supabase.com/docs/guides/database/connecting-to-postgres)

