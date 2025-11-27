# 🔧 Solución: Error `ETIMEDOUT` en Redis

## ⚠️ Problema Confirmado

Los logs muestran:
```
Error: connect ETIMEDOUT
at ioredis/built/Redis.js:171:41
```

**Esto significa que el `notifier` NO puede conectarse a Redis.**

**Causa:** Falta `REDIS_URL` o está mal configurada.

---

## ✅ Solución Paso a Paso

### Paso 1: Obtener `REDIS_URL` del Servicio Redis

**Railway Dashboard** → Servicio `Redis` → **Variables**

**Busca:**
- `REDIS_URL` (nombre más común)
- O `DATABASE_URL` (si Railway usa ese nombre)

**Copia el valor completo.** Debe verse algo así:
```
redis://default:PASSWORD@redis-production-19f5.up.railway.app:6379
```

**O si es interno:**
```
redis://default:PASSWORD@redis.railway.internal:6379
```

---

### Paso 2: Configurar `REDIS_URL` en el `notifier`

**Railway Dashboard** → `@constanza/notifier` → **Variables**

1. Busca si existe `REDIS_URL`
2. **Si NO existe:**
   - Click en **"+ New Variable"** o **"Add Variable"**
   - Name: `REDIS_URL`
   - Value: (pega el valor que copiaste del servicio Redis)
   - Click en **"Add"** o **"Save"**

3. **Si SÍ existe pero está vacía o incorrecta:**
   - Click en `REDIS_URL`
   - Edita el valor
   - Pega el valor correcto del servicio Redis
   - Guarda

---

### Paso 3: Redeploy el `notifier`

**Railway Dashboard** → `@constanza/notifier` → **Deployments**

1. Click en **"Redeploy"** o **"New Deployment"**
2. Selecciona el commit más reciente
3. Click en **"Deploy"**
4. **Espera 2-3 minutos**

---

### Paso 4: Verificar que Funcionó

**Railway Dashboard** → `@constanza/notifier` → **Logs**

**Deberías ver:**
```
🚀 Notifier running on http://0.0.0.0:3001
✅ Redis connected  ← ESTO DEBE APARECER (sin errores)
✅ Database connected
📬 Worker started, processing notifications...
```

**Si SIGUES viendo errores de Redis:**
- Verifica que `REDIS_URL` tenga el formato correcto
- Verifica que el servicio Redis esté corriendo
- Verifica que el `notifier` pueda alcanzar el Redis (mismo proyecto)

---

## 🎯 Formato Correcto de `REDIS_URL`

**✅ Correcto:**
```
redis://default:PASSWORD@redis-production-19f5.up.railway.app:6379
```

**❌ Incorrecto:**
```
redis://localhost:6379  (no funciona en Railway)
redis://redis:6379  (falta usuario/password)
REDIS_URL=redis://...  (no incluyas el nombre de la variable)
```

---

## 📋 Checklist

- [ ] Obtener `REDIS_URL` del servicio Redis en Railway
- [ ] Configurar `REDIS_URL` en `@constanza/notifier` → Variables
- [ ] Guardar la variable
- [ ] Redeploy el `notifier`
- [ ] Verificar logs (debe decir "Redis connected" sin errores)
- [ ] Probar envío de email de nuevo

---

## 🚀 Acción Inmediata

1. **Railway** → Servicio `Redis` → Variables → Copiar `REDIS_URL`
2. **Railway** → `@constanza/notifier` → Variables → Agregar/Editar `REDIS_URL`
3. **Railway** → `@constanza/notifier` → Deployments → Redeploy
4. **Espera 2-3 minutos**
5. **Verifica logs** (debe decir "Redis connected")

---

**Con `REDIS_URL` configurada correctamente, el error `ETIMEDOUT` desaparecerá y el `notifier` podrá conectarse a Redis.**




