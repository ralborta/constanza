# 🚨 Solución: Error 404/405 al Cargar Archivos

## ⚠️ Problema

Los errores que ves:
- **404** para `/v1/customers`
- **405** para `/customers/upload`

Indican que el servicio `api-gateway` en Railway **NO tiene el código actualizado** o **no está corriendo correctamente**.

## ✅ Las Tablas SÍ Existen

Las tablas están creadas en Postgres. El problema es que el **servicio api-gateway** no puede acceder a ellas o no está deployado correctamente.

## 🔧 Solución Paso a Paso

### Paso 1: Verificar que DATABASE_URL esté en Railway

1. Railway Dashboard → `@constanza/api-gateway` → **Variables**
2. Busca `DATABASE_URL`
3. Debe tener la URL **interna** de Railway:
   ```
   DATABASE_URL=postgresql://postgres:CIcAzTslXvtZkhMeumvOFPOPHzLNYpXf@postgres.railway.internal:5432/railway
   ```
4. Si no existe o está mal, **agrégala o corrígela**

### Paso 2: Verificar que el Servicio Esté Corriendo

1. Railway Dashboard → `@constanza/api-gateway` → **Logs**
2. Busca errores relacionados con:
   - "Cannot connect to database"
   - "DATABASE_URL not found"
   - "Route not found"
3. Verifica que el servicio esté **"Running"** (no "Stopped" o "Error")

### Paso 3: Forzar Redeploy

El código del endpoint está en el repo, pero Railway puede no haber deployado la última versión:

1. Railway Dashboard → `@constanza/api-gateway` → **Deployments**
2. Click en **"Redeploy"** o **"Deploy Latest Commit"**
3. Espera 2-3 minutos a que termine

### Paso 4: Verificar que el Endpoint Esté Disponible

Después del redeploy, prueba el endpoint directamente:

```bash
curl -X GET https://constanzaapi-gateway-prod.up.railway.app/v1/customers \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

O verifica el health check:

```bash
curl https://constanzaapi-gateway-prod.up.railway.app/health
```

## 🔍 Verificación de las Tablas

Para confirmar que las tablas existen, ejecuta esto desde Railway Query Editor:

```sql
-- Verificar usuarios creados
SELECT email, nombre, perfil FROM core.users;

-- Verificar tablas
SELECT schemaname, COUNT(*) 
FROM pg_tables 
WHERE schemaname IN ('core', 'pay', 'bindx', 'contact', 'ops')
GROUP BY schemaname;
```

Si ves los usuarios (`admin@constanza.com`, etc.), **las tablas están creadas**.

## 🎯 Causas Más Probables

1. **DATABASE_URL no configurada en Railway** → El servicio no puede conectarse a Postgres
2. **Servicio no deployado** → Railway no tiene el código con el endpoint `/customers/upload`
3. **Servicio caído** → El servicio está en estado "Error" o "Stopped"

## 📋 Checklist Rápido

- [ ] `DATABASE_URL` configurada en Railway → `@constanza/api-gateway` → Variables
- [ ] Servicio está "Running" (no "Error" o "Stopped")
- [ ] Último commit deployado (hacer Redeploy si es necesario)
- [ ] Logs no muestran errores de conexión a DB
- [ ] Endpoint `/v1/customers/upload` está registrado (código correcto)

## 🚀 Acción Inmediata

1. **Verifica DATABASE_URL en Railway** (Paso 1)
2. **Haz Redeploy del servicio** (Paso 3)
3. **Revisa los logs** para ver si hay errores (Paso 2)
4. **Prueba de nuevo** cargar el archivo

