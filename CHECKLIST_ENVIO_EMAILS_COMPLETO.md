# ✅ Checklist Completo para Envío de Emails

## 🔍 Estado Actual

Veo un **error 503** en `/v1/notify/batch`, lo que significa que el `api-gateway` **no puede conectarse al `notifier`**.

## ✅ Lo que SÍ Necesitas Configurar (en orden de prioridad)

### 1. `NOTIFIER_URL` en `api-gateway` (CRÍTICO - Sin esto nada funciona)

**Railway Dashboard** → `@constanza/api-gateway` → **Variables**

**Si NO existe**, agrega:
```
NOTIFIER_URL=https://notifier-production.up.railway.app
```
(O el dominio público que Railway asignó al servicio `notifier`)

**Sin esto**, el error 503 seguirá apareciendo.

---

### 2. Verificar que `notifier` Esté Corriendo

**Railway Dashboard** → `@constanza/notifier` → **Logs**

Deberías ver:
```
🚀 Notifier running on http://0.0.0.0:3001
✅ Redis connected
✅ Database connected
```

**Si NO está corriendo** → Redeploy el `notifier`

---

### 3. Variables SMTP en `notifier` (Para que pueda enviar emails)

**Railway Dashboard** → `@constanza/notifier` → **Variables**

Agrega estas variables:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password_de_gmail
SMTP_FROM_NAME=Constanza
SMTP_FROM_EMAIL=tu_email@gmail.com
```

**Sin estas variables**, el `notifier` podrá recibir los mensajes pero **fallará al intentar enviarlos por email**.

---

### 4. Variables de Base de Datos y Redis

**Railway Dashboard** → `@constanza/notifier` → **Variables**

Debe existir:
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

**Si faltan**, el `notifier` no podrá correr.

---

## 🎯 Flujo Completo de Envío de Email

```
1. Frontend → POST /v1/notify/batch
   ↓ (requiere: NEXT_PUBLIC_API_URL configurada en Vercel)
   
2. API Gateway → Valida y crea batchJob en DB
   ↓ (requiere: DATABASE_URL configurada)
   
3. API Gateway → POST a NOTIFIER_URL/notify/send
   ↓ (requiere: NOTIFIER_URL configurada) ← ESTO FALTA AHORA
   
4. Notifier → Recibe mensaje y lo agrega a cola (BullMQ)
   ↓ (requiere: REDIS_URL configurada)
   
5. Notifier Worker → Procesa mensaje de la cola
   ↓ (requiere: REDIS_URL configurada)
   
6. Notifier → renderEmailTemplate() → Resuelve variables
   ↓ (requiere: DATABASE_URL para obtener datos de cliente/factura)
   
7. Notifier → sendEmail() → Envía por SMTP
   ↓ (requiere: SMTP_HOST, SMTP_USER, SMTP_PASS) ← ESTO TAMBIÉN FALTA
   
8. Email enviado ✅
```

## ⚠️ Lo que Pasará Si Solo Configuras `NOTIFIER_URL` (Sin SMTP)

1. ✅ El error 503 desaparecerá
2. ✅ El mensaje llegará al `notifier`
3. ✅ Se agregará a la cola (BullMQ)
4. ✅ El worker intentará procesarlo
5. ❌ **Fallará al intentar enviar** porque faltan variables SMTP
6. ❌ Verás error en logs del `notifier`: `ERROR_SMTP_CONFIG_MISSING`

## ✅ Lo que Pasará Si Configuras TODO

1. ✅ El error 503 desaparecerá
2. ✅ El mensaje llegará al `notifier`
3. ✅ Se agregará a la cola
4. ✅ El worker procesará el mensaje
5. ✅ Se renderizará el template con variables
6. ✅ Se enviará el email por SMTP
7. ✅ Se registrará en `contact.events` con `status: 'SENT'`
8. ✅ Verás "Mensajes en cola" en el frontend

## 📋 Checklist Final

Para que el envío de emails funcione **completamente**, necesitas:

### En `api-gateway`:
- [ ] `DATABASE_URL` configurada
- [ ] `NOTIFIER_URL` configurada ← **CRÍTICO**

### En `notifier`:
- [ ] `DATABASE_URL` configurada
- [ ] `REDIS_URL` configurada
- [ ] `SMTP_HOST` configurada ← **Para enviar emails**
- [ ] `SMTP_PORT` configurada ← **Para enviar emails**
- [ ] `SMTP_USER` configurada ← **Para enviar emails**
- [ ] `SMTP_PASS` configurada ← **Para enviar emails**
- [ ] `SMTP_FROM_NAME` configurada (opcional)
- [ ] `SMTP_FROM_EMAIL` configurada (opcional)

### En Vercel (frontend):
- [ ] `NEXT_PUBLIC_API_URL` configurada

## 🎯 Respuesta Directa a Tu Pregunta

**¿Si configuramos el email funcionará?**

**Sí, PERO necesitas configurar:**

1. ✅ **`NOTIFIER_URL` en `api-gateway`** (para que el error 503 desaparezca)
2. ✅ **Variables SMTP en `notifier`** (para que pueda enviar emails)
3. ✅ **Verificar que `notifier` esté corriendo**

**Si solo configuras `NOTIFIER_URL` sin SMTP:**
- El error 503 desaparecerá
- El mensaje llegará al `notifier`
- Pero fallará al intentar enviar el email (verás error en logs)

**Si configuras TODO:**
- ✅ Funcionará completamente
- ✅ Los emails se enviarán correctamente

---

## 🚀 Acción Inmediata

**Configura en este orden:**

1. **`NOTIFIER_URL` en `api-gateway`** (resuelve el 503)
2. **Variables SMTP en `notifier`** (permite enviar emails)
3. **Redeploy ambos servicios**
4. **Prueba envío de email**

**Con ambas cosas configuradas, el envío de emails funcionará al 100%.**




