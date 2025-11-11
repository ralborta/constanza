# Constanza - Sistema de Cobranzas B2B Omnicanal

## 0. Objetivo del Producto

**Resumen operativo**: Acelerar cobranzas B2B con secuencias omnicanal (Email/WhatsApp/voz), recepción (Cucuru/BindX), imputación (Cucuru autoritativo en transferencias; e-cheque aplica al Aceptar), reporting/KPIs y cola de decisiones (human-in-the-loop).

---

## 1. Stack Técnico

### Frontend
- **Framework**: Next.js 14 (App Router) en Vercel
- **UI**: shadcn/ui + Tailwind CSS
- **Razón**: App Router para mejor rendimiento, shadcn/ui para componentes accesibles y rápidos de personalizar

### Backend / Microservicios
- **Runtime**: Node.js 20
- **Framework**: Fastify
- **Logging**: Pino (logs estructurados JSON)
- **Hosting**: Railway
- **Razón**: Fastify es más rápido que Express, Railway facilita despliegue de microservicios

### Mensajería y Colas
- **Cola de tareas**: Redis (Railway) + BullMQ
- **Eventos internos**: Pub/Sub (Redis Streams o BullMQ)
- **Razón**: BullMQ ofrece retry, rate limiting y monitoreo integrado

### Base de Datos
- **Provider**: Supabase Postgres (multi-tenant)
- **RLS**: ON en datos de negocio (core.*, pay.*, bindx.*, contact.*, ops.*)
- **RLS**: OFF en auditoría/eventos (audit.*) - protegido por API keys
- **Razón**: Supabase ofrece RLS nativo, backups automáticos y escalabilidad

### ORM / Query Builder
- **ORM**: Prisma (CRUD rápido, migraciones)
- **SQL directo**: Para RLS, índices, triggers complejos
- **Alternativa**: Kysely para queries complejas cuando Prisma no es suficiente
- **Razón**: Prisma acelera desarrollo, SQL directo para casos edge

### Canales de Comunicación
- **WhatsApp**: builderbot.cloud (envío/recepción de texto, mensajes de voz/voice notes, imagen, PDF)
- **Email**: SMTP (SendGrid/Resend)
- **Voz (WhatsApp)**: TTS ElevenLabs para audios (envío de mensajes de voz generados)
- **Llamadas telefónicas**: ElevenLabs Agents + carrier (Twilio)

### Autenticación
- **Método**: JWT (org/tenant/roles) firmado con HS256
- **Razón**: Stateless, fácil de validar en múltiples servicios

### Observabilidad
- **Logs**: JSON estructurados (Pino)
- **Métricas**: Básicas (opcional: OpenTelemetry)
- **Razón**: Logs JSON facilitan parsing y análisis

### Infraestructura como Código
- **Mínimo**: `railway.json` y `supabase/migrations`
- **Futuro**: Terraform (opcional)
- **Razón**: Empezar simple, escalar a IaC completo cuando sea necesario

### CI/CD
- **Provider**: GitHub Actions
- **Pipeline**: Lint → Test → Prisma migrate → Deploy (Vercel/Railway)
- **Razón**: Integración nativa con GitHub, fácil de configurar

---

## 2. Arquitectura Lógica (Dominios → Microservicios)

```
constanza/
├── apps/
│   ├── web/                    # Next.js (Vercel)
│   ├── api-gateway/            # HTTP front door
│   ├── contact-orchestrator/   # Secuencias omnicanal
│   ├── notifier/               # builderbot.cloud + SMTP
│   ├── rail-cucuru/            # Webhooks Cucuru ✅
│   ├── rail-bindx/             # BindX e-cheques
│   ├── reconciler/             # Match de pagos
│   ├── decision-queue/         # Cola de decisiones
│   ├── erp-connector/          # Export ERP
│   ├── scheduler/              # Tareas programadas
│   ├── nlp-service/            # Intents + entidades WA
│   ├── doc-intake/             # OCR/validación comprobantes
│   ├── tts-service/            # ElevenLabs TTS
│   ├── call-orchestrator/      # Voz (Agents + Twilio)
│   └── commissions-service/    # Cálculo de comisiones (asociados)
├── packages/
│   ├── events/                 # Contratos Zod de eventos
│   ├── schemas/                # OpenAPI/Tipos compartidos
│   └── sdk/                    # Cliente TS para web y servicios
└── infra/
    ├── prisma/                 # Schema y migraciones
    ├── supabase/               # Migraciones SQL
    └── github/                 # GitHub Actions workflows
```

