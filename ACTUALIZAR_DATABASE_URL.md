# 🔧 Actualizar DATABASE_URL

## ⚠️ Problema Identificado

La `DATABASE_URL` en el `.env` local apunta a una URL que ya no es válida o tiene credenciales incorrectas.

## ✅ Solución

### Paso 1: Obtener la URL Pública de Railway

La URL que me diste (`postgres.railway.internal:5432`) es **interna** y solo funciona desde dentro de Railway.

Para conectarte desde tu máquina local, necesitas la **URL pública**:

1. Ve a Railway Dashboard → Tu servicio **Postgres**
2. Pestaña **Variables** o **Connect**
3. Busca la URL que dice algo como:
   ```
   postgresql://postgres:PASSWORD@xxxx.proxy.rlwy.net:PORT/railway
   ```
   (NO la que dice `postgres.railway.internal`)

### Paso 2: Actualizar `.env` local

En `infra/prisma/.env`, usa la **URL pública**:

```env
DATABASE_URL=postgresql://postgres:CIcAzTslXvtZkhMeumvOFPOPHzLNYpXf@nozomi.proxy.rlwy.net:57027/railway
```

**Nota:** La URL pública tiene:
- Host: `xxxx.proxy.rlwy.net` (NO `postgres.railway.internal`)
- Puerto: `57027` (o el que muestre Railway)

### Paso 3: Actualizar Variable en Railway

En Railway → `@constanza/api-gateway` → Variables:

- **Para producción (desde Railway):** Usa `postgres.railway.internal:5432`
- **Para desarrollo local:** Usa la URL pública `xxxx.proxy.rlwy.net:PORT`

O mejor: Railway puede tener ambas configuradas automáticamente.

### Paso 4: Probar Conexión

```bash
cd infra/prisma
pnpm prisma db push --schema=schema.prisma
```

## 📋 URLs Diferentes

- **`postgres.railway.internal:5432`** → Solo funciona desde servicios dentro de Railway
- **`xxxx.proxy.rlwy.net:PORT`** → Funciona desde tu máquina local

## 🔍 Cómo Encontrar la URL Pública

En Railway Dashboard:
1. Postgres service → **Variables**
2. Busca `DATABASE_URL` o `POSTGRES_URL`
3. Debe tener formato: `postgresql://postgres:PASSWORD@HOST.proxy.rlwy.net:PORT/railway`

