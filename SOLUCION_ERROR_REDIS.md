# 🚨 Solución: Errores de Conexión a Redis

## ⚠️ Problema Identificado

Los logs muestran errores de conexión a Redis:
- `ETIMEDOUT` - Timeout al conectar
- `ECONNREFUSED` - Conexión rechazada
- Servicios afectados: `notifier` y `rail-cucurt`

## 🔍 Verificar si api-gateway Usa Redis

### Paso 1: Verificar Variables de api-gateway

1. Railway Dashboard → `@constanza/api-gateway` → **Variables**
2. Busca `REDIS_URL`
3. Verifica:
   - ¿Existe? Sí / No
   - ¿Tiene un valor válido?

### Paso 2: Verificar Logs de api-gateway

1. Railway Dashboard → `@constanza/api-gateway` → **Logs**
2. Busca específicamente:
   - Errores relacionados con Redis
   - `ETIMEDOUT` o `ECONNREFUSED`
   - Mensajes de inicio del servicio
   - `🚀 API Gateway running on...`
   - `Registering customer routes including /customers/upload`

## ✅ Soluciones

### Si api-gateway NO usa Redis (Probable)

Si `api-gateway` no requiere Redis, los errores de `notifier` y `rail-cucurt` no deberían afectarlo.

**Verifica:**
1. Los logs de `api-gateway` NO deben tener errores de Redis
2. El servicio debe estar "Running"
3. Debe mostrar `🚀 API Gateway running on...` en los logs

### Si api-gateway SÍ usa Redis

Si `api-gateway` necesita Redis:

1. Railway Dashboard → Busca el servicio **Redis**
2. Si no existe, créalo:
   - "+ New" → "Database" → "Redis"
3. Railway creará automáticamente `REDIS_URL`
4. Copia `REDIS_URL` y agrégala a `api-gateway`:
   - Railway → `@constanza/api-gateway` → Variables
   - Agregar `REDIS_URL` con el valor del servicio Redis
5. Railway hará redeploy automáticamente

## 🎯 Lo Más Importante

**Para el problema de carga de archivos (404/405), necesito ver los logs específicos de `api-gateway`:**

1. Railway Dashboard → `@constanza/api-gateway` → **Logs**
2. Busca los mensajes al iniciar el servicio
3. Comparte:
   - ¿Aparece `🚀 API Gateway running on...`?
   - ¿Aparece `Registering customer routes including /customers/upload`?
   - ¿Hay algún error en rojo?
   - ¿El servicio está "Running"?

## 📋 Checklist

- [ ] Verificar logs de `api-gateway` (no solo notifier/rail-cucurt)
- [ ] Verificar que `api-gateway` esté "Running"
- [ ] Verificar que `DATABASE_URL` esté configurada en `api-gateway`
- [ ] Verificar que no haya errores de Redis en logs de `api-gateway`
- [ ] Verificar que las rutas se registren correctamente

## 🔍 Próximo Paso

**Comparte los logs específicos de `api-gateway`** (no de notifier o rail-cucurt) para identificar el problema real con la carga de archivos.





