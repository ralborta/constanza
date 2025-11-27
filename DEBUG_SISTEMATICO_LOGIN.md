# 🔍 Debug Sistemático del Login - Paso a Paso

## ✅ Cambios Aplicados

He simplificado el componente de login siguiendo el enfoque profesional:

1. **Logging mínimo** en `onClick` y `onSubmit`
2. **Fetch de prueba** a httpbin primero
3. **Fetch real** al backend después
4. **Eliminado** el código de usuario fake (para forzar que siempre llame al backend)

---

## 📋 Qué Verificar Después del Deploy

### Paso 1: Probar en Ventana Incógnito

1. Abre una **ventana privada/incógnito**
2. Desactiva extensiones (especialmente de contraseñas)
3. Abre la app en Vercel
4. DevTools → **Console** y **Network → Fetch/XHR**

### Paso 2: Intentar Login

1. Email: `admin@constanza.com`
2. Password: `admin123`
3. Click en "Iniciar sesión"

### Paso 3: Ver Logs Esperados

Deberías ver esta secuencia en Console:

```
🔍 BUTTON CLICK
🔍 FORM SUBMIT ejecutado { email: 'admin@constanza.com', password: 'admin123', isCustomer: false }
🔍 Test fetch a httpbin...
🔍 Resultado httpbin: 200
🔍 API_URL: https://constanzaapi-gateway-production.up.railway.app
🔍 Intentando login con backend: https://constanzaapi-gateway-production.up.railway.app/auth/login
🔍 Response status: 200
✅ Login exitoso: { token: '...', user: {...} }
```

### Paso 4: Verificar Network

En **Network → Fetch/XHR** deberías ver:

1. **Request a `httpbin.org/post`** (Status: 200)
2. **Request a `/auth/login`** (Status: 200, 401, 502, etc.)

---

## 🚨 Escenarios Posibles

### Escenario A: No ves ningún log

**Significado:** El click no llega al botón o no estás viendo el bundle correcto.

**Solución:**
- Verificar que el deploy se completó
- Hard refresh (Cmd+Shift+R)
- Verificar que estás en la URL correcta de Vercel

### Escenario B: Solo ves "BUTTON CLICK"

**Significado:** El botón se ejecuta, pero el `onSubmit` del form NO.

**Posibles causas:**
- `<button type="button">` en lugar de `type="submit"`
- Botón fuera del `<form>`
- Hay otro form superpuesto

**Solución:** Verificar que el botón esté dentro del form y sea `type="submit"`.

### Escenario C: Ves "FORM SUBMIT" pero no aparece request a httpbin

**Significado:** El código se corta antes del fetch (error de JS/TypeScript).

**Solución:** Verificar los errores en Console (además de los logs).

### Escenario D: httpbin funciona pero no aparece request a `/auth/login`

**Significado:** `API_URL` está vacía o hay un error antes del segundo fetch.

**Solución:** Verificar `NEXT_PUBLIC_API_URL` en Vercel.

### Escenario E: Aparece request a `/auth/login` pero Status es 502/404/CORS

**Significado:** El frontend funciona, el problema está en el backend.

**Solución:** Revisar logs de Railway y configuración de CORS.

---

## ✅ Checklist de Verificación

- [ ] Probar en ventana incógnito
- [ ] Ver logs en Console
- [ ] Ver request a httpbin en Network
- [ ] Ver request a `/auth/login` en Network
- [ ] Ver Status Code de la request a `/auth/login`

---

## 📊 Qué Compartir

Después de probar, comparte:

1. **Todos los logs** que aparecen en Console
2. **Requests que aparecen** en Network (especialmente Status Codes)
3. **Si ves "BUTTON CLICK"** pero no "FORM SUBMIT"
4. **Si httpbin funciona** pero no el backend

Con esa información podré identificar exactamente dónde se está cortando el flujo.

---

## 🎯 Próximos Pasos

1. **Esperar deploy** (2-3 minutos)
2. **Probar en incógnito**
3. **Verificar logs y Network**
4. **Compartir resultados**

Este enfoque sistemático nos permitirá identificar exactamente dónde está el problema.





