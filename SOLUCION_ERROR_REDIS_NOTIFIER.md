# 🔧 Solución: Error de Conexión a Redis en `notifier`

## ⚠️ Problema Detectado

Los logs muestran:
```
[ioredis] Unhandled error event: Error: connect ETIMEDOUT
```

**Esto significa que el `notifier` NO puede conectarse a Redis.**

**Sin Redis, el `notifier` NO puede funcionar** porque usa BullMQ (cola de mensajes) que requiere Redis.

---

## ✅ Solución

### Paso 1: Verificar si Existe un Servicio Redis en Railway

**Railway Dashboard** → Tu proyecto

**Busca un servicio llamado:**
- `Redis`
- `Upstash Redis`
- O cualquier servicio de Redis

**Si NO existe:**
- Necesitas crear uno (ver Paso 2)

**Si SÍ existe:**
- Necesitas obtener la `REDIS_URL` (ver Paso 3)

---

### Paso 2: Crear Servicio Redis en Railway (Si No Existe)

**Opción A: Redis de Railway (Recomendado para desarrollo)**

1. **Railway Dashboard** → Tu proyecto → **"+ New"**
2. Selecciona **"Database"** → **"Add Redis"**
3. Railway creará un servicio Redis automáticamente
4. Obtén la `REDIS_URL` desde el servicio (ver Paso 3)

**Opción B: Upstash Redis (Recomendado para producción)**

1. Crea cuenta en [Upstash](https://upstash.com/)
2. Crea un Redis database
3. Copia la `REDIS_URL` (formato: `redis://default:PASSWORD@HOST:PORT`)

---

### Paso 3: Obtener `REDIS_URL` del Servicio Redis

**Si usas Redis de Railway:**

1. **Railway Dashboard** → Servicio `Redis` → **Variables**
2. Busca `REDIS_URL` o `DATABASE_URL`
3. Copia el valor completo

**Formato típico:**
```
redis://default:PASSWORD@HOST:PORT
```

**Si NO aparece `REDIS_URL`:**
- Railway puede usar otro nombre
- Busca variables que contengan `redis://` o `REDIS`
- O crea la variable manualmente (ver Paso 4)

---

### Paso 4: Configurar `REDIS_URL` en el `notifier`

**Railway Dashboard** → `@constanza/notifier` → **Variables**

**Agrega o edita:**
```
REDIS_URL=redis://default:PASSWORD@HOST:PORT
```

**Reemplaza:**
- `PASSWORD` → La contraseña de tu Redis
- `HOST` → El host de tu Redis
- `PORT` → El puerto de tu Redis (típicamente 6379)

**Ejemplo:**
```
REDIS_URL=redis://default:abc123xyz@redis.railway.internal:6379
```

**O si es público:**
```
REDIS_URL=redis://default:abc123xyz@redis-production.up.railway.app:6379
```

---

### Paso 5: Redeploy el `notifier`

Después de configurar `REDIS_URL`:

1. **Railway Dashboard** → `@constanza/notifier` → **Deployments**
2. Click en **"Redeploy"**
3. Espera 2-3 minutos

---

### Paso 6: Verificar que Redis Esté Conectado

**Railway Dashboard** → `@constanza/notifier` → **Logs**

**Deberías ver:**
```
🚀 Notifier running on http://0.0.0.0:3001
✅ Redis connected  ← ESTO DEBE APARECER
✅ Database connected
📬 Worker started, processing notifications...
```

**Si ves errores de Redis:**
- Verifica que `REDIS_URL` esté correcta
- Verifica que el servicio Redis esté corriendo
- Verifica que el `notifier` pueda alcanzar el Redis (mismo proyecto en Railway)

---

## 🔍 Verificación Rápida

### Checklist:

- [ ] Existe un servicio Redis en Railway
- [ ] `REDIS_URL` está configurada en `@constanza/notifier` → Variables
- [ ] `REDIS_URL` tiene el formato correcto (`redis://...`)
- [ ] El `notifier` fue redeployado después de configurar `REDIS_URL`
- [ ] Los logs del `notifier` muestran "Redis connected" (sin errores)

---

## 🎯 Por Qué Falla el Envío de Emails

**Flujo actual:**
1. Frontend → `api-gateway` → Crea batchJob ✅
2. `api-gateway` → `notifier` → Intenta agregar mensaje a cola ❌
3. `notifier` → Redis → **FALLA** (no puede conectarse) ❌
4. `notifier` → No puede procesar mensajes ❌
5. `api-gateway` → Devuelve 503 ❌

**Con Redis configurado:**
1. Frontend → `api-gateway` → Crea batchJob ✅
2. `api-gateway` → `notifier` → Agrega mensaje a cola ✅
3. `notifier` → Redis → **CONECTADO** ✅
4. Worker procesa mensaje de la cola ✅
5. Email se envía ✅

---

## 🚀 Acción Inmediata

1. **Verifica si existe Redis** en Railway
2. **Si NO existe:** Crea uno (Railway → "+ New" → "Add Redis")
3. **Obtén `REDIS_URL`** del servicio Redis
4. **Configura `REDIS_URL`** en `@constanza/notifier` → Variables
5. **Redeploy `notifier`**
6. **Verifica logs** (debe decir "Redis connected")
7. **Prueba enviar email** de nuevo

---

**El problema NO es el deploy, es que falta `REDIS_URL` configurada en el `notifier`.**




