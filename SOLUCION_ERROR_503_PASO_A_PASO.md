# 🔧 Solución Error 503 - Paso a Paso

## ⚠️ El Error

```
503 Service Unavailable
El servicio de notificaciones no está disponible
```

Esto significa que el `api-gateway` **no puede conectarse** al `notifier`.

---

## ✅ Verificación Paso a Paso

### Paso 1: Verificar `NOTIFIER_URL` en `api-gateway`

**Railway Dashboard** → `@constanza/api-gateway` → **Variables**

**Debe ser EXACTAMENTE:**
```
https://constanzanotifier-production.up.railway.app
```

**Verifica:**
- ✅ Tiene `https://` al inicio
- ✅ No tiene puerto (`:3001` o similar)
- ✅ El dominio coincide con el del `notifier`

**Si NO está así:**
1. Edita `NOTIFIER_URL`
2. Agrega `https://` si falta
3. **GUARDA**
4. **Redeploy** el `api-gateway` (Railway → Deployments → Redeploy)

---

### Paso 2: Verificar que el `notifier` Esté Corriendo

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

---

### Paso 3: Verificar Health Check del `notifier`

**Desde tu máquina**, ejecuta:

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

**Si NO responde:**
- El servicio está caído o el dominio está mal
- **Solución:** Verifica el dominio en Railway → `notifier` → Settings → Networking

---

### Paso 4: Ver Logs del `api-gateway` Cuando Intenta Enviar

**Railway Dashboard** → `@constanza/api-gateway` → **Logs**

**Cuando intentes enviar un mensaje**, busca errores que digan:
- `Error queuing message`
- `No se pudo encolar ningún mensaje`
- `NOTIFIER_URL` (para ver qué URL está usando)

**Ejemplos de errores que puedes ver:**

**Error 1: URL sin protocolo**
```
Error queuing message: TypeError: Invalid URL
NOTIFIER_URL: constanzanotifier-production.up.railway.app
```
**Solución:** Agregar `https://` a `NOTIFIER_URL`

**Error 2: Servicio no responde**
```
Error queuing message: connect ECONNREFUSED
NOTIFIER_URL: https://constanzanotifier-production.up.railway.app
```
**Solución:** El `notifier` está caído o el dominio está mal

**Error 3: Timeout**
```
Error queuing message: timeout of 10000ms exceeded
```
**Solución:** El `notifier` está muy lento o no responde

---

### Paso 5: Verificar Variables del `notifier`

**Railway Dashboard** → `@constanza/notifier` → **Variables**

**Debe tener:**
- ✅ `DATABASE_URL` (para conectar a la base de datos)
- ✅ `REDIS_URL` (para la cola de mensajes)
- ✅ `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (para enviar emails)

**Si falta alguna:**
- El servicio puede no estar funcionando correctamente

---

## 🎯 Solución Rápida (Si Todo Está Configurado)

Si ya verificaste todo y sigue fallando:

1. **Redeploy `api-gateway`** (para que tome la nueva `NOTIFIER_URL`)
2. **Redeploy `notifier`** (para asegurar que esté corriendo)
3. **Espera 2-3 minutos** para que ambos servicios estén listos
4. **Prueba enviar un mensaje** de nuevo

---

## 📋 Checklist Final

Antes de probar de nuevo, verifica:

- [ ] `NOTIFIER_URL` tiene `https://` al inicio
- [ ] `NOTIFIER_URL` apunta al dominio correcto del `notifier`
- [ ] El `notifier` está corriendo (ver logs)
- [ ] Health check del `notifier` responde OK (`curl`)
- [ ] `api-gateway` fue redeployado después de cambiar `NOTIFIER_URL`
- [ ] Logs del `api-gateway` muestran el error específico (si sigue fallando)

---

## 🚀 Acción Inmediata

1. **Verifica `NOTIFIER_URL`** en Railway → `api-gateway` → Variables
2. **Agrega `https://`** si falta
3. **Redeploy `api-gateway`**
4. **Verifica logs del `notifier`** (debe estar corriendo)
5. **Prueba health check** con `curl`
6. **Intenta enviar un mensaje** de nuevo

---

**El error 503 se resuelve cuando el `api-gateway` puede conectarse al `notifier`. La causa más común es `NOTIFIER_URL` sin `https://` o el `notifier` no corriendo.**