### Estado de Desarrollo de Servicios

| Servicio | Estado | Notas |
|----------|--------|-------|
| `rail-cucuru` | ✅ **Desarrollado** | Implementado y en producción |
| `web` | 🚧 En desarrollo | - |
| `api-gateway` | 🚧 En desarrollo | - |
| `contact-orchestrator` | 📋 Pendiente | - |
| `notifier` | 📋 Pendiente | - |
| `rail-bindx` | 📋 Pendiente | - |
| `reconciler` | 📋 Pendiente | - |
| `decision-queue` | 📋 Pendiente | - |
| `erp-connector` | 📋 Pendiente | - |
| `scheduler` | 📋 Pendiente | - |
| `nlp-service` | 📋 Pendiente | - |
| `doc-intake` | 📋 Pendiente | - |
| `tts-service` | 📋 Pendiente | - |
| `call-orchestrator` | 📋 Pendiente | - |
| `commissions-service` | 📋 Pendiente | Usará tabla core.asociados |

**Leyenda**: ✅ Desarrollado | 🚧 En desarrollo | 📋 Pendiente

### Boundaries (Responsabilidades Clave)

#### `api-gateway`
- Autenticación JWT
- Validación de requests
- Rate limiting
- Idempotencia de requests

#### `contact-orchestrator`
- Secuencias por estado (próx. a vencer/vencida/promesa/incumplida)
- Ventanas horarias
- Límites de intentos por canal
- Cooldown por cliente

#### `notifier`
- Envío por builderbot.cloud (WhatsApp: texto, mensajes de voz, imagen, PDF)
- Recepción de mensajes de WhatsApp (texto, voice notes) vía webhooks
- Envío SMTP (email)
- Llamadas telefónicas vía ElevenLabs Agent + Twilio
- Tracking de entrega/lectura
- Procesamiento de batch de mensajes y llamadas (uno por uno con rate limiting)
- Cola BullMQ para procesamiento asíncrono
- Todas las interacciones se registran y muestran en timeline de facturas

#### `rail-cucuru` ✅ **Desarrollado**
- Recibe webhooks de imputación autoritativa (transferencias ya aplicadas)
- Recibe webhooks de acreditación/liquidación de transferencias
- Persiste en `pay.payments` y `pay.payment_applications` con `is_authoritative=true`
- Emite eventos `payment.applied_authoritative` y `payment.settled`
- **Las transferencias y acreditaciones se muestran en el timeline de facturas**
- **Estado**: Implementado y en producción

#### `rail-bindx`
- Subcuentas/alias
- E-cheques (listar/aceptar/rechazar)
- Webhooks de liquidación

#### `reconciler`
- Match exacto y avanzado (parciales, 1↔N, tolerancias)
- **Regla crítica**: Nunca toca aplicaciones con `is_authoritative=true`

#### `decision-queue`
- Excepciones y acciones 1-clic
- Desaplicar, reaplicar, nota de crédito, escalar

#### `erp-connector`
- Export CSV/API de Aplicación y Liquidación
- Report de diferencias

#### `scheduler`
- T-3/T-1/D0 (recordatorios)
- Resúmenes y reportes programados

#### `nlp-service`
- Intents: "pago mañana", "no llegó factura", "enviame CBU", "plan de pago", "disputa"
- Entidades: monto, fecha, nro factura, CUIT

#### `doc-intake`
- OCR de imágenes/PDF
- Validación de comprobantes

#### `tts-service`
- ElevenLabs TTS
- Caché de audios frecuentes

#### `call-orchestrator`
- Campañas telefónicas
- Routing a ElevenLabs Agents (Twilio)

