# 🧪 Test CORS con curl

## ✅ Comando para Probar

Después de que Railway haga deploy, ejecuta esto desde tu terminal:

```bash
curl -i -X OPTIONS \
  https://constanzaapi-gateway-production.up.railway.app/v1/customers \
  -H "Origin: https://constanza-mxviqgdsy-nivel-41.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

## ✅ Respuesta Esperada (Si Funciona)

Deberías ver algo así:

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://constanza-mxviqgdsy-nivel-41.vercel.app
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS,PATCH
Access-Control-Allow-Headers: Content-Type,Authorization
Access-Control-Allow-Credentials: true
```

## ❌ Si NO Aparecen Estos Headers

Significa que:
- El código nuevo NO está deployado, o
- Hay otro problema en la configuración

## 🔍 Verificar Logs

Después del deploy, en Railway → `@constanza/api-gateway` → Logs, deberías ver:

```
🚀 API-GATEWAY vCORS-TEST DESPLEGADO
```

Si ves este mensaje, el código nuevo está corriendo.





