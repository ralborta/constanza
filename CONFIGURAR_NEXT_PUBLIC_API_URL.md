# 🔧 Configurar NEXT_PUBLIC_API_URL Correctamente

## ✅ Respuesta Directa

`NEXT_PUBLIC_API_URL` debe apuntar **SOLO al servicio `@constanza/api-gateway`**.

Los otros dos servicios (`notifier` y `rail-cucuru`) son **internos** y no deben usarse desde el frontend.

## 🎯 Cómo Obtener la URL Correcta

### Opción 1: Desde Railway Dashboard (Recomendado)

1. Railway Dashboard → Click en el servicio **`@constanza/api-gateway`**
2. Ve a la pestaña **"Settings"** → **"Domains"** o **"Networking"**
3. Busca la URL pública, debería ser algo como:
   ```
   https://constanzaapi-gateway-prod.up.railway.app
   ```
   O:
   ```
   https://api-gateway-production.up.railway.app
   ```

### Opción 2: Desde el Card del Servicio

En la imagen que compartiste, el servicio `api-gateway` muestra:
```
constanzaapi-gateway-prod...
```

Esto sugiere que la URL podría ser:
```
https://constanzaapi-gateway-prod.up.railway.app
```

## ✅ Configuración Correcta en Vercel

1. Vercel Dashboard → Tu proyecto → **Settings** → **Environment Variables**
2. Busca o crea `NEXT_PUBLIC_API_URL`
3. El valor debe ser **SOLO la URL base**, sin rutas adicionales:
   ```
   https://constanzaapi-gateway-prod.up.railway.app
   ```
   O la URL que muestre Railway para `api-gateway`

**NO debe tener:**
- ❌ `/app` al final
- ❌ `/v1` al final
- ❌ Rutas adicionales
- ❌ La URL de `notifier` o `rail-cucuru`

## 📋 Resumen de los 3 Servicios

1. **`@constanza/api-gateway`** ✅
   - **Este es el que necesitas** para `NEXT_PUBLIC_API_URL`
   - Expone las rutas `/v1/customers`, `/v1/invoices`, etc.
   - Es el punto de entrada desde el frontend

2. **`@constanza/notifier`** ❌
   - Servicio interno
   - NO debe usarse desde el frontend
   - Solo se comunica con `api-gateway`

3. **`@constanza/rail-cucuru`** ❌
   - Servicio interno (webhooks)
   - NO debe usarse desde el frontend
   - Solo recibe webhooks externos

## 🔍 Verificación

Después de configurar `NEXT_PUBLIC_API_URL`:

1. Haz redeploy en Vercel
2. Abre la consola del navegador
3. Ejecuta:
   ```javascript
   console.log(process.env.NEXT_PUBLIC_API_URL);
   ```
4. Debe mostrar la URL de `api-gateway` sin rutas adicionales

## 🎯 Acción Inmediata

1. Railway Dashboard → `@constanza/api-gateway` → Settings → Domains
2. Copia la URL pública (debe ser algo como `https://constanzaapi-gateway-prod.up.railway.app`)
3. Vercel → Settings → Environment Variables → `NEXT_PUBLIC_API_URL`
4. Pega la URL (sin `/app` ni `/v1`)
5. Guarda y haz redeploy en Vercel





