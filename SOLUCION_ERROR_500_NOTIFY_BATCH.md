# 🔧 Solución: Error 500 en `/v1/notify/batch`

## ⚠️ Error Actual

```
Error al crear batch de notificaciones
Status: 500
```

## 🔍 Posibles Causas

### 1. `NOTIFIER_URL` No Configurada en `api-gateway`

**Síntoma**: Error 500 al intentar enviar notificaciones

**Solución**:
1. **Railway Dashboard** → `@constanza/api-gateway` → **Variables**
2. Verifica que exista `NOTIFIER_URL`
3. Si no existe, agrega:
   ```
   NOTIFIER_URL=https://notifier-production.up.railway.app
   ```
   (O el dominio público que Railway asignó al servicio `notifier`)

### 2. Servicio `notifier` No Está Corriendo

**Síntoma**: Error de conexión o timeout

**Verificación**:
1. **Railway Dashboard** → `@constanza/notifier` → **Logs**
2. Deberías ver:
   ```
   🚀 Notifier running on http://0.0.0.0:3001
   ✅ Redis connected
   ✅ Database connected
   ```
3. Si no ves esto, el servicio está caído → **Redeploy**

### 3. Error en Base de Datos al Crear `batchJob`

**Síntoma**: Error relacionado con Prisma o database

**Verificación**:
1. **Railway Dashboard** → `@constanza/api-gateway` → **Logs**
2. Busca errores relacionados con:
   - `batchJob`
   - `prisma`
   - `database`
   - `connection`

**Solución**:
- Verifica que `DATABASE_URL` esté configurada correctamente
- Verifica que las tablas existan (especialmente `batch_jobs`)

## 🔧 Pasos de Diagnóstico

### Paso 1: Verificar `NOTIFIER_URL` en `api-gateway`

1. **Railway Dashboard** → `@constanza/api-gateway` → **Variables**
2. Busca `NOTIFIER_URL`
3. **Si NO existe**:
   - Ve a `@constanza/notifier` → **Settings → Networking**
   - Copia el **Public Domain** (ej: `notifier-production.up.railway.app`)
   - Ve a `@constanza/api-gateway` → **Variables**
   - Agrega: `NOTIFIER_URL=https://notifier-production.up.railway.app`
   - Guarda y redeploy `api-gateway`

### Paso 2: Verificar que `notifier` Esté Corriendo

1. **Railway Dashboard** → `@constanza/notifier` → **Logs**
2. Verifica que veas:
   ```
   🚀 Notifier running on http://0.0.0.0:3001
   ```
3. **Si no está corriendo**:
   - Ve a **Deployments**
   - Click en **"Redeploy"**
   - Espera a que termine

### Paso 3: Verificar Health Check del Notifier

Desde tu máquina o desde Railway logs, verifica:

```bash
curl https://notifier-production.up.railway.app/health
```

Debería responder:
```json
{
  "status": "ok",
  "service": "notifier",
  "queue": { ... }
}
```

**Si no responde** → El servicio está caído

### Paso 4: Verificar Logs Detallados

1. **Railway Dashboard** → `@constanza/api-gateway` → **Logs**
2. Intenta enviar un mensaje desde el frontend
3. Busca en los logs:
   - `NOTIFIER_URL: ...` (debería mostrar la URL configurada)
   - `Error creating batch notification`
   - `Error queuing message`
   - `ECONNREFUSED` o `timeout`

## ✅ Solución Rápida

### Si `NOTIFIER_URL` No Está Configurada:

1. **Railway Dashboard** → `@constanza/notifier` → **Settings → Networking**
2. Copia el **Public Domain**
3. **Railway Dashboard** → `@constanza/api-gateway` → **Variables**
4. Agrega:
   ```
   NOTIFIER_URL=https://[TU_DOMINIO_PUBLICO_DEL_NOTIFIER]
   ```
5. Guarda
6. **Redeploy** `api-gateway`

### Si el `notifier` Está Caído:

1. **Railway Dashboard** → `@constanza/notifier` → **Deployments**
2. Click en **"Redeploy"**
3. Espera 2-3 minutos
4. Verifica logs para confirmar que está corriendo

## 📋 Checklist de Verificación

- [ ] `NOTIFIER_URL` configurada en `api-gateway`
- [ ] Servicio `notifier` está corriendo (ver logs)
- [ ] Health check del notifier responde OK
- [ ] `DATABASE_URL` configurada en ambos servicios
- [ ] `REDIS_URL` configurada en `notifier`
- [ ] Variables SMTP configuradas en `notifier` (si usas email)

## 🎯 Próximos Pasos

1. **Verifica `NOTIFIER_URL`** en Railway → `api-gateway` → Variables
2. **Verifica que `notifier` esté corriendo** en Railway → `notifier` → Logs
3. **Intenta enviar un mensaje de nuevo** desde el frontend
4. **Revisa los logs** de `api-gateway` para ver el error específico

---

**Con los logs mejorados que acabo de agregar, ahora verás mensajes de error más específicos que te dirán exactamente qué está fallando.**




