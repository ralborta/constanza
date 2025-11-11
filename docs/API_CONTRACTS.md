# Contratos de API

## Autenticación

Todas las requests (excepto webhooks) requieren JWT en header:

```
Authorization: Bearer <jwt_token>
```

El JWT contiene:
```json
{
  "tenant_id": "uuid",
  "user_id": "uuid", // o "customer_id" si es cliente
  "perfil": "ADM" | "OPERADOR_1" | "OPERADOR_2" | "CLIENTE",
  "customer_id": "uuid", // Solo presente si perfil = "CLIENTE"
  "exp": 1234567890
}
```

**Nota**: Si el perfil es `CLIENTE`, el JWT incluye `customer_id` para aplicar RLS y mostrar solo los datos del cliente.

## Autenticación

### POST `/auth/login`

Autenticación para empleados/operadores.

**Request Body**:
```json
{
  "email": "operador@empresa.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "operador@empresa.com",
    "perfil": "OPERADOR_1"
  }
}
```

### POST `/auth/customer/login`

Autenticación para clientes.

**Request Body**:
```json
{
  "email": "cliente@empresa.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "token": "jwt_token",
  "customer": {
    "id": "uuid",
    "razon_social": "Cliente SA",
    "email": "cliente@empresa.com",
    "perfil": "CLIENTE"
  }
}
```

**Nota**: Solo clientes con `acceso_habilitado = TRUE` y `password_hash` definido pueden autenticarse.

## REST API (api-gateway)

### Base URL
```
https://api.constanza.com/v1
```

### Ingesta

#### POST `/ingest/invoices`

Ingesta de facturas (CSV o JSON).

**Request Body (JSON)**:
```json
{
  "invoices": [
    {
      "customer_codigo_unico": "CLI-001", // O customer_cuit para lookup
      "customer_cuit": "20123456789", // Opcional: si se provee, se busca/crea el CUIT
      "numero": "FAC-001",
      "monto": 120000,
      "fecha_vto": "2025-12-31"
    }
  ]
}
```

**Nota**: Si se provee `customer_codigo_unico`, se usa ese cliente. Si solo se provee `customer_cuit`, se busca el cliente por CUIT (o se crea si no existe). Un cliente puede tener múltiples CUITs.

**Response**:
```json
{
  "ingested": 1,
  "errors": []
}
```

### Secuencias

#### POST `/sequences/run`

Ejecuta secuencias para una cohorte.

**Request Body**:
```json
{
  "cohort": "PRÓX_VENCER" | "VENCIDA" | "PROMESA_HOY",
  "filters": {
    "customer_ids": ["uuid"],
    "invoice_ids": ["uuid"]
  }
}
```

**Response**:
```json
{
  "runs_created": 5,
  "runs": ["uuid1", "uuid2", ...]
}
```

### Envío Manual de Mensajes

#### POST `/notify/send`

Envía un mensaje manual (WhatsApp, Email o Llamada) a un cliente.

**Request Body**:
```json
{
  "invoice_id": "uuid", // Opcional: si está relacionado con una factura
  "customer_id": "uuid",
  "channel": "WHATSAPP" | "EMAIL" | "VOICE",
  "template_id": "uuid", // Opcional: template predefinido
  "message": "Texto personalizado del mensaje", // Si no usa template
  "subject": "Asunto del email", // Solo para EMAIL
  "variables": {
    "nombre_cliente": "Acme Inc",
    "monto": 120000,
    "fecha_vto": "2025-12-31"
  },
  "media_url": "https://...", // Opcional: para WhatsApp (imagen/PDF)
  "voice_note_url": "https://...", // Opcional: para WhatsApp (mensaje de voz/audio)
  "scheduled_at": "2025-11-15T10:00:00Z" // Opcional: programar envío
}
```

**Nota**: 
- Para WhatsApp: se pueden enviar mensajes de voz (voice notes) usando `voice_note_url` o generando audio con TTS de ElevenLabs
- Todas las interacciones (WhatsApp, llamadas) se muestran en el timeline de la factura en pantalla

**Response**:
```json
{
  "event_id": "uuid",
  "status": "SCHEDULED" | "SENT",
  "scheduled_at": "2025-11-15T10:00:00Z"
}
```

**Nota**: 
- Si `channel = VOICE`, se programa una llamada telefónica
- Si `channel = WHATSAPP`, se envía vía builderbot.cloud
- Si `channel = EMAIL`, se envía vía SMTP
- El evento se registra en `contact.events` con `direction: OUTBOUND`

#### POST `/notify/batch`

Envía mensajes en batch desde un archivo (CSV o JSON). Los mensajes se procesan uno por uno en cola.

**Request (multipart/form-data)**:
```
file: [archivo.csv o archivo.json]
channel: WHATSAPP | EMAIL | VOICE
template_id: uuid (opcional)
agent_id: uuid (opcional, solo para VOICE - ElevenLabs Agent ID)
```

**Nota**: Las llamadas telefónicas (VOICE) también se pueden enviar en batch. Se procesan una por una usando el agente de ElevenLabs a través de Twilio.

