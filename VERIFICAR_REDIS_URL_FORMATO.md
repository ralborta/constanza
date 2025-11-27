# 🔍 Verificar Formato de `REDIS_URL`

## ⚠️ URL Actual

```
redis://redis-production-19f5.up.railway.app:6379
```

**Problema:** Esta URL **NO tiene usuario ni contraseña**.

---

## ✅ Formato Correcto de `REDIS_URL`

Las URLs de Redis en Railway típicamente tienen este formato:

```
redis://default:PASSWORD@redis-production-19f5.up.railway.app:6379
```

**O si es interno:**
```
redis://default:PASSWORD@redis.railway.internal:6379
```

---

## 🔍 Verificación

### Paso 1: Verificar Variables del Servicio Redis

**Railway Dashboard** → Servicio `Redis` → **Variables**

**Busca:**
- `REDIS_URL` (nombre más común)
- `DATABASE_URL` (si Railway usa ese nombre)
- `REDISCLOUD_URL` (si es Upstash)
- Cualquier variable que contenga `redis://`

**La URL correcta debe tener:**
- ✅ Protocolo: `redis://`
- ✅ Usuario: `default` (o el usuario que Railway asigne)
- ✅ Contraseña: `PASSWORD` (la contraseña real)
- ✅ Host: `redis-production-19f5.up.railway.app` (o similar)
- ✅ Puerto: `:6379`

**Formato completo:**
```
redis://default:CONTRASEÑA_REAL@redis-production-19f5.up.railway.app:6379
```

---

### Paso 2: Si la URL NO Tiene Usuario/Contraseña

**Opción A: Railway No Requiere Autenticación**

Si Railway generó la URL sin usuario/contraseña, puede funcionar. Prueba:

1. **Railway** → `@constanza/notifier` → Variables
2. Agrega/Edita `REDIS_URL` con el valor que viste
3. Redeploy el `notifier`
4. Verifica logs

**Si sigue fallando**, necesitas el formato completo con usuario/contraseña.

---

**Opción B: Obtener URL Completa**

1. **Railway** → Servicio `Redis` → **Settings** → **"Connect"** o **"Connection"**
2. Railway puede mostrar la URL completa con credenciales
3. O busca en **Variables** una variable que tenga el formato completo

---

## 🎯 Acción Inmediata

1. **Railway** → Servicio `Redis` → **Variables**
   - Busca TODAS las variables relacionadas con Redis
   - Copia la que tenga el formato completo con usuario/contraseña

2. **Railway** → `@constanza/notifier` → **Variables**
   - Agrega/Edita `REDIS_URL` con el valor completo
   - Debe incluir: `redis://default:PASSWORD@HOST:PORT`

3. **Redeploy** el `notifier`

4. **Verifica logs:**
   - Debe decir: `✅ Redis connected` (sin errores)

---

## ⚠️ Si No Encuentras la URL Completa

**Railway Dashboard** → Servicio `Redis` → **Settings** → **"Connect"**

Railway puede mostrar la URL de conexión completa con credenciales ahí.

---

**La URL que mostraste puede funcionar si Railway no requiere autenticación, pero es más probable que necesites el formato completo con usuario/contraseña.**




