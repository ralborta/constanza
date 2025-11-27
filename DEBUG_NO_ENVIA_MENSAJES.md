# 🔍 Debug: No Se Envían los Mensajes

## ⚠️ Problema

Los mensajes se encolan pero no se envían.

---

## ✅ Verificaciones Paso a Paso

### Paso 1: Ver Logs del `notifier`

**Railway Dashboard** → `@constanza/notifier` → **Logs**

**Busca estos mensajes:**

**Si ves:**
```
Processing notification
```
- El worker está procesando mensajes ✅

**Si ves:**
```
Notification sent successfully
```
- Los mensajes se están enviando correctamente ✅

**Si ves:**
```
ERROR_SMTP_CONFIG_MISSING
```
- Falta configurar variables SMTP ❌

**Si ves:**
```
ERROR_SMTP_AUTH_FAILED
```
- La contraseña SMTP es incorrecta ❌

**Si ves:**
```
Failed to send email notification
```
- Hay un error al enviar el email ❌

**Si NO ves ningún log:**
- El worker no está procesando mensajes ❌
- Puede ser problema de Redis o el worker no está corriendo

---

### Paso 2: Verificar Variables SMTP

**Railway Dashboard** → `@constanza/notifier` → **Variables**

**Debe tener TODAS estas variables:**

- ✅ `SMTP_HOST` (ej: `smtp.gmail.com`)
- ✅ `SMTP_PORT` (ej: `587`)
- ✅ `SMTP_USER` (tu email de Gmail)
- ✅ `SMTP_PASS` (tu App Password de Gmail)

**Si falta alguna:**
- Los mensajes se encolan pero fallan al enviar

---

### Paso 3: Verificar Estado del Worker

**Railway Dashboard** → `@constanza/notifier` → **Logs**

**Al inicio del servicio deberías ver:**
```
🚀 Notifier running on http://0.0.0.0:3001
✅ Redis connected
✅ Database connected
📬 Worker started, processing notifications...
```

**Si NO ves "Worker started":**
- El worker no está corriendo
- Puede ser problema de Redis

---

### Paso 4: Verificar Cola de Mensajes

**Railway Dashboard** → `@constanza/notifier` → **Logs**

**Cuando intentas enviar un mensaje, busca:**
```
Processing notification
```

**Si NO aparece:**
- Los mensajes no se están agregando a la cola
- O el worker no está procesando la cola

---

### Paso 5: Verificar Health Check

**Desde tu máquina:**
```bash
curl https://constanzanotifier-production.up.railway.app/health
```

**Debería responder:**
```json
{
  "status": "ok",
  "service": "notifier",
  "queue": {
    "waiting": 0,
    "active": 0,
    "completed": 0,
    "failed": 0
  }
}
```

**Si `waiting` o `active` > 0:**
- Hay mensajes en la cola esperando procesarse

**Si `failed` > 0:**
- Hay mensajes que fallaron al enviar

---

## 🎯 Diagnóstico Rápido

### Escenario 1: Mensajes en Cola pero No Se Procesan

**Síntomas:**
- Health check muestra `waiting > 0`
- No hay logs de "Processing notification"

**Causa:** Worker no está corriendo o Redis no está conectado

**Solución:**
- Verificar que Redis esté conectado
- Verificar logs del notifier al inicio

---

### Escenario 2: Mensajes Se Procesan pero Fallan

**Síntomas:**
- Logs muestran "Processing notification"
- Logs muestran errores de SMTP

**Causa:** Configuración SMTP incorrecta

**Solución:**
- Verificar variables SMTP en Railway
- Verificar que la App Password de Gmail sea correcta

---

### Escenario 3: No Hay Logs

**Síntomas:**
- No hay logs de procesamiento
- Health check no responde o muestra errores

**Causa:** Servicio caído o no está corriendo

**Solución:**
- Redeploy el notifier
- Verificar que el servicio esté activo

---

## 🚀 Acción Inmediata

1. **Railway** → `@constanza/notifier` → **Logs**
   - ¿Qué errores ves?
   - ¿Aparece "Processing notification"?
   - ¿Aparece "Notification sent successfully"?

2. **Railway** → `@constanza/notifier` → **Variables**
   - ¿Están todas las variables SMTP configuradas?

3. **Prueba health check:**
   ```bash
   curl https://constanzanotifier-production.up.railway.app/health
   ```
   - ¿Qué muestra la cola?

---

**Copia aquí qué ves en los logs del notifier para diagnosticar el problema específico.**




