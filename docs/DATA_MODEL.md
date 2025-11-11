# Modelo de Datos Detallado

## Esquema General

El modelo de datos está organizado en esquemas lógicos por dominio:

- `core.*`: Entidades principales (tenants, usuarios, clientes, facturas, promesas)
- `pay.*`: Pagos y aplicaciones
- `bindx.*`: E-cheques de BindX
- `contact.*`: Secuencias y eventos de contacto
- `ops.*`: Operaciones y decisiones
- `audit.*`: Auditoría (RLS OFF)

## Esquemas por Dominio

### Core

#### `core.tenants`
```sql
CREATE TABLE core.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `core.users` / `core.empleados` / `core.operadores`
```sql
CREATE TABLE core.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  codigo_unico TEXT NOT NULL, -- Código único del empleado/operador
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT NOT NULL,
  perfil TEXT NOT NULL CHECK (perfil IN ('ADM', 'OPERADOR_1', 'OPERADOR_2')),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email),
  UNIQUE(tenant_id, codigo_unico)
);
```

**Perfiles y Permisos:**

- **ADM**: Permiso a todo (administrador completo)
  - Ver, crear, editar, eliminar todo
  - Aprobar/rechazar cheques
  - Dar de alta vendedores/asociados
  - Dar de alta clientes
  - Ver todos los reportes
  - Configuración del sistema

- **OPERADOR_1**: Operador con permisos de gestión
  - Aprobar/rechazar cheques (e-cheques)
  - Dar de alta vendedores/asociados
  - Dar de alta clientes
  - Ver y editar cobranzas
  - Ver reportes

- **OPERADOR_2**: Operador de solo lectura
  - Solo puede ver reportes
  - Sin permisos de escritura
  - Sin aprobación de cheques
  - Sin alta de vendedores/clientes

- **CLIENTE**: Acceso limitado del cliente
  - Solo puede ver sus propios pagos
  - Solo puede ver sus propias facturas
  - Solo puede ver sus propios e-cheques
  - Sin permisos de escritura
  - Sin acceso a reportes generales
  - Sin acceso a otros clientes

#### `core.customers`
```sql
CREATE TABLE core.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  codigo_unico TEXT NOT NULL, -- Código único del cliente (interno)
  codigo_venta TEXT NOT NULL DEFAULT '000', -- Código de venta para sistema de cobranza
  razon_social TEXT NOT NULL,
  email TEXT NOT NULL, -- Usado para login
  password_hash TEXT, -- Hash de contraseña (NULL si no tiene acceso)
  telefono TEXT,
  activo BOOLEAN DEFAULT TRUE, -- Para habilitar/deshabilitar acceso
  acceso_habilitado BOOLEAN DEFAULT FALSE, -- Si tiene acceso a la plataforma
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, codigo_unico),
  UNIQUE(tenant_id, email)
);
```

**Nota**: Los clientes pueden tener acceso a la plataforma para ver únicamente sus pagos y facturas. Si `acceso_habilitado = TRUE` y `password_hash` está definido, el cliente puede autenticarse.

-- Tabla para múltiples CUITs por cliente
CREATE TABLE core.customer_cuits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  cuit TEXT NOT NULL,
  razon_social TEXT, -- Puede diferir por CUIT
  is_primary BOOLEAN DEFAULT FALSE, -- CUIT principal
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, cuit)
);

CREATE INDEX idx_customer_cuits_customer ON core.customer_cuits(customer_id);
CREATE INDEX idx_customer_cuits_primary ON core.customer_cuits(tenant_id, customer_id, is_primary) WHERE is_primary = TRUE;
```

#### `core.asociados`
```sql
CREATE TABLE core.asociados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  codigo_unico TEXT NOT NULL, -- Código único del asociado
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  dni TEXT NOT NULL, -- DNI para cálculo de comisiones
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  fecha_alta DATE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, codigo_unico),
  UNIQUE(tenant_id, dni)
);

CREATE INDEX idx_asociados_tenant_activo ON core.asociados(tenant_id, activo) WHERE activo = TRUE;
```

**Nota**: Los asociados se usarán para calcular comisiones (microservicio de comisiones a desarrollar).