**Formato CSV** (ejemplo):
```csv
customer_id,invoice_id,message,variables_json,telefono
uuid1,uuid-inv1,"Recordatorio de pago",{"monto":120000},"+5491123456789"
uuid2,uuid-inv2,"Recordatorio de pago",{"monto":50000},"+5491198765432"
```

**Nota**: Para `channel = VOICE`, el campo `telefono` es requerido. El `message` puede ser el script de la llamada o referencia a un template de voz.

**Formato JSON** (ejemplo):
```json
{
  "messages": [
    {
      "customer_id": "uuid1",
      "invoice_id": "uuid-inv1",
      "message": "Recordatorio de pago",
      "variables": {"monto": 120000}
    }
  ]
}
```

**Response**:
```json
{
  "batch_id": "uuid",
  "total_messages": 100,
  "status": "PROCESSING",
  "processed": 0,
  "failed": 0
}
```

**Procesamiento**:
1. Se valida el archivo y se crea un `batch_job`
2. Se enquean todos los mensajes en BullMQ (cola `notify.send`)
3. El `notifier` procesa uno por uno:
   - Rate limiting: máximo X mensajes/minuto (configurable)
   - Para WhatsApp: usa builderbot.cloud API
   - Para Email: usa SMTP
   - Para Voz: programa llamadas telefónicas vía ElevenLabs Agent + Twilio
4. Se actualiza el progreso del batch en tiempo real
5. Cada mensaje/llamada se registra en `contact.events`

**Nota importante**: Las llamadas telefónicas también se pueden enviar en batch. Se procesan una por una usando el agente de ElevenLabs a través de Twilio, con rate limiting para no saturar el sistema.

**Tracking del batch**:
- `GET /notify/batch/{batch_id}` - Estado del batch
- `GET /notify/batch/{batch_id}/events` - Eventos generados

### E-cheques

#### GET `/echeqs`

Lista e-cheques pendientes.

**Query Params**:
- `status_operativo`: `RECIBIDO` | `ACEPTADO` | `RECHAZADO`
- `status_liquidacion`: `PENDIENTE` | `ACREDITADO` | `RECHAZADO`
- `customer_id`: UUID

**Response**:
```json
{
  "echeqs": [
    {
      "id": "uuid",
      "customer": {
        "id": "uuid",
        "razon_social": "Cliente SA"
      },
      "number": "123456",
      "amount": 50000,
      "status_operativo": "RECIBIDO",
      "status_liquidacion": "PENDIENTE",
      "created_at": "2025-11-10T12:00:00Z"
    }
  ]
}
```

#### POST `/echeqs/{id}/accept`

Acepta un e-cheque y crea aplicaciones de pago.

**Request Body**:
```json
{
  "applications": [
    {
      "invoice_id": "uuid",
      "amount": 50000
    }
  ],
  "comment": "Aceptado por usuario"
}
```

**Response**:
```json
{
  "echeq_id": "uuid",
  "payment_id": "uuid",
  "applications": ["uuid1", "uuid2"]
}
```

#### POST `/echeqs/{id}/reject`

Rechaza un e-cheque.

**Request Body**:
```json
{
  "reason": "Cliente no autorizado"
}
```

### KPIs

#### GET `/kpi/summary`

Resumen de KPIs principales.

**Response**:
```json
{
  "dso": 45.2,
  "cash_in_7d": 1200000,
  "cash_in_30d": 5000000,
  "promises_today": 3,
  "promises_broken": 1,
  "auto_applied_pct": 0.75,
  "channel_health": {
    "whatsapp": {
      "delivery_rate": 0.95,
      "read_rate": 0.80
    },
    "email": {
      "delivery_rate": 0.98,
      "open_rate": 0.45
    }
  }
}
```

### Facturas

#### GET `/invoices`

Lista facturas con filtros.

**Query Params**:
- `state`: `ABIERTA` | `PARCIAL` | `SALDADA`
- `customer_id`: UUID
- `fecha_vto_from`: YYYY-MM-DD
- `fecha_vto_to`: YYYY-MM-DD

**Response**:
```json
{
  "invoices": [
    {
      "id": "uuid",
      "customer": {
        "id": "uuid",
        "razon_social": "Cliente SA"
      },
      "numero": "FAC-001",
      "monto": 120000,
      "monto_aplicado": 0,
      "fecha_vto": "2025-12-31",
      "estado": "ABIERTA",
      "applications": [
        {
          "id": "uuid",
          "amount": 50000,
          "is_authoritative": true,
          "applied_at": "2025-11-10T12:00:00Z"
        }
      ],
      "timeline": [
        {
          "type": "CONTACT",
          "channel": "EMAIL",
          "ts": "2025-11-05T10:00:00Z"
        }
      ]
    }
  ]
}
```

### Promesas

#### GET `/promises`

Lista promesas de pago.

**Query Params**:
- `status`: `PENDIENTE` | `CUMPLIDA` | `INCUMPLIDA`
- `invoice_id`: UUID

**Response**:
```json
{
  "promises": [
    {
      "id": "uuid",
      "invoice_id": "uuid",
      "amount": 120000,
      "due_date": "2025-11-15",
      "channel": "WHATSAPP",
      "status": "PENDIENTE",
      "created_at": "2025-11-10T12:00:00Z"
    }
  ]
}
```

