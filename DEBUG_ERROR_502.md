# 🔍 Debug: Error 502 en Preflight OPTIONS

## ⚠️ Problema Actual

El preflight OPTIONS está devolviendo **502 Bad Gateway**, lo que causa que el navegador lo interprete como error CORS.

## 🔍 Qué Verificar

### 1. Logs de Railway (CRÍTICO)

1. Railway Dashboard → `@constanza/api-gateway` → **Logs**
2. Busca errores cuando intentas cargar el archivo
3. Busca específicamente:
   - `🚀 API-GATEWAY vCORS-TEST DESPLEGADO` (debe aparecer al iniciar)
   - Errores relacionados con:
     - Prisma/Postgres
     - Redis
     - CORS
     - Rutas
   - Stacktraces completos

### 2. Probar Endpoint /health

Desde tu terminal:

```bash
curl -i https://constanzaapi-gateway-production.up.railway.app/health
```

**Si devuelve 200:**
- El servidor está corriendo
- El problema es específico de OPTIONS o `/v1/customers`

**Si devuelve 502:**
- El servidor no está levantando correctamente
- Revisa los logs para ver el error al iniciar

### 3. Probar OPTIONS Directamente

```bash
curl -i -X OPTIONS \
  https://constanzaapi-gateway-production.up.railway.app/v1/customers \
  -H "Origin: https://constanza-mxviqgdsy-nivel-41.vercel.app" \
  -H "Access-Control-Request-Method: POST"
```

Esto te mostrará el error exacto que está causando el 502.

## 🚨 Posibles Causas del 502

### Causa 1: Servidor No Inicia Correctamente

Si hay errores al iniciar (conexión a DB, etc.), el servidor puede estar crasheando.

**Solución:** Revisar logs al iniciar el servicio.

### Causa 2: Error en Handler OPTIONS

El handler `server.options('*', ...)` puede estar causando un error.

**Solución:** Ya agregué try/catch y logging.

### Causa 3: Orden de Registro Incorrecto

Si `server.options` se registra después de las rutas, puede causar conflictos.

**Solución:** Ya lo moví ANTES de registrar rutas.

### Causa 4: DATABASE_URL No Configurada

Si Prisma intenta conectarse y falla, puede causar 502.

**Solución:** Verificar que `DATABASE_URL` esté en Variables.

## 📋 Checklist de Debug

- [ ] Ver logs de Railway al iniciar el servicio
- [ ] Ver logs cuando intentas cargar el archivo
- [ ] Probar `/health` endpoint
- [ ] Probar OPTIONS con curl
- [ ] Verificar que `DATABASE_URL` esté configurada
- [ ] Verificar que el servicio esté "Running"

## 🎯 Próximo Paso

**Comparte los logs de Railway** (especialmente los errores) para identificar qué está causando el 502.





