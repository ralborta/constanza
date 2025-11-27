# 🔍 Debug: Error 404/405 Persistente

## ⚠️ Problema

Después del redeploy, el error 404/405 sigue apareciendo.

## 🔍 Verificaciones Necesarias

### 1. Verificar Logs de Railway

**CRÍTICO**: Revisa los logs para ver qué está pasando realmente.

1. Railway Dashboard → `@constanza/api-gateway` → **Logs**
2. Busca:
   - Errores al iniciar el servicio
   - Mensajes sobre rutas registradas
   - Errores de conexión a DB
   - Cualquier mensaje en rojo

**Busca específicamente:**
- `Registering customer routes including /customers/upload`
- `Error connecting to database`
- `Cannot find module`
- `Route not found`

### 2. Verificar que el Servicio Esté Corriendo

1. Railway Dashboard → `@constanza/api-gateway`
2. Verifica el estado:
   - **"Running"** ✅ → El servicio está activo
   - **"Stopped"** ❌ → Necesitas iniciarlo
   - **"Error"** ❌ → Hay un problema, revisa logs

### 3. Verificar DATABASE_URL

1. Railway Dashboard → `@constanza/api-gateway` → **Variables**
2. Busca `DATABASE_URL`
3. Debe tener la URL **interna**:
   ```
   DATABASE_URL=postgresql://postgres:CIcAzTslXvtZkhMeumvOFPOPHzLNYpXf@postgres.railway.internal:5432/railway
   ```

**Si no existe o está mal:**
- Agrégalo o corrígelo
- Railway hará redeploy automáticamente

### 4. Probar el Endpoint Directamente

Desde tu terminal local:

```bash
# 1. Obtener el token JWT (inicia sesión en la app y copia el token del localStorage)
# 2. Probar el endpoint GET /v1/customers
curl -X GET https://constanzaapi-gateway-prod.up.railway.app/v1/customers \
  -H "Authorization: Bearer TU_TOKEN_JWT"

# 3. Probar el endpoint POST /v1/customers/upload (sin archivo primero)
curl -X POST https://constanzaapi-gateway-prod.up.railway.app/v1/customers/upload \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -H "Content-Type: multipart/form-data"
```

### 5. Verificar Orden de Rutas

El código tiene un comentario importante:
```typescript
// IMPORTANTE: Esta ruta debe estar ANTES de POST /customers para que Fastify la reconozca correctamente
```

Verifica que en `apps/api-gateway/src/routes/customers.ts`:
- `POST /customers/upload` esté **ANTES** de cualquier `POST /customers`
- No haya otra ruta que intercepte `/customers/upload`

### 6. Verificar que Multipart Esté Registrado

En `apps/api-gateway/src/index.ts` debe estar:
```typescript
await server.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
});
```

**Y debe estar ANTES de registrar las rutas.**

## 🚨 Posibles Causas

### Causa 1: Servicio No Puede Conectarse a DB

Si `DATABASE_URL` está mal o no existe, el servicio puede estar fallando silenciosamente.

**Solución**: Verificar y corregir `DATABASE_URL` en Railway Variables.

### Causa 2: Código No Se Deployó Correctamente

El build puede haber fallado pero Railway no lo muestra claramente.

**Solución**: 
1. Revisar logs del build
2. Verificar que el commit deployado sea `f956ae9` o más reciente
3. Hacer redeploy con "Clear build cache"

### Causa 3: Ruta No Está Registrada

Fastify puede no estar registrando la ruta correctamente.

**Solución**: Verificar logs al iniciar el servicio. Debe mostrar:
```
Registering customer routes including /customers/upload
```

### Causa 4: Orden de Rutas Incorrecto

Si hay otra ruta que intercepta `/customers/upload`, puede causar 405.

**Solución**: Verificar que no haya `POST /customers` antes de `POST /customers/upload`.

## 📋 Checklist de Debug

- [ ] Servicio está "Running" (no "Error" o "Stopped")
- [ ] Logs muestran "Registering customer routes including /customers/upload"
- [ ] `DATABASE_URL` está configurada correctamente
- [ ] No hay errores en los logs al iniciar
- [ ] El commit deployado es `f956ae9` o más reciente
- [ ] Multipart está registrado antes de las rutas
- [ ] `POST /customers/upload` está antes de `POST /customers`

## 🎯 Próximo Paso

**Comparte los logs de Railway** (especialmente los primeros mensajes al iniciar) para identificar el problema exacto.





