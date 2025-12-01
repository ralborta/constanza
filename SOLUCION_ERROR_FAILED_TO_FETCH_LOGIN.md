# 🔧 Solución: Error "Failed to fetch" en Login

## ⚠️ Error Actual

```
Failed to fetch
```

Este error significa que `NEXT_PUBLIC_API_URL` **no está configurada en Vercel** o está vacía.

## ✅ Solución: Configurar `NEXT_PUBLIC_API_URL` en Vercel

### Paso 1: Obtener la URL del API Gateway

1. **Railway Dashboard** → `@constanza/api-gateway`
2. **Settings → Networking**
3. Copia el **Public Domain** (ej: `constanzaapi-gateway-production.up.railway.app`)

### Paso 2: Configurar en Vercel

1. Ve a **Vercel Dashboard** → Tu proyecto `constanza-web`
2. **Settings → Environment Variables**
3. Busca `NEXT_PUBLIC_API_URL`
4. **Si NO existe**, agrega:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://constanzaapi-gateway-production.up.railway.app`
     (Usa el dominio que copiaste en el paso 1)
   - **Environment**: Selecciona todas (Production, Preview, Development)
   - **Click en "Save"**

5. **Si existe pero tiene otro valor**, edítala con el dominio correcto

### Paso 3: Redeploy en Vercel

**IMPORTANTE**: Después de agregar/actualizar la variable, **debes hacer redeploy**:

1. **Vercel Dashboard** → Tu proyecto → **Deployments**
2. Click en los **tres puntos (⋯)** del último deployment
3. Selecciona **"Redeploy"**
4. O simplemente haz un nuevo commit y push (Vercel redeploy automáticamente)

**⚠️ CRÍTICO**: Las variables de entorno en Vercel solo se aplican en el **build**, no en runtime. Si cambias una variable, **debes redeploy**.

### Paso 4: Verificar que Funcionó

1. **Abre la consola del navegador** (F12 → Console)
2. **Recarga la página de login**
3. Deberías ver en la consola:
   ```
   🔍 API_URL configurada: https://constanzaapi-gateway-production.up.railway.app
   🔍 NEXT_PUBLIC_API_URL: https://constanzaapi-gateway-production.up.railway.app
   ```

4. **Intenta hacer login** de nuevo
5. **Si funciona**, deberías poder iniciar sesión

## 🔍 Verificación Adicional

### Verificar que el API Gateway Esté Corriendo

1. **Railway Dashboard** → `@constanza/api-gateway` → **Logs**
2. Deberías ver:
   ```
   🚀 API-GATEWAY vCORS-FIX DESPLEGADO
   ✅ CORS configurado con origin: true
   ```

3. O prueba desde tu máquina:
   ```bash
   curl https://constanzaapi-gateway-production.up.railway.app/health
   ```
   Debería responder con `{"status":"ok"}`

### Verificar CORS (si sigue fallando)

Si después de configurar `NEXT_PUBLIC_API_URL` sigue fallando:

1. **Railway Dashboard** → `@constanza/api-gateway` → **Variables**
2. Verifica que `ALLOWED_ORIGINS` incluya tu dominio de Vercel:
   ```
   ALLOWED_ORIGINS=https://constanza-web.vercel.app,https://constanza-xxx.vercel.app
   ```
   (O simplemente `*` para permitir todos)

## 📋 Checklist Completo

- [ ] `NEXT_PUBLIC_API_URL` configurada en Vercel con la URL correcta del `api-gateway`
- [ ] Redeploy hecho en Vercel después de agregar la variable
- [ ] `api-gateway` está corriendo en Railway (ver logs)
- [ ] Health check del `api-gateway` responde OK
- [ ] `ALLOWED_ORIGINS` configurada en Railway (si es necesario)

## 🎯 Resumen Rápido

1. **Railway** → `api-gateway` → **Networking** → Copia Public Domain
2. **Vercel** → Tu proyecto → **Environment Variables** → Agrega `NEXT_PUBLIC_API_URL`
3. **Vercel** → **Redeploy**
4. **Prueba login** de nuevo

---

**El problema es que `NEXT_PUBLIC_API_URL` no está configurada en Vercel. Una vez que la configures y hagas redeploy, el login debería funcionar.**