#### `core.invoices`
```sql
CREATE TABLE core.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  monto INTEGER NOT NULL CHECK (monto > 0), -- centavos
  fecha_vto DATE NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('ABIERTA', 'PARCIAL', 'SALDADA')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, numero)
);

CREATE INDEX idx_invoices_tenant_customer ON core.invoices(tenant_id, customer_id);
CREATE INDEX idx_invoices_fecha_vto ON core.invoices(fecha_vto);
CREATE INDEX idx_invoices_estado ON core.invoices(estado);
```

#### `core.promises`
```sql
CREATE TABLE core.promises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES core.invoices(id) ON DELETE CASCADE,
  amount INTEGER, -- NULL si es total, en centavos
  due_date DATE NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('EMAIL', 'WHATSAPP', 'VOICE')),
  status TEXT NOT NULL CHECK (status IN ('PENDIENTE', 'CUMPLIDA', 'INCUMPLIDA')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promises_tenant_status ON core.promises(tenant_id, status);
CREATE INDEX idx_promises_due_date ON core.promises(due_date);
```

#### `core.policy_rules`
```sql
CREATE TABLE core.policy_rules (
  tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tenant_id, key)
);
```

### Pagos

#### `pay.payments`
```sql
CREATE TABLE pay.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  source_system TEXT NOT NULL CHECK (source_system IN ('CUCURU', 'BINDX', 'MANUAL')),
  method TEXT NOT NULL CHECK (method IN ('TRANSFERENCIA', 'ECHEQ', 'OTRO')),
  status TEXT NOT NULL CHECK (status IN ('APLICADO', 'PEND_LIQ', 'LIQUIDADO', 'RECHAZADO')),
  settled_at TIMESTAMPTZ,
  external_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_tenant_status ON pay.payments(tenant_id, status);
CREATE INDEX idx_payments_external_ref ON pay.payments(external_ref);
```

#### `pay.payment_applications`
```sql
CREATE TABLE pay.payment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES pay.payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES core.invoices(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0), -- centavos
  is_authoritative BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMPTZ NOT NULL,
  external_application_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_applications_tenant_payment ON pay.payment_applications(tenant_id, payment_id);
CREATE INDEX idx_applications_tenant_invoice ON pay.payment_applications(tenant_id, invoice_id);
CREATE INDEX idx_applications_authoritative ON pay.payment_applications(is_authoritative);
```

**Regla crítica**: Si `is_authoritative=true`, la UI muestra en modo lectura. Solo se puede modificar mediante `ops.decision_items`.

### BindX

#### `bindx.echeqs`
```sql
CREATE TABLE bindx.echeqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0), -- centavos
  status_operativo TEXT NOT NULL CHECK (status_operativo IN ('RECIBIDO', 'ACEPTADO', 'RECHAZADO')),
  status_liquidacion TEXT NOT NULL CHECK (status_liquidacion IN ('PENDIENTE', 'ACREDITADO', 'RECHAZADO')),
  accepted_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, number)
);

CREATE INDEX idx_echeqs_tenant_status ON bindx.echeqs(tenant_id, status_operativo, status_liquidacion);
CREATE INDEX idx_echeqs_customer ON bindx.echeqs(tenant_id, customer_id);
```

### Contacto

