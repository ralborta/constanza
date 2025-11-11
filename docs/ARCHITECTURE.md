# Arquitectura del Sistema Constanza

## Visión General

Constanza es un sistema de cobranzas B2B omnicanal diseñado con arquitectura de microservicios, separación por dominios y comunicación basada en eventos.

## Principios de Diseño

1. **Separación por Dominios**: Cada microservicio maneja un dominio de negocio específico
2. **Event-Driven**: Comunicación asíncrona mediante eventos y colas
3. **Multi-tenant**: Aislamiento de datos mediante RLS y JWT
4. **Idempotencia**: Todas las operaciones críticas son idempotentes
5. **Observabilidad**: Logs estructurados y métricas en todos los servicios

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel (Frontend)                     │
│                    Next.js 14 + shadcn/ui                    │
└───────────────────────┬───────────────────────────────────────┘
                        │ HTTPS
                        │
┌───────────────────────▼───────────────────────────────────────┐
│                    API Gateway                                │
│              (Auth, Rate Limit, Validation)                  │
└───────┬───────────────┬───────────────┬───────────────────────┘
        │               │               │
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│  Contact     │ │  Notifier   │ │  Decision   │
│ Orchestrator │ │             │ │   Queue     │
└──────┬───────┘ └──────┬──────┘ └──────┬──────┘
       │                │                │
       │                │                │
┌──────▼────────────────▼────────────────▼──────┐
│              Redis (BullMQ)                    │
│         Colas + Pub/Sub                        │
└────────────────────────────────────────────────┘
       │                │                │
       │                │                │
┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│  Rail       │ │  Rail       │ │ Reconciler  │
│  Cucuru     │ │  BindX      │ │             │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
            ┌───────────▼───────────┐
            │   Supabase Postgres   │
            │   (RLS Enabled)       │
            └───────────────────────┘
```

## Flujos Principales

### 1. Flujo de Cobranza Omnicanal

```
Invoice (VENCIDA)
    │
    ▼
Contact Orchestrator
    │
    ├─→ Email (T-3, T-1)
    │   └─→ Notifier → SMTP
    │
    ├─→ WhatsApp (D0, D+3)
    │   └─→ Notifier → builderbot.cloud
    │
    └─→ Voice Call (si propensión)
        └─→ Call Orchestrator → ElevenLabs + Twilio
```

### 2. Flujo de Imputación de Pagos ✅ **Implementado**

```
Cucuru Webhook
    │
    ▼
Rail Cucuru (✅ Desarrollado)
    │
    ├─→ Validar HMAC
    ├─→ Idempotencia (Redis)
    ├─→ Persistir (is_authoritative=true)
    └─→ Emitir evento: payment.applied_authoritative
        │
        ▼
    Reconciler (skip si authoritative)
    Decision Queue (si conflicto)
```

### 3. Flujo de E-cheques

```
BindX API
    │
    ▼
Rail BindX
    │
    ├─→ Listar e-cheques pendientes
    ├─→ UI: Aceptar/Rechazar
    │   │
    │   └─→ Aceptar → Crear payment_applications (PEND_LIQ)
    │
    └─→ Webhook: Liquidación
        │
        ├─→ ACREDITADO → Actualizar status
        └─→ RECHAZADO → Abrir decision_item
```

### 4. Flujo de Reconciliación

```
Reconciler
    │
    ├─→ Match exacto (invoice_id + amount)
    ├─→ Match parcial (amount parcial)
    ├─→ Match 1↔N (1 pago → N facturas)
    ├─→ Match fuzzy (tolerancias)
    │
    └─→ Si no match → Decision Queue
```

## Comunicación Entre Servicios

### Síncrona (HTTP REST)
- API Gateway → Microservicios internos
- Web → API Gateway
- Webhooks externos → Rails (Cucuru, BindX, builderbot)

### Asíncrona (Eventos + Colas)
- **BullMQ**: Tareas de larga duración (notificaciones, reconciliación)
- **Redis Pub/Sub**: Eventos en tiempo real (payment.applied, promise.created)
- **Eventos Zod**: Contratos tipados en `packages/events`

## Patrones de Diseño

### 1. API Gateway Pattern
- Punto único de entrada
- Autenticación centralizada
- Rate limiting
- Validación de requests

### 2. Event Sourcing (Parcial)
- `audit.event_log` registra todos los eventos importantes
- Permite reconstruir estado histórico

### 3. Saga Pattern (Reconciliación)
- Reconciliación como proceso distribuido
- Compensación si falla algún paso

### 4. Circuit Breaker (Webhooks)
- Protección contra fallos en servicios externos
- Reintentos con backoff exponencial

## Escalabilidad

### Horizontal
- Microservicios stateless (excepto colas)
- Redis compartido para colas
- Supabase Postgres con connection pooling

### Vertical
- Railway permite escalar recursos por servicio
- Vercel escala automáticamente el frontend

## Resiliencia

### Retry Strategy
- Webhooks: 3 reintentos con backoff exponencial
- Notificaciones: 5 reintentos
- Reconciliación: Reintento manual desde UI

### Idempotencia
- Todos los webhooks verifican `event_id` en Redis
- Operaciones críticas usan `external_ref` único

### Monitoreo
- Health checks en todos los servicios (`/health`)
- Logs estructurados (Pino JSON)
- Alertas en Railway/Vercel

## Seguridad

### Autenticación
- JWT con `tenant_id` y `perfil`
- Validación en API Gateway
- Propagación a microservicios via headers

### Autorización
- RLS en Supabase (tenant isolation)
- Perfiles: `ADM`, `OPERADOR_1`, `OPERADOR_2`, `CLIENTE`
- Políticas por tabla y perfil
- Clientes solo ven sus propios datos (RLS con `customer_id`)

### Webhooks
- HMAC verification (Cucuru, BindX, builderbot)
- Rate limiting por IP
- Idempotencia por `event_id`

## Observabilidad

### Logs
- Formato JSON (Pino)
- Niveles: `error`, `warn`, `info`, `debug`
- Contexto: `tenant_id`, `user_id`, `request_id`

### Métricas (Futuro)
- OpenTelemetry para traces
- Prometheus para métricas
- Grafana para dashboards

### Alertas
- Railway: CPU, memoria, errores
- Vercel: Build failures, function timeouts
- Custom: Tasa de fallos webhooks > 2%

