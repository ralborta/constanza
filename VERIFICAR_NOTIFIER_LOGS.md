# 🔍 Verificar Logs del `notifier`

## ⚠️ Problema

No se ven logs del servicio `@constanza/notifier` en Railway.

---

## ✅ Verificaciones

### Paso 1: Filtrar Logs del `notifier`

**Railway Dashboard** → `@constanza/notifier` → **Logs**

**En la parte superior de los logs, busca un filtro o selector de servicio.**

**O simplemente ve directamente al servicio `notifier`:**

1. Railway Dashboard → Click en el servicio **`@constanza/notifier`**
2. Click en la pestaña **"Logs"**
3. Deberías ver SOLO los logs del `notifier`

---

### Paso 2: Verificar que el Servicio Esté Corriendo

**Railway Dashboard** → `@constanza/notifier` → **Logs**

**Al inicio del servicio deberías ver:**
```
🚀 Notifier running on http://0.0.0.0:3001
✅ Redis connected
✅ Database connected
📬 Worker started, processing notifications...
```

**Si NO ves estos logs:**
- El servicio puede estar caído
- O no se ha deployado correctamente

---

### Paso 3: Intentar Enviar un Mensaje y Ver Logs

1. **Envía un mensaje** desde el frontend (`/notify`)
2. **Inmediatamente ve a Railway** → `@constanza/notifier` → **Logs**
3. **Busca estos mensajes:**

**Si el mensaje llega al notifier:**
```
Processing notification
```

**Si se envía correctamente:**
```
Notification sent successfully
```

**Si falla por SMTP:**
```
ERROR_SMTP_CONFIG_MISSING
ERROR_SMTP_AUTH_FAILED
Failed to send email notification
```

---

### Paso 4: Verificar Estado del Deployment

**Railway Dashboard** → `@constanza/notifier` → **Deployments**

**¿Qué estado tiene el último deployment?**

- ✅ **"Active"** (verde) = Deploy exitoso
- ⚠️ **"Building"** o **"Deploying"** = Aún en proceso
- ❌ **"Failed"** (rojo) = Deploy falló

**Si está "Failed":**
- Click en el deployment → **Logs**
- Busca el error específico

---

## 🎯 Acción Inmediata

1. **Railway** → Click en **`@constanza/notifier`** (no en el proyecto general)
2. **Logs** → ¿Qué ves?
3. **Deployments** → ¿Qué estado tiene el último deployment?
4. **Intenta enviar un mensaje** y revisa los logs inmediatamente

---

## ⚠️ Si No Ves Logs del `notifier`

**Posibles causas:**
1. El servicio está en otro proyecto de Railway
2. El servicio no está corriendo
3. El deployment falló

**Solución:**
- Verifica que estés viendo el servicio correcto
- Verifica el estado del deployment
- Si está "Failed", revisa los logs del deployment

---

**¿Qué ves cuando vas directamente a Railway → `@constanza/notifier` → Logs?**




