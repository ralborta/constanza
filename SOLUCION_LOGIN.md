# 🔐 Solución: No Puedo Hacer Login

## ✅ Estado del Backend

El servidor está funcionando correctamente:
- ✅ `/health` → 200 OK
- ✅ `/auth/login` → 200 OK con token

## 🔍 Problema en el Frontend

El problema está en cómo el frontend está haciendo las requests. Necesitamos verificar:

### 1. Verificar la URL que está usando el frontend

Abre la consola del navegador (F12 → Console) y ejecuta:

```javascript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
```

O mejor aún, cuando intentas hacer login, abre la pestaña **Network** en DevTools y busca la request a `/auth/login`. Ahí verás:
- La URL completa que está usando
- El error exacto (si hay)

### 2. Verificar NEXT_PUBLIC_API_URL en Vercel

1. Vercel Dashboard → Tu proyecto → Settings → Environment Variables
2. Busca `NEXT_PUBLIC_API_URL`
3. Debe ser: `https://constanzaapi-gateway-production.up.railway.app`
4. **IMPORTANTE:** Debe estar configurada para **Production**, **Preview** y **Development**

### 3. Usuarios de Prueba

Mientras tanto, puedes usar estos usuarios "fake" que funcionan sin backend:

**Admin:**
- Email: `admin@constanza.com`
- Password: `admin123`

**Cliente:**
- Email: `cliente@acme.com`
- Password: `cliente123`
- ✅ Marca el checkbox "Soy cliente"

### 4. Debug en la Consola

Cuando intentas hacer login, en la consola deberías ver:
- Si hay un error de red (CORS, 404, 502, etc.)
- La URL exacta que está usando

## 🚨 Posibles Causas

1. **NEXT_PUBLIC_API_URL no configurada en Vercel**
   - El frontend intenta usar `http://localhost:3000` o una URL vacía
   - Solución: Configurar en Vercel

2. **CORS aún bloqueando (aunque debería estar resuelto)**
   - El navegador bloquea la request
   - Solución: Verificar que el deploy del fix de CORS esté activo

3. **URL incorrecta**
   - El frontend está usando `/app/v1/auth/login` en lugar de `/auth/login`
   - Solución: Verificar `NEXT_PUBLIC_API_URL`

## 📋 Próximos Pasos

1. **Abre DevTools → Network** cuando intentas hacer login
2. **Busca la request a `/auth/login`**
3. **Comparte:**
   - La URL completa que aparece en Network
   - El status code (200, 404, 502, CORS error, etc.)
   - El mensaje de error exacto

Con esa información podré darte la solución exacta.





