# 🔍 Debug: Problema Real del Login

## ⚠️ IMPORTANTE: Ignorar Ruido

Los errores de `utils.js`, `extensionState.js`, etc. en la consola **NO son de tu app**. Son de extensiones de Chrome. **IGNÓRALOS**.

El problema real está en la comunicación frontend ↔ backend.

---

## 📋 Paso 1: Ver el Problema Real en Network

### 1.1. Abrir DevTools → Network

1. Abre tu app en Vercel (ej: `constanza-xxx.vercel.app`)
2. Presiona **F12** (o Cmd+Option+I en Mac)
3. Ve a la pestaña **Network** (NO Console)
4. En los filtros arriba, selecciona **Fetch/XHR**

### 1.2. Intentar Login

1. Email: `admin@constanza.com`
2. Password: `admin123`
3. Click en **"Iniciar sesión"**

### 1.3. Ver Qué Aparece

Busca en la lista de Network si aparece alguna request relacionada con login.

---

## 🔍 Escenario A: NO Aparece Ninguna Request

**Significado:** El problema está en el **frontend** - el formulario no está haciendo la request.

### Posibles Causas:

1. **Botón no es tipo submit:**
   ```tsx
   <button type="button">  // ❌ Mal
   <button type="submit">  // ✅ Bien
   ```

2. **onSubmit no se ejecuta:**
   - Verificar que el formulario tenga `onSubmit={handleSubmit}`
   - Verificar que `handleSubmit` no tenga un `return` temprano

3. **Validación corta antes:**
   ```tsx
   if (!email || !password) return; // Puede estar cortando
   ```

### Solución:

Revisar el código del formulario de login en `apps/web/src/app/login/page.tsx`

---

## 🔍 Escenario B: SÍ Aparece una Request

**Significado:** El frontend está intentando comunicarse con el backend, pero algo falla.

### Ver los Detalles:

1. **Click en la request** de login
2. Ve a la pestaña **Headers**
3. Busca:
   - **Request URL:** ¿Cuál es la URL completa?
   - **Request Method:** ¿Es POST?

4. Ve a la pestaña **Status:**
   - ¿Qué código aparece? (200, 404, 502, CORS error, etc.)

5. Ve a la pestaña **Response:**
   - ¿Qué mensaje aparece?

---

## 🚨 Posibles Errores y Soluciones

### Status: CORS error

**Significado:** El navegador bloquea la request por CORS.

**Qué Verificar:**
1. Railway → `@constanza/api-gateway` → Variables
2. Verificar que `ALLOWED_ORIGINS` tenga `*` o la URL de Vercel
3. Verificar que el código de CORS esté desplegado (commit `b74786b` o más reciente)

**Solución:**
- Verificar `ALLOWED_ORIGINS` en Railway
- Redeploy del api-gateway si es necesario

---

### Status: 502 Bad Gateway

**Significado:** El api-gateway está crasheando.

**Qué Verificar:**
1. Railway → `@constanza/api-gateway` → Logs
2. Buscar el error cuando intentas hacer login
3. Buscar stacktraces (Prisma, Redis, JWT, etc.)

**Solución:**
- Compartir el stacktrace completo de Railway
- El error te dirá exactamente qué está fallando

---

### Status: 404 Not Found

**Significado:** La URL del endpoint es incorrecta.

**Qué Verificar:**
1. Request URL en Network → Headers
2. ¿Es `/auth/login` o `/v1/auth/login`?
3. Verificar `NEXT_PUBLIC_API_URL` en Vercel

**Solución:**
- Verificar que `NEXT_PUBLIC_API_URL` = `https://constanzaapi-gateway-production.up.railway.app`
- Verificar que el endpoint en el código sea correcto

---

### Status: 401 Unauthorized

**Significado:** Credenciales inválidas (pero el backend está funcionando).

**Qué Verificar:**
1. Response en Network → Response
2. Debería decir: `{"error":"Credenciales inválidas"}`

**Solución:**
- Verificar usuario/password
- Probar con curl para confirmar

---

### Status: 200 OK

**Significado:** El backend responde correctamente.

**Qué Verificar:**
1. Response en Network → Response
2. Debería tener: `{"token":"...","user":{...}}`

**Solución:**
- Si Status es 200 pero no funciona, el problema está en el frontend
- Verificar que el código procese la respuesta correctamente

---

## ✅ Verificar que el Backend Está Vivo

Abre en tu navegador:

```
https://constanzaapi-gateway-production.up.railway.app/health
```

**Resultado Esperado:**
```json
{"status":"ok","timestamp":"...","service":"api-gateway"}
```

**Si devuelve 502/500:**
- El api-gateway está caído
- Revisar logs de Railway

**Si devuelve 200:**
- El api-gateway está vivo ✅
- El problema es específico del endpoint de login

---

## 📊 Qué Compartir para Debug

Cuando tengas la información, comparte:

1. **¿Aparece una request en Network?** (Sí/No)
2. **Si aparece:**
   - **Status Code:** (200, 404, 502, CORS error, etc.)
   - **Request URL:** (URL completa)
   - **Response:** (Mensaje de error si hay)
3. **Resultado de `/health`:** (200 con JSON o error)
4. **Logs de Railway:** (Si Status es 502, el stacktrace)

Con esa información podré darte la solución exacta.

---

## 🎯 Resumen

1. **Ignora** los errores de extensiones en Console
2. Ve a **Network → Fetch/XHR**
3. Intenta hacer login
4. **Comparte** qué aparece (o si no aparece nada)
5. Verifica `/health` del api-gateway

Eso es todo lo que necesitamos para identificar el problema real.