#### `commissions-service`
- Cálculo de comisiones para asociados
- Utiliza `core.asociados` (DNI) y datos de cobranzas
- Reportes de comisiones por asociado/período

---

## 3. Modelo de Datos (Supabase)

### Core (`core.*`)

```sql
-- Tenants
core.tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usuarios / Empleados / Operadores
core.users (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES core.tenants(id),
  codigo_unico TEXT UNIQUE NOT NULL, -- Código único del empleado
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  perfil TEXT NOT NULL, -- 'ADM' | 'OPERADOR_1' | 'OPERADOR_2'
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Perfiles y Permisos:**

- **ADM**: Permiso a todo (administrador completo)
- **OPERADOR_1**: Aprobar cheques, dar de alta vendedores y clientes
- **OPERADOR_2**: Solo ver reportes (sin permisos de escritura)
- **CLIENTE**: Solo ver sus propios pagos y facturas (ver `core.customers` para autenticación)

-- Clientes
core.customers (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES core.tenants(id),
  codigo_unico TEXT UNIQUE NOT NULL, -- Código único del cliente
  codigo_venta TEXT NOT NULL DEFAULT '000', -- Código de venta para sistema de cobranza
  razon_social TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE, -- Usado para login
  password_hash TEXT, -- Hash de contraseña (NULL si no tiene acceso)
  telefono TEXT,
  activo BOOLEAN DEFAULT TRUE,
  acceso_habilitado BOOLEAN DEFAULT FALSE, -- Si tiene acceso a la plataforma
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Nota**: Los clientes pueden tener acceso a la plataforma para ver únicamente sus pagos y facturas. Si `acceso_habilitado = TRUE` y `password_hash` está definido, el cliente puede autenticarse con perfil `CLIENTE`.

-- CUITs de clientes (múltiples CUITs por cliente)
core.customer_cuits (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES core.tenants(id),
  customer_id UUID REFERENCES core.customers(id),
  cuit TEXT UNIQUE NOT NULL,
  razon_social TEXT, -- Puede diferir por CUIT
  is_primary BOOLEAN DEFAULT FALSE, -- CUIT principal
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Importante**: 
- Cada cliente tiene un `codigo_unico` (código único interno)
- Cada cliente tiene un `codigo_venta` (default "000") para el sistema de cobranza
- Un cliente puede tener **múltiples CUITs** (ej: empresa con varias sucursales/entidades legales)
- El CUIT es único a nivel tenant (no puede haber duplicados)
- Las facturas se relacionan con el `customer_id`, no directamente con el CUIT

-- Asociados (para sistema de comisiones)
core.asociados (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES core.tenants(id),
  codigo_unico TEXT UNIQUE NOT NULL, -- Código único del asociado
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  dni TEXT UNIQUE NOT NULL, -- DNI para cálculo de comisiones
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  fecha_alta DATE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Nota**: Los asociados se usarán para calcular comisiones. Se desarrollará un microservicio de comisiones que utilizará esta tabla.

-- Facturas
core.invoices (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES core.tenants(id),
  customer_id UUID REFERENCES core.customers(id),
  numero TEXT NOT NULL,
  monto INTEGER NOT NULL, -- centavos
  fecha_vto DATE NOT NULL,
  estado TEXT NOT NULL, -- 'ABIERTA' | 'PARCIAL' | 'SALDADA'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promesas de pago
core.promises (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES core.tenants(id),
  invoice_id UUID REFERENCES core.invoices(id),
  amount INTEGER, -- NULL si es total
  due_date DATE NOT NULL,
  channel TEXT NOT NULL, -- 'EMAIL' | 'WHATSAPP' | 'VOICE'
  status TEXT NOT NULL, -- 'PENDIENTE' | 'CUMPLIDA' | 'INCUMPLIDA'
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reglas de política por tenant
core.policy_rules (
  tenant_id UUID REFERENCES core.tenants(id),
  key TEXT NOT NULL,
  value_json JSONB NOT NULL,
  PRIMARY KEY (tenant_id, key)
);
```

### Pagos (`pay.*`)

