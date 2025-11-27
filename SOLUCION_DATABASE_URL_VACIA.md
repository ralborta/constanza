# 🔧 Solución: DATABASE_URL Vacía o Mal Configurada

## ⚠️ Error Actual

```
Error de conexión a la base de datos: Invalid `prisma.$queryRaw()` invocation: 
error: Error validating datasource 'db': the URL must start with the protocol 
`postgresql://' or 'postgres://`
```

**Significado:** `DATABASE_URL` no está configurada o está vacía en Railway para el servicio `@constanza/api-gateway`.

---

## ✅ Solución Paso a Paso

### Paso 1: Obtener DATABASE_URL de Railway

1. **Railway Dashboard** → Tu proyecto
2. Busca el servicio **Postgres** (o PostgreSQL)
3. Click en el servicio → Pestaña **Variables**
4. Busca `DATABASE_URL` o `POSTGRES_URL`
5. **Copia la URL completa** (debe empezar con `postgresql://`)

**Formato esperado:**
```
postgresql://postgres:PASSWORD@HOST.proxy.rlwy.net:PORT/railway
```

**O si es interna (para servicios dentro de Railway):**
```
postgresql://postgres:PASSWORD@postgres.railway.internal:5432/railway
```

---

### Paso 2: Configurar DATABASE_URL en api-gateway

1. **Railway Dashboard** → Tu proyecto
2. Click en el servicio **`@constanza/api-gateway`**
3. Pestaña **Variables**
4. Busca `DATABASE_URL`
5. **Si NO existe:**
   - Click en **"New Variable"**
   - Name: `DATABASE_URL`
   - Value: Pega la URL que copiaste del servicio Postgres
   - Click **"Add"**

6. **Si existe pero está vacía o mal formateada:**
   - Click en **"Edit"**
   - Value: Pega la URL correcta
   - Click **"Save"**

---

### Paso 3: Verificar que la URL sea Correcta

La URL debe:
- ✅ Empezar con `postgresql://` o `postgres://`
- ✅ Tener formato: `postgresql://usuario:password@host:puerto/database`
- ✅ NO estar vacía
- ✅ NO tener espacios al inicio o final

**Ejemplo correcto:**
```
postgresql://postgres:CIcAzTslXvtZkhMeumvOFPOPHzLNYpXf@nozomi.proxy.rlwy.net:57027/railway
```

**Ejemplo incorrecto:**
```
DATABASE_URL=  (vacía)
postgres.railway.internal:5432  (falta protocolo)
```

---

### Paso 4: Redeploy del Servicio

Después de configurar `DATABASE_URL`:

1. Railway hará **redeploy automático** del servicio
2. O manualmente: Click en **"..."** → **"Redeploy"**
3. Espera 2-3 minutos a que termine el deploy

---

### Paso 5: Verificar que Funciona

1. **Railway** → `@constanza/api-gateway` → **Logs**
2. Busca mensajes de inicio:
   ```
   🚀 API-GATEWAY vCORS-FIX DESPLEGADO
   🚀 API Gateway running on http://0.0.0.0:3000
   ```
3. **NO deberías ver** errores de Prisma sobre `DATABASE_URL`

4. **Probar carga de clientes:**
   - Abre la app en Vercel
   - Intenta cargar un archivo Excel
   - Debería funcionar sin el error de `DATABASE_URL`

---

## 🔍 Verificar si la DB Tiene Datos

Para verificar si la base de datos tiene datos:

### Opción 1: Desde Railway Shell

1. Railway → `@constanza/api-gateway` → **Shell**
2. Ejecuta:
   ```bash
   cd infra/prisma
   pnpm prisma studio
   ```
   (Esto abrirá Prisma Studio en tu navegador)

### Opción 2: Desde tu máquina local

1. Configura `DATABASE_URL` en `infra/prisma/.env` con la URL pública
2. Ejecuta:
   ```bash
   cd infra/prisma
   pnpm prisma studio
   ```

### Opción 3: Query directo

Si tienes acceso a Railway Shell:

```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"core\".\"Customer\";"
```

---

## 🚨 Problemas Comunes

### Problema 1: "DATABASE_URL is not defined"

**Causa:** La variable no está configurada en Railway.

**Solución:** Seguir Paso 2 para agregarla.

### Problema 2: "the URL must start with the protocol"

**Causa:** La URL está vacía o mal formateada.

**Solución:** Verificar que la URL empiece con `postgresql://` o `postgres://`.

### Problema 3: "Authentication failed"

**Causa:** La URL tiene credenciales incorrectas.

**Solución:** Obtener la URL correcta del servicio Postgres en Railway.

---

## 📋 Checklist

- [ ] `DATABASE_URL` configurada en Railway → `@constanza/api-gateway` → Variables
- [ ] URL empieza con `postgresql://` o `postgres://`
- [ ] URL no está vacía
- [ ] Redeploy completado
- [ ] Logs de `api-gateway` no muestran errores de Prisma
- [ ] Carga de clientes funciona sin error de `DATABASE_URL`

---

## 🎯 Próximo Paso

**Configura `DATABASE_URL` en Railway** siguiendo los pasos de arriba y luego prueba de nuevo cargar el archivo Excel.

Si después de configurar `DATABASE_URL` sigue fallando, comparte:
1. Los logs de `api-gateway` en Railway
2. El error exacto que aparece al cargar el archivo