#### `contact.sequences`
```sql
CREATE TABLE contact.sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  definition_json JSONB NOT NULL, -- pasos, ventanas, límites
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Ejemplo de `definition_json`:
```json
{
  "steps": [
    {
      "channel": "EMAIL",
      "template": "reminder_t3",
      "delay_days": -3,
      "time_window": {"start": "09:00", "end": "18:00"}
    },
    {
      "channel": "WHATSAPP",
      "template": "reminder_d0",
      "delay_days": 0,
      "time_window": {"start": "10:00", "end": "20:00"}
    }
  ],
  "max_attempts": {
    "EMAIL": 3,
    "WHATSAPP": 2,
    "VOICE": 1
  },
  "cooldown_hours": 24
}
```

#### `contact.runs`
```sql
CREATE TABLE contact.runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES core.invoices(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES contact.sequences(id),
  state TEXT NOT NULL CHECK (state IN ('PRÓX_VENCER', 'VENCIDA', 'PROMESA', 'PROMESA_INCUMPLIDA')),
  step INTEGER DEFAULT 0,
  next_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_runs_tenant_state ON contact.runs(tenant_id, state);
CREATE INDEX idx_runs_next_at ON contact.runs(next_at) WHERE next_at IS NOT NULL;
```

#### `contact.events`
```sql
CREATE TABLE contact.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  run_id UUID REFERENCES contact.runs(id), -- NULL si es envío manual
  batch_id UUID REFERENCES contact.batch_jobs(id), -- NULL si no es parte de un batch
  invoice_id UUID REFERENCES core.invoices(id), -- Opcional: factura relacionada
  customer_id UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('EMAIL', 'WHATSAPP', 'VOICE')),
  direction TEXT NOT NULL CHECK (direction IN ('OUTBOUND', 'INBOUND')),
  is_manual BOOLEAN DEFAULT FALSE, -- TRUE si fue enviado manualmente por operador
  sent_by UUID REFERENCES core.users(id), -- Usuario que envió (si es manual)
  template_id UUID, -- Template usado (si aplica)
  message_text TEXT, -- Texto del mensaje
  media_url TEXT, -- URL de media (imagen, PDF, voice note)
  transcription TEXT, -- Transcripción de voice note (si aplica)
  call_duration INTEGER, -- Duración en segundos (solo para VOICE/calls)
  call_summary TEXT, -- Resumen de la llamada (si aplica)
  payload JSONB, -- Datos adicionales (variables, etc.)
  status TEXT NOT NULL CHECK (status IN ('SCHEDULED', 'SENT', 'DELIVERED', 'READ', 'FAILED')),
  external_message_id TEXT, -- ID del proveedor (builderbot, SMTP, Twilio)
  error_reason TEXT, -- Si status = FAILED
  ts TIMESTAMPTZ DEFAULT NOW()
);
```

**Nota**: 
- Los mensajes de voz de WhatsApp (voice notes) se almacenan con `media_url` y opcionalmente `transcription`
- Las llamadas telefónicas incluyen `call_duration` y `call_summary`
- Todas las interacciones se muestran en el timeline de facturas en pantalla

CREATE INDEX idx_events_tenant_run ON contact.events(tenant_id, run_id);
CREATE INDEX idx_events_ts ON contact.events(ts);
CREATE INDEX idx_events_batch ON contact.events(batch_id) WHERE batch_id IS NOT NULL;
```

#### `contact.batch_jobs`
```sql
CREATE TABLE contact.batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES core.users(id),
  channel TEXT NOT NULL CHECK (channel IN ('EMAIL', 'WHATSAPP', 'VOICE')),
  template_id UUID, -- Template usado (si aplica)
  total_messages INTEGER NOT NULL,
  processed INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  file_name TEXT, -- Nombre del archivo original
  file_format TEXT CHECK (file_format IN ('CSV', 'JSON')),
  error_summary JSONB, -- Resumen de errores
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_batch_jobs_tenant_status ON contact.batch_jobs(tenant_id, status);
CREATE INDEX idx_batch_jobs_created_by ON contact.batch_jobs(created_by);
```

**Nota**: Los batch jobs se procesan mediante BullMQ. Cada mensaje/llamada del batch se encola individualmente y se procesa con rate limiting para no saturar builderbot.cloud, ElevenLabs/Twilio u otros proveedores. Las llamadas telefónicas también se pueden enviar en batch usando el agente de ElevenLabs.

### Operación

#### `ops.decision_items`
```sql
CREATE TABLE ops.decision_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('DESAPLICAR', 'REAPLICAR', 'CREDIT_NOTE', 'ESCALAR')),
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'RESOLVED')),
  sla_at TIMESTAMPTZ,
  data_json JSONB NOT NULL,
  created_by UUID REFERENCES core.users(id),
  resolved_by UUID REFERENCES core.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_decisions_tenant_status ON ops.decision_items(tenant_id, status);
CREATE INDEX idx_decisions_sla_at ON ops.decision_items(sla_at) WHERE status = 'OPEN';
```

Ejemplo de `data_json`:
```json
{
  "payment_id": "uuid",
  "application_id": "uuid",
  "invoice_id": "uuid",
  "reason": "Aplicación incorrecta",
  "suggested_action": "desaplicar"
}
```

### Auditoría

#### `audit.event_log`
```sql
CREATE TABLE audit.event_log (
  ts TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID,
  actor TEXT NOT NULL, -- user_id o 'system'
  event_type TEXT NOT NULL,
  ref_id UUID,
  payload_json JSONB
);

CREATE INDEX idx_event_log_tenant_ts ON audit.event_log(tenant_id, ts);
CREATE INDEX idx_event_log_type ON audit.event_log(event_type);
```

