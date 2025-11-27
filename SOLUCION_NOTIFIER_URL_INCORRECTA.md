# 🔧 Solución: `NOTIFIER_URL` Configurada Incorrectamente

## ⚠️ Problema Detectado

Veo que `NOTIFIER_URL` está configurada como:
```
constanzanotifier-production.up.railway.app
```

**Problemas:**
1. ❌ **Falta el protocolo `https://`** al inicio
2. ⚠️ Railway muestra puerto 8080, pero el notifier corre en 3001 (aunque esto puede estar bien si Railway hace proxy)

## ✅ Solución

### Paso 1: Corregir `NOTIFIER_URL` en `api-gateway`

1. **Railway Dashboard** → `@constanza/api-gateway` → **Variables**
2. Busca `NOTIFIER_URL`
3. **Edita** el valor y agrega `https://` al inicio:
   ```
   https://constanzanotifier-production.up.railway.app
   ```
4. **Guarda**

### Paso 2: Verificar que el Notifier Esté Corriendo

1. **Railway Dashboard** → `@constanza/notifier` → **Logs**
2. Deberías ver:
   ```
   🚀 Notifier running on http://0.0.0.0:3001
   ✅ Redis connected
   ✅ Database connected
   ```

### Paso 3: Verificar Health Check

Desde tu máquina o desde Railway logs:

```bash
curl https://constanzanotifier-production.up.railway.app/health
```

Debería responder:
```json
{
  "status": "ok",
  "service": "notifier",
  "queue": { ... }
}
```

**Si no responde**, el servicio puede estar caído o el dominio está mal.

### Paso 4: Redeploy `api-gateway`

Después de corregir `NOTIFIER_URL`:

1. **Railway Dashboard** → `@constanza/api-gateway` → **Deployments**
2. Click en **"Redeploy"**
3. Espera 2-3 minutos

## 🔍 Verificación Post-Corrección

Después de corregir `NOTIFIER_URL` y hacer redeploy:

1. **Intenta enviar un mensaje** desde el frontend
2. **Revisa los logs de `api-gateway`**:
   - Deberías ver: `Notifier health check failed, pero continuando...` (si el health check falla, pero continúa)
   - O: Requests exitosos al notifier
3. **Revisa los logs de `notifier`**:
   - Deberías ver: `Processing notification` cuando llegue un mensaje

## 📋 Formato Correcto de `NOTIFIER_URL`

**✅ Correcto:**
```
https://constanzanotifier-production.up.railway.app
```

**❌ Incorrecto:**
```
constanzanotifier-production.up.railway.app  (sin https://)
http://constanzanotifier-production.up.railway.app  (http en lugar de https)
https://constanzanotifier-production.up.railway.app:3001  (con puerto - no necesario en Railway)
```

## 🎯 Acción Inmediata

1. **Edita `NOTIFIER_URL`** en Railway → `api-gateway` → Variables
2. **Agrega `https://`** al inicio
3. **Guarda**
4. **Redeploy `api-gateway`**
5. **Prueba envío de mensaje**

---

**El problema es que falta `https://` en `NOTIFIER_URL`. Una vez que lo agregues y hagas redeploy, debería funcionar.**




