# 🔍 Verificar que el Deploy de CORS Funcionó

## ⚠️ Si las URLs Están Configuradas pero Sigue el Error

Puede ser que Railway **no haya deployado el último commit** con la corrección de CORS.

## ✅ Verificaciones Necesarias

### 1. Verificar Último Commit Deployado

1. Railway Dashboard → `@constanza/api-gateway` → **Deployments**
2. Busca el último deployment
3. Verifica que el commit sea **`20e9e5a`** o más reciente
4. Si es un commit más viejo, haz **Redeploy**

### 2. Verificar Logs al Iniciar

1. Railway Dashboard → `@constanza/api-gateway` → **Logs**
2. Busca los mensajes al iniciar el servicio
3. Debe mostrar:
   - `🚀 API Gateway running on http://0.0.0.0:8080`
   - `Registering customer routes including /customers/upload`
4. **NO debe haber errores** relacionados con CORS o módulos

### 3. Probar el Endpoint Directamente

Desde tu terminal local:

```bash
# Probar el preflight OPTIONS
curl -X OPTIONS https://constanzaapi-gateway-production.up.railway.app/v1/customers \
  -H "Origin: https://constanza-mxviqgdsy-nivel-41.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -v
```

Deberías ver en la respuesta:
```
< HTTP/1.1 204 No Content
< Access-Control-Allow-Origin: https://constanza-mxviqgdsy-nivel-41.vercel.app
< Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS,PATCH
< Access-Control-Allow-Headers: Content-Type, Authorization
```

Si NO ves estos headers, el código nuevo no está deployado.

## 🚨 Si el Commit No Está Deployado

1. Railway Dashboard → `@constanza/api-gateway` → **Deployments**
2. Click en **"Redeploy"** o **"Deploy Latest Commit"**
3. Espera 2-3 minutos
4. Prueba de nuevo

## 🔧 Solución Alternativa: Verificar Código Local

Si Railway no está deployando, verifica que el código local tenga los cambios:

```bash
cd apps/api-gateway/src
cat index.ts | grep -A 20 "await server.register(cors"
```

Deberías ver la nueva configuración con `origin: allowedOrigins.includes('*') ? true : ...`

## 📋 Checklist Completo

- [ ] `ALLOWED_ORIGINS` configurada en Railway (con `*` o URLs específicas)
- [ ] Último commit deployado es `20e9e5a` o más reciente
- [ ] Servicio está "Running" (no "Error" o "Stopped")
- [ ] Logs muestran que el servicio inició correctamente
- [ ] Preflight OPTIONS responde con headers CORS (verificar con curl)

## 🎯 Próximo Paso

**Verifica en Railway → Deployments que el commit `20e9e5a` esté deployado.** Si no, haz redeploy manual.





