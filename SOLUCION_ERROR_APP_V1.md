# 🚨 Solución: Error `/app/v1/` en lugar de `/v1/`

## ⚠️ Problema Identificado

El error muestra `/app/v1/customers` en lugar de `/v1/customers`, lo que indica que la **URL base está mal configurada**.

## 🔍 Causa Probable

El problema NO es `DATABASE_URL` ni `DATABASE_PUBLIC_URL`. El problema es la **URL del API Gateway** configurada en el frontend.

## ✅ Solución

### Paso 1: Verificar NEXT_PUBLIC_API_URL en Vercel

1. Vercel Dashboard → Tu proyecto → **Settings** → **Environment Variables**
2. Busca `NEXT_PUBLIC_API_URL`
3. Debe tener el valor correcto, por ejemplo:
   ```
   https://constanzaapi-gateway-prod.up.railway.app
   ```
   O:
   ```
   https://api-gateway-production.up.railway.app
   ```

**NO debe tener:**
- `/app` al final
- `/v1` al final
- Rutas adicionales

### Paso 2: Verificar Variables en Railway api-gateway

1. Railway Dashboard → `@constanza/api-gateway` → **Variables**
2. Verifica que exista:
   - `DATABASE_URL` (debe tener la URL interna de Railway)
   - `JWT_SECRET`
   - `NODE_ENV=production`

**Sobre DATABASE_PUBLIC_URL:**
- Si existe `DATABASE_PUBLIC_URL` en Variables, **NO la quites** si no está causando problemas
- Prisma solo usa `DATABASE_URL`, no `DATABASE_PUBLIC_URL`
- Si `DATABASE_PUBLIC_URL` está causando confusión, puedes quitarla, pero **no es la causa del 404/405**

### Paso 3: Verificar Domain de Railway

1. Railway Dashboard → `@constanza/api-gateway` → **Settings** → **Domains**
2. Verifica la URL pública del servicio
3. Debe ser algo como:
   ```
   constanzaapi-gateway-prod.up.railway.app
   ```
   O:
   ```
   api-gateway-production.up.railway.app
   ```

### Paso 4: Actualizar NEXT_PUBLIC_API_URL

1. Vercel → Settings → Environment Variables
2. Edita `NEXT_PUBLIC_API_URL`
3. Usa la URL de Railway **sin** `/app` ni `/v1`:
   ```
   https://constanzaapi-gateway-prod.up.railway.app
   ```
4. Guarda y haz redeploy en Vercel

## 🎯 Lo Más Importante

**El problema es la URL base del frontend, NO las variables de base de datos.**

- `DATABASE_URL` → Para que Prisma se conecte a Postgres (backend)
- `NEXT_PUBLIC_API_URL` → Para que el frontend se conecte al backend (frontend)

Son cosas diferentes.

## 📋 Checklist

- [ ] `NEXT_PUBLIC_API_URL` en Vercel tiene la URL correcta (sin `/app` ni `/v1`)
- [ ] `DATABASE_URL` en Railway api-gateway está configurada
- [ ] El dominio de Railway api-gateway es correcto
- [ ] Vercel hizo redeploy después de cambiar `NEXT_PUBLIC_API_URL`

## 🔍 Verificación Rápida

Abre la consola del navegador y ejecuta:

```javascript
console.log(process.env.NEXT_PUBLIC_API_URL);
```

O revisa en Network tab qué URL está usando para las requests. Debe ser:
```
https://constanzaapi-gateway-prod.up.railway.app/v1/customers/upload
```

NO debe ser:
```
https://constanzaapi-gateway-prod.up.railway.app/app/v1/customers/upload
```

## 💡 Sobre DATABASE_PUBLIC_URL

- **NO es necesario quitarla** si no está causando problemas
- Prisma solo usa `DATABASE_URL`
- Si quieres quitarla para limpiar, puedes hacerlo, pero **no solucionará el 404/405**

El problema real es la configuración de `NEXT_PUBLIC_API_URL` en Vercel.