### Decisiones

#### GET `/decisions`

Lista items de decisión.

**Query Params**:
- `status`: `OPEN` | `RESOLVED`
- `severity`: `LOW` | `MEDIUM` | `HIGH`

**Response**:
```json
{
  "decisions": [
    {
      "id": "uuid",
      "type": "DESAPLICAR",
      "severity": "HIGH",
      "status": "OPEN",
      "sla_at": "2025-11-11T12:00:00Z",
      "data": {
        "payment_id": "uuid",
        "application_id": "uuid",
        "reason": "Aplicación incorrecta"
      },
      "created_at": "2025-11-10T12:00:00Z"
    }
  ]
}
```

#### POST `/decisions/{id}/actions/{action}`

Ejecuta una acción sobre un item de decisión.

**Actions**: `approve`, `reapply`, `credit_note`, `escalate`

**Request Body**:
```json
{
  "comment": "Aprobado después de revisar con cliente"
}
```

**Response**:
```json
{
  "decision_id": "uuid",
  "action": "approve",
  "resolved_at": "2025-11-10T13:00:00Z"
}
```

### Export ERP

#### GET `/exports/erp`

Exporta datos para ERP.

**Query Params**:
- `date`: YYYY-MM-DD
- `format`: `CSV` | `JSON`

**Response**: Archivo CSV/JSON con aplicaciones y liquidaciones del día.

## Webhooks Entrantes

### Cucuru

#### POST `/wh/cucuru/payment.applied`

Webhook de imputación autoritativa de Cucuru (transferencias).

**Headers**:
```
X-Cucuru-Signature: <hmac_sha256>
```

**Request Body**:
```json
{
  "payment_id": "ext_123",
  "applied_at": "2025-11-10T12:34:56Z",
  "applications": [
    {
      "invoice_id": "INV-1001",
      "amount": 120000
    }
  ]
}
```

**Acción**:
- Se persiste en `pay.payments` y `pay.payment_applications` con `is_authoritative=true`
- Se muestra en el timeline de facturas como "Transferencia de Cucuru" con fecha, monto y aplicaciones

**Response**: `200 OK` (idempotente)

#### POST `/wh/cucuru/payment.settled`

Webhook de acreditación/liquidación de transferencias de Cucuru.

**Headers**:
```
X-Cucuru-Signature: <hmac_sha256>
```

**Request Body**:
```json
{
  "payment_id": "ext_123",
  "settled_at": "2025-11-12T09:00:00Z",
  "status": "LIQUIDADO"
}
```

**Acción**:
- Se actualiza `pay.payments.status = 'LIQUIDADO'` y `settled_at`
- Se muestra en el timeline de facturas como "Acreditación de Cucuru" con fecha y monto liquidado

**Response**: `200 OK` (idempotente)

### BindX

#### POST `/wh/bindx/echeq.status_changed`

Webhook de cambio de estado de e-cheque.

**Headers**:
```
X-BindX-Signature: <hmac_sha256>
```

**Request Body**:
```json
{
  "echeq_id": "B123",
  "status": "ACREDITADO" | "RECHAZADO",
  "settled_at": "2025-11-12T09:00:00Z"
}
```

**Response**: `200 OK`

### Builderbot (WhatsApp)

#### POST `/wh/wa/incoming`

Webhook de mensajes entrantes de WhatsApp.

**Request Body**:
```json
{
  "from": "5491123456789",
  "message": {
    "type": "text" | "VOICE_NOTE" | "image" | "document",
    "text": "Pago mañana", // Solo si type = "text"
    "media_url": "https://...", // URL del audio si type = "VOICE_NOTE"
    "transcription": "Pago mañana" // Transcripción del audio (si está disponible)
  },
  "timestamp": "2025-11-10T12:00:00Z"
}
```

**Procesamiento**:
- Si `type = "VOICE_NOTE"`: Se procesa el audio (transcripción si está disponible, o se envía a NLP service)
- Si `type = "text"`: Se procesa directamente con NLP service
- Se crea registro en `contact.events` con `direction: INBOUND`
- Se muestra en el timeline de la factura en pantalla

**Response**: `200 OK`

## Eventos Internos (Zod Schemas)

Ver `packages/events/src/` para schemas completos.

### Ejemplo: `payment.applied_authoritative`

```typescript
{
  tenantId: string (UUID),
  paymentId: string (UUID),
  appliedAt: string (ISO datetime),
  applications: [
    {
      invoiceId: string (UUID),
      amount: number (int, positive)
    }
  ],
  provider: "cucuru"
}
```

## Códigos de Error

- `400`: Bad Request (validación fallida)
- `401`: Unauthorized (JWT inválido o expirado)
- `403`: Forbidden (sin permisos)
- `404`: Not Found
- `409`: Conflict (idempotencia, duplicado)
- `429`: Too Many Requests (rate limit)
- `500`: Internal Server Error
- `502`: Bad Gateway (servicio externo falló)
- `503`: Service Unavailable (mantenimiento)

