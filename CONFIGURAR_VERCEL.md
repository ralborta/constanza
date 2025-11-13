# 🔧 Configurar Vercel para Conectar con Railway

## ⚠️ Problema

El frontend en Vercel no puede conectarse al API Gateway en Railway porque falta la variable de entorno `NEXT_PUBLIC_API_URL`.

## ✅ Solución

### Paso 1: Obtener URL del API Gateway

1. Ve a Railway Dashboard
2. Click en el servicio `api-gateway`
3. Ve a **Settings** → **Domains**
4. Copia la URL (ejemplo: `api-gateway-production.up.railway.app`)

### Paso 2: Configurar Variable en Vercel

1. Ve a Vercel Dashboard: https://vercel.com
2. Selecciona tu proyecto `constanza` (o el nombre que le hayas puesto)
3. Ve a **Settings** → **Environment Variables**
4. Agrega nueva variable:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://api-gateway-production.railway.app` (o la URL que copiaste)
   - **Environment**: Selecciona `Production`, `Preview`, y `Development`
5. Click en **Save**

### Paso 3: Redeploy en Vercel

Después de agregar la variable:

1. Ve a **Deployments**
2. Click en el último deployment
3. Click en **Redeploy** (o espera al próximo push a GitHub)

O simplemente haz un commit y push para que Vercel redeploye automáticamente.

## 🔍 Verificar que Funciona

1. Espera 1-2 minutos después del redeploy
2. Intenta hacer login con:
   - Email: `admin@constanza.com`
   - Password: `admin123`

## 📝 Nota

Si cambias la URL del API Gateway en Railway, recuerda actualizar esta variable en Vercel también.

