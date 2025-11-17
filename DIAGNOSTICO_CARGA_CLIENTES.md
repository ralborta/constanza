# 🔍 Diagnóstico: Por qué no se pueden cargar archivos de clientes

## ✅ Verificaciones Rápidas

### 1. Verificar que el endpoint existe y está registrado

El endpoint `/v1/customers/upload` está configurado en:
- `apps/api-gateway/src/routes/customers.ts` (línea 119)
- Requiere autenticación y perfil `ADM` o `OPERADOR_1`
- El plugin `@fastify/multipart` está registrado en `apps/api-gateway/src/index.ts`

### 2. Verificar permisos del usuario

**El usuario debe tener perfil `ADM` o `OPERADOR_1`** para poder cargar archivos.

Para verificar:
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Application" → "Local Storage"
3. Busca el token JWT y decodifícalo en [jwt.io](https://jwt.io)
4. Verifica que el campo `perfil` sea `ADM` o `OPERADOR_1`

### 3. Verificar que las tablas existen

Las tablas necesarias son:
- `core.customers` (tabla principal de clientes)
- `core.customer_cuits` (tabla de CUITs de clientes)

**Para verificar desde Railway:**

```bash
# En Railway Shell del servicio api-gateway
cd infra/prisma
pnpm prisma db execute --stdin <<EOF
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema = 'core' 
AND table_name IN ('customers', 'customer_cuits')
ORDER BY table_name;
EOF
```

**O usar Prisma Studio:**
```bash
cd infra/prisma
pnpm prisma studio
```

### 4. Verificar conexión a la base de datos

El endpoint ya verifica la conexión automáticamente. Si hay un error de conexión, verás un mensaje como:
```
Error de conexión a la base de datos: [detalles del error]
```

**Para verificar manualmente:**
```bash
# En Railway Shell
cd infra/prisma
pnpm prisma db execute --stdin <<EOF
SELECT 1;
EOF
```

### 5. Verificar logs del servidor

En Railway:
1. Ve a `@constanza/api-gateway` → Logs
2. Busca mensajes que empiecen con:
   - `POST /customers/upload endpoint called`
   - `Starting file upload processing`
   - `File received`
   - `Database connection OK`

Si no ves estos mensajes, el endpoint no se está llamando correctamente.

## 🚨 Errores Comunes y Soluciones

### Error: "No se envió ningún archivo"

**Causa:** El archivo no se está enviando correctamente desde el frontend.

**Solución:**
1. Verifica que el archivo sea `.xlsx` o `.xls`
2. Verifica que el tamaño sea menor a 10MB
3. Abre la consola del navegador y verifica que no haya errores de CORS

### Error: "Error de conexión a la base de datos"

**Causa:** La variable `DATABASE_URL` no está configurada o es incorrecta.

**Solución:**
1. Railway → `@constanza/api-gateway` → Variables
2. Verifica que existe `DATABASE_URL` con el valor correcto
3. Debe ser algo como: `postgresql://postgres:...@nozomi.proxy.rlwy.net:57027/railway`

### Error: "relation does not exist" o "schema does not exist"

**Causa:** Las tablas no existen en la base de datos.

**Solución:**
```bash
# En Railway Shell
cd infra/prisma
pnpm prisma db push
```

### Error: 401 Unauthorized o 403 Forbidden

**Causa:** El usuario no tiene permisos suficientes.

**Solución:**
1. Verifica que el usuario tenga perfil `ADM` o `OPERADOR_1`
2. Si no, actualiza el perfil del usuario en la base de datos:
```sql
UPDATE core.users 
SET perfil = 'ADM' 
WHERE email = 'tu-email@ejemplo.com';
```

### Error: "Network Error" o "ERR_NETWORK"

**Causa:** El frontend no puede conectarse al backend.

**Solución:**
1. Verifica que `NEXT_PUBLIC_API_URL` esté configurada en Vercel
2. Debe apuntar a la URL de Railway: `https://api-gateway-production.up.railway.app`
3. Haz redeploy de la aplicación web

## 🔧 Pasos de Diagnóstico Paso a Paso

### Paso 1: Verificar desde el navegador

1. Abre la aplicación web
2. Ve a la página de Clientes
3. Abre la consola del navegador (F12)
4. Intenta cargar un archivo
5. Revisa los errores en la consola

### Paso 2: Verificar logs del servidor

1. Railway → `@constanza/api-gateway` → Logs
2. Intenta cargar un archivo
3. Busca mensajes de error o warnings

### Paso 3: Verificar base de datos

1. Railway → `@constanza/api-gateway` → Shell
2. Ejecuta:
```bash
cd infra/prisma
pnpm prisma studio
```
3. Verifica que existan las tablas `customers` y `customer_cuits` en el esquema `core`

### Paso 4: Probar el endpoint directamente

Usa curl o Postman para probar el endpoint:

```bash
curl -X POST https://api-gateway-production.up.railway.app/v1/customers/upload \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -F "file=@clientes.xlsx"
```

## 📋 Checklist Final

- [ ] El usuario tiene perfil `ADM` o `OPERADOR_1`
- [ ] Las tablas `core.customers` y `core.customer_cuits` existen
- [ ] La variable `DATABASE_URL` está configurada en Railway
- [ ] La variable `NEXT_PUBLIC_API_URL` está configurada en Vercel
- [ ] El archivo es `.xlsx` o `.xls` y tiene menos de 10MB
- [ ] El archivo tiene las columnas requeridas: Código Único, Razón Social, Email
- [ ] No hay errores de CORS en la consola del navegador
- [ ] Los logs del servidor muestran que el endpoint se está llamando

## 💡 Si Nada Funciona

1. **Verifica los logs completos** en Railway para ver el error exacto
2. **Prueba con un archivo Excel simple** con solo 1-2 filas para aislar el problema
3. **Verifica el formato del Excel** - debe tener las columnas correctas en la primera fila
4. **Contacta al equipo** con los logs y el error específico que estás viendo

