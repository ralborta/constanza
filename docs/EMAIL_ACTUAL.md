# Cómo trabajamos con el email actualmente

Descripción del flujo de email en Constanza: envío saliente (notificaciones) y recepción entrante (respuestas de clientes).

---

## 1. Resumen rápido

- **Salida (envío):** La web llama al API Gateway → API Gateway llama al Notifier → Notifier encola en BullMQ y un worker envía por **SMTP directo** (Nodemailer: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`). Se usan templates con variables resueltas desde la BD.
- **Entrada (recepción):** Un agente externo (p. ej. **OpenAI Agent Builder**) recibe el email, identifica cliente/factura y llama al webhook del Notifier `POST /wh/email/incoming`. El Notifier persiste el mensaje en `contact.events`, correlaciona factura si hace falta y extrae promesas/callbacks del texto.

No hay polling de bandeja: la entrada depende 100% del webhook que invoque el agente externo.

---

## 2. Envío de emails (saliente)

### Flujo

```
Web (apps/web)
  → POST /v1/notify/batch (API Gateway, auth JWT)
  → API Gateway valida clientes/facturas, crea BatchJob
  → Por cada cliente: POST {NOTIFIER_URL}/notify/send
  → Notifier: notifyQueue.add('send', { channel: 'EMAIL', ... })
  → Worker BullMQ: renderEmailTemplate() → sendEmail() (SendGrid)
  → Email enviado al customer.email
```

### Dónde está el código

- **API Gateway** `apps/api-gateway/src/routes/notify.ts`
  - `POST /notify/batch`: recibe `customerIds`, `channel: 'EMAIL'`, `message: { text, subject }`, `invoiceIdsByCustomer`, `variables`. Valida que los clientes tengan `email`, crea un `BatchJob` y por cada cliente hace `POST ${NOTIFIER_URL}/notify/send`.
- **Notifier** `apps/notifier/src/index.ts`
  - `POST /notify/send`: recibe un solo mensaje y lo encola en la cola `notify.send`.
  - Worker: si `channel === 'EMAIL'`, llama a `renderEmailTemplate()` (templates/email) y luego `sendEmail()` (channels/email).
- **Templates** `apps/notifier/src/templates/email.ts`
  - `resolveVariablesFromDB(customerId, invoiceId, tenantId)`: rellena `nombre_cliente`, `monto`, `numero_factura`, `fecha_vencimiento`, `fecha_actual`, etc. desde la BD.
  - `replaceVariables(template, variables)`: reemplaza `{variable}` en el texto y en el subject.
  - `renderEmailTemplate()`: devuelve `{ html, text, subject }` con el HTML base (header Constanza, contenido, footer).
- **Canal de envío** `apps/notifier/src/channels/email.ts`
  - Usa **SMTP directo** (Nodemailer) con `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (opcional `SMTP_SECURE` para puerto 465).
  - Remitente: `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME` o `SMTP_USER`, nombre por defecto "Constanza".
  - Errores tipados: `EmailError` con códigos (`SMTP_CONFIG_MISSING`, `SMTP_AUTH_FAILED`, etc.).

### Variables de entorno (Notifier)

- Para envío: `SENDGRID_API_KEY` o `SMTP_PASS`; `SMTP_FROM_EMAIL` o `SMTP_USER`; opcional `SMTP_FROM_NAME`.
- Detalle en `CONFIGURAR_ENVIO_EMAILS.md`.

### Registro del envío

El worker crea/actualiza eventos en `contact.events` (y actualiza `BatchJob`); si el envío falla, se registra con `status: 'FAILED'` y `errorReason`.

---

## 3. Recepción de emails (entrante)

### Flujo

```
Cliente responde por email
  → El email llega al sistema del agente (ej. OpenAI Agent Builder)
  → El agente identifica cliente (customerId), opcionalmente factura (invoiceId), y extrae texto/datos
  → POST {NOTIFIER_URL}/wh/email/incoming con payload tipado
  → Notifier: valida customer, resuelve/correlaciona invoiceId, crea ContactEvent (EMAIL, INBOUND)
  → Opcional: processMessageForCallbacks() para extraer promesas y callbacks del texto
  → Responde 200 con eventId, customerId, invoiceId
```

No hay IMAP ni polling de correo dentro de Constanza: quien recibe el email es siempre un servicio externo que luego llama al webhook.

### Endpoint

- **POST** `{NOTIFIER_URL}/wh/email/incoming`
- Sin autenticación en el código actual (el que llama es el agente; en producción conviene proteger el endpoint).

### Payload esperado (schema Zod en `webhooks.ts`)

- `customerId` (UUID): identificado por el agente.
- `invoiceId` (UUID, opcional): factura correlacionada por el agente.
- `messageText`: cuerpo del email.
- `subject`, `from` (email).
- `messageId`, `inReplyTo` (opcionales, para hilos).
- `attachments` (opcional): array con `filename`, `url`, `contentType`, `size`.
- `extractedData` (opcional): `intent`, `amount`, `date`, `facturaNumero`, `sentiment` (lo que haya extraído el agente).
- `summary`, `agentResponse` (opcional): resumen o respuesta generada por el agente.
- `timestamp` (opcional, ISO).

### Qué hace el Notifier con el payload

1. Valida el body con `openaiEmailWebhookSchema`.
2. Comprueba que exista el cliente (`customerId`, `activo: true`).
3. Si viene `invoiceId`, verifica que la factura sea del cliente y del tenant; si no, la deja en `null`.
4. Si no hay `invoiceId`, intenta correlacionar con **Correlation Engine**: `correlateInvoice(customerId, tenantId, messageText, { inReplyTo, extractedData })`.
5. Arma un `payload` con `from`, `subject`, `messageId`, `inReplyTo`, `attachments`, `extractedData`, `summary`, `agentResponse`.
6. Crea un **ContactEvent**:
   - `channel: 'EMAIL'`, `direction: 'INBOUND'`, `messageText`, `payload`, `externalMessageId: messageId`, `status: 'DELIVERED'`.
7. Si hay texto suficiente (`messageText` o `summary` con longitud ≥ 10), llama a **processMessageForCallbacks** con `source: 'EMAIL'` para crear promesas y callbacks extraídos del mensaje (IA/reglas).
8. Responde `{ status: 'ok', eventId, customerId, invoiceId }`.

Todo esto está en `apps/notifier/src/routes/webhooks.ts` en la ruta `POST /email/incoming`.

---

## 4. Unificado inbound (alternativa para email)

Además del webhook específico de email, existe un endpoint **unificado** para cualquier canal:

- **POST** `{NOTIFIER_URL}/wh/inbound`
- Body con `channel: 'EMAIL' | 'WHATSAPP' | 'VOICE'`, `customerId`, `messageText`, `from`, y opcionalmente `invoiceId`, `metadata` (messageId, inReplyTo, subject, attachments), `extractedData`, `summary`, `agentResponse`, `timestamp`.

La lógica es equivalente: validar cliente, correlacionar factura, crear ContactEvent y opcionalmente procesar callbacks. La diferencia es el schema y que en unificado el canal va en el body. El flujo de email “oficial” documentado arriba es **POST /wh/email/incoming** con el schema de OpenAI Agent Builder.

---

## 5. Resumen de archivos

| Qué | Dónde |
|-----|--------|
| Envío: API batch | `apps/api-gateway/src/routes/notify.ts` (POST /notify/batch) |
| Envío: cola y worker | `apps/notifier/src/index.ts` (POST /notify/send, Worker BullMQ) |
| Templates y variables | `apps/notifier/src/templates/email.ts` |
| Envío por SendGrid | `apps/notifier/src/channels/email.ts` |
| Recepción: webhook email | `apps/notifier/src/routes/webhooks.ts` (POST /wh/email/incoming) |
| Recepción: unificado | `apps/notifier/src/routes/webhooks.ts` (POST /wh/inbound) |
| Callbacks/promesas desde mensaje | `apps/notifier/src/services/callbacks-from-message.ts` (processMessageForCallbacks) |
| Config envío (env, Gmail, etc.) | `CONFIGURAR_ENVIO_EMAILS.md` |

---

## 6. Notas

- **Email del cliente:** Para envío, el cliente debe tener `email` en la BD; el API Gateway lo valida en `/notify/batch` cuando `channel === 'EMAIL'`.
- **Correlation Engine:** En entrante, si el agente no envía `invoiceId`, el Notifier intenta correlacionar factura por texto, `inReplyTo` y `extractedData` (mismo motor que para otros canales).
- **Promesas y callbacks:** Se extraen del texto del email entrante con la misma lógica que para WhatsApp (`processMessageForCallbacks`), solo que indicando canal `'EMAIL'`.

Si más adelante querés que el mismo flujo de “contexto dinámico de cobranza” (IA que responde con contexto de deudas) se use también para email, se podría reutilizar la misma lógica después de crear el ContactEvent en `/wh/email/incoming`, leyendo políticas desde la BD como en WhatsApp y enviando la respuesta por el canal que use el agente de email (o dejando que el agente use `agentResponse` que ya puede venir en el webhook).