**Nota**: RLS OFF. Protegido por API keys y segmentación interna.

#### `audit.webhook_events`
```sql
CREATE TABLE audit.webhook_events (
  event_id TEXT PRIMARY KEY,
  tenant_id UUID,
  provider TEXT NOT NULL CHECK (provider IN ('CUCURU', 'BINDX', 'BUILDERBOT')),
  topic TEXT NOT NULL,
  signature_ok BOOLEAN,
  processed_at TIMESTAMPTZ,
  payload_json JSONB
);

CREATE INDEX idx_webhook_tenant_provider ON audit.webhook_events(tenant_id, provider);
CREATE INDEX idx_webhook_processed_at ON audit.webhook_events(processed_at);
```

## Row Level Security (RLS)

### Políticas Comunes

```sql
-- Ejemplo para core.invoices
ALTER TABLE core.invoices ENABLE ROW LEVEL SECURITY;

-- Política para empleados/operadores (ven todas las facturas del tenant)
CREATE POLICY employees_on_invoices ON core.invoices
  FOR ALL
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::UUID
    AND (auth.jwt()->>'perfil')::TEXT IN ('ADM', 'OPERADOR_1', 'OPERADOR_2')
  );

-- Política para clientes (solo ven sus propias facturas)
CREATE POLICY customers_on_invoices ON core.invoices
  FOR SELECT
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::UUID
    AND (auth.jwt()->>'perfil')::TEXT = 'CLIENTE'
    AND customer_id = (auth.jwt()->>'customer_id')::UUID
  );
```

**Nota**: Similar para `pay.payments`, `pay.payment_applications`, `bindx.echeqs` - los clientes solo ven sus propios registros.

### Perfiles y Permisos

- **ADM**: Todas las operaciones (administrador completo)
  - SELECT, INSERT, UPDATE, DELETE en todas las tablas
  - Aprobar/rechazar cheques
  - Dar de alta vendedores/asociados y clientes
  - Configuración del sistema

- **OPERADOR_1**: Permisos de gestión
  - SELECT, INSERT, UPDATE en tablas de negocio
  - Aprobar/rechazar cheques (e-cheques)
  - Dar de alta vendedores/asociados
  - Dar de alta clientes
  - NO puede modificar aplicaciones con `is_authoritative=true` (solo ADM)

- **OPERADOR_2**: Solo lectura
  - Solo SELECT (ver reportes)
  - Sin permisos de escritura
  - Sin aprobación de cheques
  - Sin alta de vendedores/clientes

- **CLIENTE**: Acceso limitado (solo sus propios datos)
  - Solo SELECT en sus propias facturas (`core.invoices` donde `customer_id = su_id`)
  - Solo SELECT en sus propios pagos (`pay.payments` relacionados con sus facturas)
  - Solo SELECT en sus propios e-cheques (`bindx.echeqs` donde `customer_id = su_id`)
  - Sin permisos de escritura
  - Sin acceso a reportes generales
  - Sin acceso a datos de otros clientes

## Triggers y Funciones

### Actualizar `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas con updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON core.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Actualizar estado de factura

```sql
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
  total_applied INTEGER;
  invoice_monto INTEGER;
BEGIN
  SELECT monto INTO invoice_monto FROM core.invoices WHERE id = NEW.invoice_id;
  
  SELECT COALESCE(SUM(amount), 0) INTO total_applied
  FROM pay.payment_applications
  WHERE invoice_id = NEW.invoice_id;
  
  IF total_applied >= invoice_monto THEN
    UPDATE core.invoices SET estado = 'SALDADA' WHERE id = NEW.invoice_id;
  ELSIF total_applied > 0 THEN
    UPDATE core.invoices SET estado = 'PARCIAL' WHERE id = NEW.invoice_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_status_trigger
  AFTER INSERT OR UPDATE ON pay.payment_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_status();
```

## Migraciones

Usar Prisma para migraciones:

```bash
pnpm prisma migrate dev --name add_invoice_status_trigger
```

O SQL directo en `supabase/migrations/`:

```sql
-- supabase/migrations/20251110000000_add_invoice_status_trigger.sql
-- ... código SQL ...
```

