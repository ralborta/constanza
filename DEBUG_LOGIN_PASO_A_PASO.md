# 🔍 Debug Login - Paso a Paso

## ⚠️ Importante

Los errores rojos de `utils.js`, `extensionState.js`, etc. en la consola **NO son de tu app**. Son de extensiones de Chrome y puedes ignorarlos.

El problema real es que **el login no funciona** porque la comunicación con el API está fallando.

---

## 📋 Paso 1: Verificar que el API Gateway Está Corriendo

### 1.1. Probar el endpoint `/health`

Abre en tu navegador:

```
https://constanzaapi-gateway-production.up.railway.app/health
```

**Resultado esperado:**
```json
{"status":"ok","timestamp":"2025-11-18T...","service":"api-gateway"}
```

**Si NO responde o da error:**
- El api-gateway está caído
- Revisa los logs en Railway → `@constanza/api-gateway` → Logs

**Si responde OK:**
- El api-gateway está corriendo ✅
- El problema es específico del endpoint de login

---

## 📋 Paso 2: Ver el Error Real en Network

### 2.1. Abrir DevTools

1. Abre tu app en el navegador (ej: `constanza-xxx.vercel.app`)
2. Presiona **F12** (o Cmd+Option+I en Mac)
3. Ve a la pestaña **Network** (no Console)

### 2.2. Filtrar Requests

1. En la barra de filtros, selecciona **Fetch/XHR** (o escribe `fetch` o `xhr`)
2. Esto mostrará solo las requests HTTP, no los recursos estáticos

### 2.3. Intentar Login

1. En la pantalla de login, ingresa:
   - Email: `admin@constanza.com`
   - Password: `admin123`
2. Click en **"Iniciar sesión"**

### 2.4. Identificar la Request de Login

En la pestaña Network deberías ver una request con nombre tipo:
- `login`
- `auth/login`
- `session`
- O similar

**Click en esa request** para ver los detalles.

---

## 📋 Paso 3: Analizar el Error

### 3.1. Ver el Status Code

En la request de login, mira la columna **Status**:

| Status | Significado | Solución |
|--------|-------------|----------|
| **CORS error** | El navegador bloquea la request | Problema de CORS en api-gateway |
| **502** | Bad Gateway - El servidor está caído | Revisar logs de Railway |
| **404** | Endpoint no encontrado | Verificar ruta del endpoint |
| **401** | Credenciales inválidas | Verificar usuario/password |
| **400** | Request inválida | Verificar formato del body |
| **200** | ✅ Funciona | El problema está en el frontend |

### 3.2. Ver los Headers

En la request de login, ve a la pestaña **Headers**:

**Request URL:**
```
https://constanzaapi-gateway-production.up.railway.app/auth/login
```

**Request Method:**
```
POST
```

**Si la URL es incorrecta** (ej: `/app/v1/auth/login` o `localhost:3000`):
- El problema es `NEXT_PUBLIC_API_URL` en Vercel
- Verificar en Vercel → Settings → Environment Variables

### 3.3. Ver la Response

En la request de login, ve a la pestaña **Response**:

**Si Status es CORS error:**
- No verás Response (el navegador bloquea antes)
- El problema es CORS en api-gateway

**Si Status es 502:**
- Verás un error de Railway o un mensaje genérico
- Revisar logs de Railway

**Si Status es 401:**
- Verás: `{"error":"Credenciales inválidas"}`
- Verificar usuario/password

**Si Status es 200:**
- Verás: `{"token":"...","user":{...}}`
- El problema está en el frontend (no guarda el token, etc.)

---

## 📋 Paso 4: Probar el Login con curl

Para verificar que el endpoint funciona independientemente del frontend:

```bash
curl -i -X POST \
  https://constanzaapi-gateway-production.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@constanza.com","password":"admin123"}'
```

**Resultado esperado:**
```json
{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...","user":{...}}
```

**Si esto funciona pero el frontend no:**
- El problema es CORS o `NEXT_PUBLIC_API_URL`

**Si esto también falla:**
- El problema está en el backend
- Revisar logs de Railway

---

## 📋 Paso 5: Verificar CORS

### 5.1. Probar OPTIONS (Preflight)

```bash
curl -i -X OPTIONS \
  https://constanzaapi-gateway-production.up.railway.app/auth/login \
  -H "Origin: https://constanza-xxx.vercel.app" \
  -H "Access-Control-Request-Method: POST"
```

**Deberías ver:**
```
Access-Control-Allow-Origin: https://constanza-xxx.vercel.app
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS,PATCH
```

**Si NO ves esos headers:**
- El problema es CORS
- Verificar que `ALLOWED_ORIGINS` esté configurado en Railway

---

## 🎯 Qué Compartir para Debug

Cuando tengas la información, comparte:

1. **Status Code** de la request de login en Network
2. **Request URL** completa (de Headers)
3. **Response** (si hay, de la pestaña Response)
4. **Resultado del curl** a `/health` y `/auth/login`
5. **Logs de Railway** (si Status es 502)

Con esa información podré darte la solución exacta.

---

## 🚨 Soluciones Rápidas por Error

### CORS Error

1. Railway → `@constanza/api-gateway` → Variables
2. Verificar que `ALLOWED_ORIGINS` tenga `*` o la URL de Vercel
3. Redeploy del api-gateway

### 502 Bad Gateway

1. Railway → `@constanza/api-gateway` → Logs
2. Buscar el error que está causando el crash
3. Compartir el stacktrace

### 404 Not Found

1. Verificar que `NEXT_PUBLIC_API_URL` en Vercel sea correcta
2. Debe ser: `https://constanzaapi-gateway-production.up.railway.app`
3. Redeploy del frontend en Vercel

### 401 Unauthorized

1. Verificar usuario/password
2. Probar con curl para confirmar que el endpoint funciona

---

## ✅ Checklist

- [ ] `/health` responde 200 en el navegador
- [ ] `/auth/login` funciona con curl
- [ ] Request de login visible en Network (DevTools)
- [ ] Status code identificado
- [ ] Request URL verificada
- [ ] Response revisada (si hay)
- [ ] Logs de Railway revisados (si Status es 502)





