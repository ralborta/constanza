# 🔧 Configurar REDIS_URL en Railway

## ✅ Redis Creado

Redis ya está creado en Railway (hace 40 segundos).

## ⚠️ Verificar REDIS_URL

Railway debería haber agregado `REDIS_URL` automáticamente, pero a veces tarda unos minutos.

### Paso 1: Verificar si REDIS_URL está en Redis

1. **Ve a Railway Dashboard**
2. **Abre el servicio `Redis`**
3. **Pestaña "Variables"**
4. **Busca `REDIS_URL`**

Debería verse algo como:
```
redis://default:password@containers-us-west-xxx.railway.app:6379
```

### Paso 2: Si REDIS_URL está en Redis pero NO en notifier

1. **Copia el valor de `REDIS_URL`** del servicio Redis
2. **Ve a `@constanza/notifier`** → Variables
3. **"+ New Variable"**
4. **Name:** `REDIS_URL`
5. **Value:** Pega la URL que copiaste
6. **Guarda**

### Paso 3: Hacer lo mismo para otros servicios

Si `api-gateway` o `rail-cucuru` también usan Redis:
- Agrega `REDIS_URL` en cada uno

### Paso 4: Redeploy

Después de agregar `REDIS_URL`:
1. **Redeploy `@constanza/notifier`**
2. **Verifica logs** - los errores de `ECONNREFUSED` deberían desaparecer

## 🔍 Verificación

Después de configurar `REDIS_URL` y redeploy:

1. **Logs de notifier** - No deberían haber errores de Redis
2. **Health check** - `GET /health` debería responder OK
3. **Servicio activo** - Estado "Active" o "Running"

## 📋 Resumen

1. ✅ Redis creado
2. ⚠️ Verificar que `REDIS_URL` esté en notifier
3. ⚠️ Si no está, agregarla manualmente
4. ✅ Redeploy notifier

---

¿Necesitas ayuda para verificar o configurar REDIS_URL?



