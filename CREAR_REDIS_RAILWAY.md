# 🔴 Solución: Error Redis en Notifier

## ⚠️ Problema

El servicio `@constanza/notifier` está fallando con:
```
ECONNREFUSED 127.0.0.1:6379
[ioredis] Unhandled error event
```

**Causa:** `REDIS_URL` no está configurada, entonces intenta conectarse a `localhost:6379` que no existe en Railway.

## ✅ Solución: Crear Redis en Railway

### Paso 1: Crear Redis

1. **Ve a Railway Dashboard**
2. **Abre tu proyecto `endearing-imagination`**
3. **Click en "+ New"** (botón verde)
4. **Selecciona "Database"**
5. **Selecciona "Redis"**

Railway automáticamente:
- ✅ Crea Redis
- ✅ Agrega `REDIS_URL` a todos tus servicios
- ✅ Todo configurado

### Paso 2: Verificar que REDIS_URL se Agregó

1. **Ve a `@constanza/notifier`** en Railway
2. **Pestaña "Variables"**
3. **Busca `REDIS_URL`** en "Variables added by Railway"
4. **Debería verse algo como:**
   ```
   redis://default:password@containers-us-west-xxx.railway.app:6379
   ```

### Paso 3: Verificar que Funciona

1. **Ve a `@constanza/notifier`** → Logs
2. **Los errores de `ECONNREFUSED` deberían desaparecer**
3. **Deberías ver:** `🚀 Notifier running on http://0.0.0.0:3001`

## 📋 Variables Necesarias para Notifier

Después de crear Redis, `@constanza/notifier` necesita:

```
REDIS_URL=redis://... (automático de Railway)
DATABASE_URL=postgresql://... (ya configurada)
BUILDERBOT_API_KEY=... (si usas WhatsApp)
SMTP_URL=... (si usas Email)
TTS_URL=... (si usas Voice)
```

## 🔍 Verificación

Después de crear Redis y configurar `REDIS_URL`:

1. **Redeploy `@constanza/notifier`**
2. **Verifica logs** - no deberían haber errores de Redis
3. **Health check:** `GET /health` debería responder OK

## 🚨 Si REDIS_URL No Aparece Automáticamente

1. **Ve a Redis** → Variables
2. **Copia `REDIS_URL`**
3. **Ve a `@constanza/notifier`** → Variables
4. **"+ New Variable"**
5. **Name:** `REDIS_URL`
6. **Value:** La URL que copiaste
7. **Guarda y redeploy**

---

**Resumen:** Crea Redis en Railway y `REDIS_URL` se configurará automáticamente. Luego redeploy `@constanza/notifier`.