```sql
-- Pagos recibidos
pay.payments (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES core.tenants(id),
  source_system TEXT NOT NULL, -- 'CUCURU' | 'BINDX' | 'MANUAL'
  method TEXT NOT NULL, -- 'TRANSFERENCIA' | 'ECHEQ' | 'OTRO'
  status TEXT NOT NULL, -- 'APLICADO' | 'PEND_LIQ' | 'LIQUIDADO' | 'RECHAZADO'
  settled_at TIMESTAMPTZ,
  external_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aplicaciones de pago a facturas
pay.payment_applications (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES core.tenants(id),
  payment_id UUID REFERENCES pay.payments(id),
  invoice_id UUID REFERENCES core.invoices(id),
  amount INTEGER NOT NULL,
  is_authoritative BOOLEAN DEFAULT FALSE, -- TRUE si viene de Cucuru
  applied_at TIMESTAMPTZ NOT NULL,
  external_application_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Regla crítica**: Si `is_authoritative=true` (Cucuru), la UI muestra en modo lectura (solo contra-asiento por decisión).

### BindX / E-cheques (`bindx.*`)

```sql
-- E-cheques
bindx.echeqs (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES core.tenants(id),
  customer_id UUID REFERENCES core.customers(id),
  number TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status_operativo TEXT NOT NULL, -- 'RECIBIDO' | 'ACEPTADO' | 'RECHAZADO'
  status_liquidacion TEXT NOT NULL, -- 'PENDIENTE' | 'ACREDITADO' | 'RECHAZADO'
  accepted_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Contacto (`contact.*`)

```sql
-- Definiciones de secuencias
contact.sequences (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES core.tenants(id),
  definition_json JSONB NOT NULL, -- pasos, ventanas, límites
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ejecuciones de secuencias
contact.runs (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES core.tenants(id),
  invoice_id UUID REFERENCES core.invoices(id),
  state TEXT NOT NULL, -- 'PRÓX_VENCER' | 'VENCIDA' | 'PROMESA' | 'PROMESA_INCUMPLIDA'
  step INTEGER DEFAULT 0,
  next_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Eventos de contacto
contact.events (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES core.tenants(id),
  run_id UUID REFERENCES contact.runs(id), -- NULL si es envío manual
  batch_id UUID REFERENCES contact.batch_jobs(id), -- NULL si no es parte de un batch
  invoice_id UUID REFERENCES core.invoices(id), -- Opcional
  customer_id UUID REFERENCES core.customers(id),
  channel TEXT NOT NULL, -- 'EMAIL' | 'WHATSAPP' | 'VOICE'
  direction TEXT NOT NULL, -- 'OUTBOUND' | 'INBOUND'
  is_manual BOOLEAN DEFAULT FALSE, -- TRUE si fue enviado manualmente
  sent_by UUID REFERENCES core.users(id), -- Usuario que envió (si es manual)
  template_id UUID, -- Template usado
  message_text TEXT, -- Texto del mensaje
  payload JSONB, -- Datos adicionales
  status TEXT NOT NULL, -- 'SCHEDULED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
  external_message_id TEXT, -- ID del proveedor
  error_reason TEXT, -- Si falló
  ts TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs de batch de mensajes
contact.batch_jobs (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES core.tenants(id),
  created_by UUID REFERENCES core.users(id),
  channel TEXT NOT NULL, -- 'EMAIL' | 'WHATSAPP' | 'VOICE'
  template_id UUID, -- Template usado
  total_messages INTEGER NOT NULL,
  processed INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  status TEXT NOT NULL, -- 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  file_name TEXT, -- Nombre del archivo original
  file_format TEXT, -- 'CSV' | 'JSON'
  error_summary JSONB, -- Resumen de errores
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Operación (`ops.*`)

```sql
-- Cola de decisiones
ops.decision_items (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES core.tenants(id),
  type TEXT NOT NULL, -- 'DESAPLICAR' | 'REAPLICAR' | 'CREDIT_NOTE' | 'ESCALAR'
  severity TEXT NOT NULL, -- 'LOW' | 'MEDIUM' | 'HIGH'
  status TEXT NOT NULL, -- 'OPEN' | 'RESOLVED'
  sla_at TIMESTAMPTZ,
  data_json JSONB NOT NULL,
  created_by UUID REFERENCES core.users(id),
  resolved_by UUID REFERENCES core.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Auditoría (`audit.*`)

```sql
-- Log de eventos
audit.event_log (
  ts TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID,
  actor TEXT, -- user_id o 'system'
  event_type TEXT NOT NULL,
  ref_id UUID,
  payload_json JSONB
);

-- Eventos de webhooks
audit.webhook_events (
  event_id TEXT PRIMARY KEY,
  tenant_id UUID,
  provider TEXT NOT NULL, -- 'CUCURU' | 'BINDX' | 'BUILDERBOT'
  topic TEXT NOT NULL,
  signature_ok BOOLEAN,
  processed_at TIMESTAMPTZ,
  payload_json JSONB
);
```

### Row Level Security (RLS)

- **RLS ON**: `core.*`, `pay.*`, `bindx.*`, `contact.*`, `ops.*`
- **RLS OFF**: `audit.*` y `webhook_events` (protegido por API keys y segmentación interna)

Ejemplo de política RLS:

```sql
ALTER TABLE core.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON core.invoices
  USING (tenant_id = (auth.jwt()->>'tenant_id')::UUID);
```

---

## 4. Eventos y Contratos

### Nombres de Topics

- `invoice.ingested`
- `notify.scheduled` | `notify.dispatched` | `notify.failed`
- `payment.applied_authoritative` (Cucuru - transferencias)
- `payment.settled` (Cucuru - acreditaciones)
- `echeq.applied` (al Aceptar en UI)
- `payment.settled` | `payment.unsettled` (BindX liquidación)
- `reconcile.partial` | `reconcile.multi` | `reconcile.fuzzy` | `reconcile.failed`
- `promise.created` | `promise.fulfilled` | `promise.broken`
- `decision.opened` | `decision.resolved`

### Esquema Zod (Ejemplo)

```typescript
// packages/events/src/payment.ts
import { z } from 'zod';

export const PaymentAppliedAuthoritative = z.object({
  tenantId: z.string().uuid(),
  paymentId: z.string().uuid(),
  appliedAt: z.string().datetime(),
  applications: z.array(z.object({
    invoiceId: z.string().uuid(),
    amount: z.number().int().positive()
  })),
  provider: z.literal('cucuru'),
});

export type PaymentAppliedAuthoritative = z.infer<typeof PaymentAppliedAuthoritative>;
```

---

## 5. Webhooks y REST

### Webhooks Entrantes

#### POST `/wh/cucuru/payment.applied`

```json
{
  "payment_id": "ext_123",
  "applied_at": "2025-11-10T12:34:56Z",
  "applications": [
    {"invoice_id": "INV-1001", "amount": 120000}
  ],
  "signature": "hmac..."
}
```

**Acción**: 
- Upsert `pay.payments` + `pay.payment_applications` (`is_authoritative=true`)
- Emitir evento `payment.applied_authoritative`
- **Se muestra en timeline de facturas** como "Transferencia de Cucuru" con fecha, monto y aplicaciones

#### POST `/wh/cucuru/payment.settled` (Acreditación)

```json
{
  "payment_id": "ext_123",
  "settled_at": "2025-11-12T09:00:00Z",
  "status": "LIQUIDADO",
  "signature": "hmac..."
}
```

**Acción**:
- Actualizar `pay.payments.status = 'LIQUIDADO'` y `settled_at`
- **Se muestra en timeline de facturas** como "Acreditación de Cucuru" con fecha y monto liquidado

#### POST `/wh/bindx/echeq.status_changed`

```json
{
  "echeq_id": "B123",
  "status": "ACREDITADO|RECHAZADO",
  "settled_at": "2025-11-12T09:00:00Z"
}
```

**Acción**: Actualizar `bindx.echeqs.status_liquidacion` + `pay.payments.settled_at` o abrir `ops.decision_item` si RECHAZADO.

### REST (api-gateway)

#### Ingesta
- `POST /ingest/invoices` (CSV/JSON)

#### Secuencias
- `POST /sequences/run` (cohortes: próxima a vencer, vencida, promesa hoy)

#### E-cheques
- `POST /echeqs/{id}/accept` → al aceptar, crear `pay.payment_applications` (pend. liquidación)
- `POST /echeqs/{id}/reject`

#### KPIs
- `GET /kpi/summary` (DSO, cash-in 7/30, % promesas, % auto-imputado, salud canal)

#### Consultas
- `GET /invoices?state=&customer_id=`
- `GET /promises?status=`

#### Decisiones
- `GET /decisions`
- `POST /decisions/{id}/actions/{approve|reapply|credit_note|escalate}`

#### Export
- `GET /exports/erp?date=YYYY-MM-DD`

### Builderbot (WhatsApp)

#### Entrante
- `POST /wh/wa/incoming` (texto, VOICE_NOTE, imagen, PDF) → `nlp-service`/`doc-intake` según tipo
- Los mensajes de voz (voice notes) se procesan y se muestran en timeline
- Se crea registro en `contact.events` con `direction: INBOUND`

#### Saliente
- `notifier` llama a builderbot.cloud (`templateId` + `variables` + `mediaURL` o `voiceNoteURL`)
- Se pueden enviar mensajes de voz generados con TTS de ElevenLabs
- Todas las interacciones se muestran en timeline de facturas en pantalla

### ElevenLabs

#### TTS
- `POST /tts/render` (nuestro `tts-service` cachea y devuelve URL/Buffer al `notifier`)

#### Llamadas
- `call-orchestrator` programa outbound (Twilio) a Agent; webhooks de call events → timeline (resumen + promesa si aplica)
- Las llamadas se muestran en el timeline de facturas con duración y resumen
- Si se detecta promesa de pago durante la llamada, se crea `core.promises`

---

## 6. Secuencias y Reglas (contact-orchestrator)

### Estados
- `PRÓX_VENCER`: Facturas próximas a vencer (T-3, T-1)
- `VENCIDA`: Facturas vencidas
- `PROMESA`: Cliente prometió pago
- `PROMESA_INCUMPLIDA`: Promesa no cumplida

### Reglas
- Ventanas horarias (por tenant)
- Límites de intentos por canal
- Cooldown por cliente

### Camino Típico
1. Email (T-3, T-1)
2. WhatsApp (D0, D+3)
3. Llamada IA (si propensión) con A/B de plantillas

### Promesas
- Al detectar "pago mañana" → crear `core.promises` y programar recordatorios T-1/T-0
- Si no llega → pasa a `PROMESA_INCUMPLIDA`

---

## 7. UX Clave (Web en Vercel)

### Dashboard Principal

**Layout:**
- Sidebar izquierdo con navegación: Cobranzas, Cheques, Eventos, Notificaciones
- Perfil de usuario en la parte inferior del sidebar
- Área principal con dashboard de cobranzas

**Header del Dashboard:**
- Título: "Dashboard de Cobranzas"
- Botones de acción:
  - "Exportar Reporte" (exportación de datos)
  - "Generar Nuevo Cobro" (acción principal - destacado en verde)

**Tarjetas de KPIs (4 métricas principales):**
1. **Monto Total Cobrado**: Monto total con variación porcentual (+/-)
2. **Deuda Pendiente**: Monto pendiente con variación porcentual
3. **Eficiencia de Cobro**: Porcentaje de eficiencia con variación
4. **E-Checks Pendientes**: Cantidad de e-cheques pendientes con variación

**Tabla de Cobranzas Pendientes:**
- **Barra de búsqueda y filtros:**
  - Campo de búsqueda ("Buscar...")
  - Filtros: "Todos los estados", "Todas las fechas", "Más filtros"
- **Columnas:**
  - ID FACTURA
  - CLIENTE
  - MONTO
  - FECHA VENCIMIENTO
  - ANTIGÜEDAD (días desde vencimiento)
  - ESTADO (badges con colores: "Por vencer" - amarillo, "Vencido" - rojo, "Programado" - verde)
  - ACCIONES (Ver, Recordar, Llamar, Editar, Notificar según estado)
    - **Recordar**: Envía WhatsApp o Email de recordatorio
    - **Llamar**: Inicia llamada telefónica
    - **Notificar**: Envía notificación por canal seleccionado
- **Paginación**: Muestra rango de resultados y controles de página

**Tabla de E-Checks Pendientes de Aprobación:**
- Ubicada en la parte inferior izquierda
- **Columnas:** ID CHEQUE, EMISOR, MONTO, ACCIONES
- Botón "Aprobar" (verde) por cada e-cheque
- Link "Ver todos" para navegar a vista completa

**Gráfico de Rendimiento Mensual:**
- Ubicado en la parte inferior derecha
- Gráfico de barras mostrando rendimiento de cobranzas por mes
- Eje X: Meses (Ene, Feb, Mar, Abr, May, Jun)
- Visualización de tendencias mensuales

### Facturas (Vista Detalle)
- Badges: "Aplicado por Cucuru 🔒", "Aplicado (pend. acreditación e-cheque)", "Parcial"
- Timeline: muestra todas las interacciones en pantalla:
  - **Transferencias de Cucuru** (webhooks recibidos):
    - Fecha y hora de la transferencia
    - Monto transferido
    - Aplicaciones a facturas (con badge "Aplicado por Cucuru 🔒")
    - Estado: APLICADO (autoritativo)
  - **Acreditaciones de Cucuru**:
    - Fecha de acreditación/liquidación
    - Estado: LIQUIDADO
    - Monto acreditado
  - Contactos (Email, WhatsApp, Llamadas)
  - Mensajes de WhatsApp (texto, voz, imágenes, PDFs)
  - Llamadas telefónicas (duración, resumen, promesas detectadas)
  - Promesas de pago
  - Aplicaciones de pago (manuales o e-cheques)
  - Liquidaciones

### E-cheques (Vista Completa)
- Tabla con Aceptar/Rechazar
- Columnas: "Aplicado a", "Acreditación", "Aceptado por"

### Decidir (Cola de Decisiones)
- Cola por severidad/SLA
- Acciones 1-clic con comentario obligatorio

### Secuencias
- Editor simple (pasos, ventanas, límites)
- Estadísticas por plantilla/canal

---

## 8. Seguridad y Compliance

- **JWT**: Con `tenant_id` y `perfil` (`ADM` | `OPERADOR_1` | `OPERADOR_2` | `CLIENTE`)
- **Autenticación de clientes**: Los clientes se autentican con `email` + `password` y reciben JWT con `perfil: CLIENTE` y `customer_id`
- **RLS**: Fuerte (cada fila atada a `tenant_id`)
- **HMAC**: En webhooks (Cucuru/BindX/builderbot/voz)
- **PII**: Minimizada, masking en logs
- **Backups**: Diarios Supabase
- **Retención**: `audit.event_log` 90 días (archivado después)
- **WhatsApp**: Uso de templates y opt-in, control de frecuencia para cuidar calidad del número

---

## 9. Despliegue

### Secrets (Matriz Mínima)

| Servicio | Secrets |
|----------|---------|
| `web` (Vercel) | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_TENANT` |
| `api-gateway` | `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL` |
| `contact-orchestrator` | `REDIS_URL`, `DATABASE_URL` |
| `notifier` | `BUILDERBOT_API_KEY`, `SMTP_URL`, `TTS_URL`, `REDIS_URL`, `DATABASE_URL` |
| `rail-cucuru` | `CUCURU_WEBHOOK_SECRET`, `DATABASE_URL`, `REDIS_URL` |
| `rail-bindx` | `BINDX_API_KEY`, `BINDX_WEBHOOK_SECRET`, `DATABASE_URL`, `REDIS_URL` |
| `reconciler` | `DATABASE_URL`, `REDIS_URL` |
| `decision-queue` | `DATABASE_URL`, `REDIS_URL` |
| `erp-connector` | `DATABASE_URL` |
| `scheduler` | `REDIS_URL`, `DATABASE_URL` |
| `nlp-service` | `DATABASE_URL`, (modelo/config) |
| `doc-intake` | `DATABASE_URL`, (OCR provider si aplica) |
| `tts-service` | `ELEVENLABS_API_KEY`, `REDIS_URL` |
| `call-orchestrator` | `TWILIO_*`, `ELEVENLABS_AGENT_ID`, `REDIS_URL`, `DATABASE_URL` |

### CI/CD (GitHub Actions) – Pipeline Básico

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: pnpm install
      - run: pnpm -w lint
      - run: pnpm -w test

  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

  deploy:
    needs: [test, migrate]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        # ... Vercel deployment
      - name: Deploy to Railway
        # ... Railway deployment
      - name: Smoke tests
        run: |
          curl -f ${{ secrets.API_URL }}/health
```

---

## 10. Operación y SLOs

### SLO
- Webhooks procesados < 2s p95
- Entregas WA/email registradas < 5s p95
- Colas sin backlog > 1 min (alarma)

### Alertas
- Reintentos de webhooks > 3
- Tasa de fallos por rail > 2%
- Degradación "Calidad WABA"
- Aumento de `decision_items` por "e-cheque rechazado"

---

## 11. Roadmap (12 Semanas)

- **S0–3**: ✅ rail-cucuru webhooks (completado) + Ingesta + Secuencias (Email/WA) + Promesas + KPIs básicos
- **S4–7**: rail-bindx e-cheques (aceptar/rechazar) + reconciliación avanzada + conector ERP 1 + reporte de diferencias
- **S8–12**: Decision-queue completa + reportes programados + automatizaciones (alta/baja) + voz (Agents/Twilio) para flujos acotados

---

## 12. Snippets Útiles

### Estructura Monorepo (pnpm workspaces)

```json
// package.json (raíz)
{
  "private": true,
  "workspaces": ["apps/*", "packages/*", "infra/*"]
}
```

### Ejemplo de Cola BullMQ (notifier)

```typescript
// apps/notifier/src/queues.ts
import { Queue, Worker } from 'bullmq';

export const notifyQueue = new Queue('notify.send', {
  connection: {
    url: process.env.REDIS_URL!
  }
});

// Worker que procesa mensajes y llamadas uno por uno
export const notifyWorker = new Worker('notify.send', async (job) => {
  const { channel, customer_id, message, template_id, variables } = job.data;
  
  if (channel === 'WHATSAPP') {
    // Envío vía builderbot.cloud con rate limiting
    await builderbot.sendMessage({
      to: customer.telefono,
      templateId: template_id,
      variables: variables,
      message: message
    });
  } else if (channel === 'EMAIL') {
    // Envío vía SMTP
    await smtp.send({
      to: customer.email,
      subject: message.subject,
      body: message.body
    });
  } else if (channel === 'VOICE') {
    // Llamada telefónica vía ElevenLabs Agent + Twilio
    await callOrchestrator.initiateCall({
      to: customer.telefono,
      agentId: process.env.ELEVENLABS_AGENT_ID,
      script: message, // o template convertido a script
      variables: variables
    });
  }
  
  // Registrar en contact.events
  await createContactEvent({
    ...job.data,
    status: 'SENT',
    batch_id: job.data.batch_id
  });
}, {
  connection: { url: process.env.REDIS_URL! },
  limiter: {
    max: 10, // Máximo 10 mensajes/llamadas
    duration: 60000 // por minuto (rate limiting)
  },
  concurrency: 1 // Procesar uno por uno
});
```

### Idempotencia de Webhook (Redis)

```typescript
// apps/rail-cucuru/src/webhooks.ts
const ok = await redis.setnx(`wh:cucuru:${eventId}`, '1');
if (!ok) return res.status(200).end(); // duplicado
await redis.expire(`wh:cucuru:${eventId}`, 3600);
```

### RLS Ejemplo (Supabase)

```sql
ALTER TABLE core.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON core.invoices
  USING (tenant_id = (auth.jwt()->>'tenant_id')::UUID);
```

