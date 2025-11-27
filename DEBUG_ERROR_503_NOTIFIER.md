# 🔍 Debug: Error 503 - Servicio de Notificaciones No Disponible

## 📋 Análisis del Código

El error 503 se genera cuando **ningún mensaje se pudo encolar** en el `notifier`. Esto significa que todos los `axios.post` a `${NOTIFIER_URL}/notify/send` están fallando.

## 🔍 Pasos para Diagnosticar

### Paso 1: Verificar Logs del `api-gateway`

**Railway Dashboard** → `@constanza/api-gateway` → **Logs**

Busca errores que digan:
- `Error queuing message`
- `No se pudo encolar ningún mensaje`
- `NOTIFIER_URL` (para ver qué URL está usando)

**Copia aquí los últimos logs relacionados con `notify` o `notifier`.**

---

### Paso 2: Verificar que `NOTIFIER_URL` Esté Correcta

**Railway Dashboard** → `@constanza/api-gateway` → **Variables**

Verifica que `NOTIFIER_URL` tenga:
- ✅ `https://` al inicio
- ✅ El dominio correcto del `notifier`

**Debe ser:**
```
https://constanzanotifier-production.up.railway.app
```

**NO debe ser:**
- ❌ `constanzanotifier-production.up.railway.app` (sin https://)
- ❌ `http://constanzanotifier-production.up.railway.app` (http en lugar de https)
- ❌ `https://constanzanotifier-production.up.railway.app:3001` (con puerto - no necesario)

---

### Paso 3: Verificar que el `notifier` Esté Corriendo

**Railway Dashboard** → `@constanza/notifier` → **Logs**

Deberías ver:
```
🚀 Notifier running on http://0.0.0.0:3001
✅ Redis connected
✅ Database connected
```

**Si NO está corriendo** → Redeploy el `notifier`

---

### Paso 4: Verificar Health Check del `notifier`

Desde tu máquina o desde Railway logs, prueba:

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

**Si no responde:**
- El servicio está caído
- El dominio está mal configurado
- Hay un problema de red

---

### Paso 5: Verificar que el Endpoint `/notify/send` Exista

El `api-gateway` intenta hacer `POST` a:
```
${NOTIFIER_URL}/notify/send
```

**Verifica en el código del `notifier`** que este endpoint exista y esté registrado.

---

## 🎯 Posibles Causas del Error 503

### 1. `NOTIFIER_URL` sin `https://` o incorrecta
**Solución:** Agregar `https://` y redeploy `api-gateway`

### 2. `notifier` no está corriendo
**Solución:** Verificar logs y redeploy si es necesario

### 3. `notifier` está corriendo pero no responde
**Solución:** Verificar health check y logs del `notifier`

### 4. Problema de red/firewall entre servicios
**Solución:** Verificar que ambos servicios estén en Railway y puedan comunicarse

### 5. El endpoint `/notify/send` no existe o está mal configurado
**Solución:** Verificar código del `notifier`

---

## 📋 Checklist de Verificación

- [ ] `NOTIFIER_URL` tiene `https://` al inicio
- [ ] `NOTIFIER_URL` apunta al dominio correcto del `notifier`
- [ ] El `notifier` está corriendo (ver logs)
- [ ] Health check del `notifier` responde OK
- [ ] El endpoint `/notify/send` existe en el `notifier`
- [ ] Logs del `api-gateway` muestran el error específico

---

## 🚀 Acción Inmediata

1. **Revisa los logs del `api-gateway`** y busca errores relacionados con `notifier`
2. **Verifica `NOTIFIER_URL`** en Railway → `api-gateway` → Variables
3. **Verifica que el `notifier` esté corriendo** (logs)
4. **Prueba el health check** con `curl`
5. **Copia aquí los logs** para diagnóstico más específico

---

**El error 503 significa que el `api-gateway` no puede conectarse al `notifier`. Necesitamos ver los logs para saber exactamente por qué.**




