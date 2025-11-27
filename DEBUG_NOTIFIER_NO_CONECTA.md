# 🔍 Debug: `notifier` No Conecta

## ⚠️ Error Actual

```
"error": "El servicio de notificaciones no está disponible",
"details": "No se pudo conectar a https://constanzanotifier-production.up.railway.app"
```

**Esto significa que el `api-gateway` NO puede conectarse al `notifier`.**

---

## ✅ Verificaciones Paso a Paso

### Paso 1: Verificar que el `notifier` Esté Corriendo

**Railway Dashboard** → `@constanza/notifier` → **Logs**

**Deberías ver:**
```
🚀 Notifier running on http://0.0.0.0:3001
✅ Redis connected
✅ Database connected
📬 Worker started, processing notifications...
```

**Si NO ves estos logs:**
- El servicio está caído
- **Solución:** Redeploy el `notifier`

**Si ves errores de Redis:**
- Falta `REDIS_URL` configurada
- **Solución:** Configurar `REDIS_URL` en Variables

---

### Paso 2: Verificar Health Check del `notifier`

**Desde tu máquina**, ejecuta:

```bash
curl https://constanzanotifier-production.up.railway.app/health
```

**Debería responder:**
```json
{
  "status": "ok",
  "service": "notifier",
  "queue": { ... }
}
```

**Si NO responde:**
- El servicio está caído o el dominio está mal
- **Solución:** Verificar dominio en Railway → Settings → Networking

**Si responde con error:**
- El servicio está corriendo pero tiene problemas internos
- **Solución:** Revisar logs del `notifier`

---

### Paso 3: Verificar Variables del `notifier`

**Railway Dashboard** → `@constanza/notifier` → **Variables**

**Debe tener:**
- ✅ `DATABASE_URL` (para conectar a la base de datos)
- ✅ `REDIS_URL` (para la cola de mensajes) ← **CRÍTICO**
- ✅ `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (para enviar emails)

**Si falta `REDIS_URL`:**
- El servicio puede estar corriendo pero fallando internamente
- **Solución:** Agregar `REDIS_URL` y redeploy

---

### Paso 4: Verificar Logs del `api-gateway`

**Railway Dashboard** → `@constanza/api-gateway` → **Logs**

**Cuando intentas enviar un mensaje**, busca errores que digan:
- `Error queuing message`
- `No se pudo encolar ningún mensaje`
- `NOTIFIER_URL`
- `ECONNREFUSED` o `ETIMEDOUT`

**Copia aquí los errores que veas.**

---

### Paso 5: Verificar `NOTIFIER_URL` en `api-gateway`

**Railway Dashboard** → `@constanza/api-gateway` → **Variables**

**Debe ser:**
```
NOTIFIER_URL=https://constanzanotifier-production.up.railway.app
```

**Verifica:**
- ✅ Tiene `https://` al inicio
- ✅ El dominio coincide con el del `notifier`
- ✅ No tiene puerto (`:3001` o similar)

---

## 🎯 Posibles Causas

### Causa 1: `notifier` No Está Corriendo

**Síntomas:**
- Health check no responde
- Logs del `notifier` están vacíos o muestran errores de inicio

**Solución:**
- Redeploy el `notifier`
- Verificar que no haya errores en los logs

---

### Causa 2: `REDIS_URL` No Está Configurada

**Síntomas:**
- Logs del `notifier` muestran errores de Redis
- `[ioredis] Unhandled error event: Error: connect ETIMEDOUT`

**Solución:**
- Configurar `REDIS_URL` en `notifier` → Variables
- Redeploy el `notifier`

---

### Causa 3: `notifier` Está Corriendo Pero No Responde

**Síntomas:**
- Health check responde pero `/notify/send` falla
- Logs muestran errores internos

**Solución:**
- Revisar logs del `notifier` para ver errores específicos
- Verificar que todas las variables estén configuradas

---

### Causa 4: Problema de Red Entre Servicios

**Síntomas:**
- Health check no responde desde fuera
- Pero el servicio está corriendo según Railway

**Solución:**
- Verificar dominio público en Railway → Settings → Networking
- Verificar que el servicio tenga networking público habilitado

---

## 🚀 Acción Inmediata

1. **Railway** → `@constanza/notifier` → **Logs**
   - ¿Está corriendo? ¿Hay errores?
   
2. **Prueba health check:**
   ```bash
   curl https://constanzanotifier-production.up.railway.app/health
   ```
   - ¿Responde? ¿Qué dice?

3. **Railway** → `@constanza/notifier` → **Variables**
   - ¿Está `REDIS_URL` configurada?

4. **Railway** → `@constanza/api-gateway` → **Logs**
   - Cuando intentas enviar, ¿qué errores aparecen?

---

## 📋 Checklist de Diagnóstico

- [ ] `notifier` está corriendo (ver logs)
- [ ] Health check responde (`curl`)
- [ ] `REDIS_URL` está configurada en `notifier`
- [ ] `NOTIFIER_URL` está configurada en `api-gateway`
- [ ] No hay errores en logs del `notifier`
- [ ] No hay errores en logs del `api-gateway`

---

**Con esta información podremos identificar exactamente qué está fallando.**




