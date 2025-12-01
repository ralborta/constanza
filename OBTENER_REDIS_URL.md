# 🔍 Cómo Obtener REDIS_URL de Railway

## ✅ Redis Creado

Redis ya está creado en Railway.

## 🔍 Cómo Obtener REDIS_URL

### Opción 1: Desde Railway Dashboard (Más Fácil)

1. **Ve a Railway Dashboard**
2. **Abre el servicio `Redis`**
3. **Pestaña "Variables"**
4. **Busca `REDIS_URL`** en "Variables added by Railway"
5. **Si no aparece, espera 1-2 minutos** (Railway a veces tarda)

### Opción 2: Desde Railway Dashboard → Redis → Connect

1. **Ve a Railway Dashboard**
2. **Abre el servicio `Redis`**
3. **Busca botón "Connect" o información de conexión**
4. **Ahí debería aparecer la URL de conexión**

### Opción 3: Formato Manual

Si Railway no muestra `REDIS_URL`, el formato típico es:

```
redis://default:password@host:puerto
```

O si Railway usa el dominio interno:

```
redis://redis.railway.internal:6379
```

## 📋 Configurar REDIS_URL en Notifier

Una vez que tengas la `REDIS_URL`:

1. **Ve a `@constanza/notifier`** → Variables
2. **"+ New Variable"**
3. **Name:** `REDIS_URL`
4. **Value:** La URL que obtuviste
5. **Guarda**
6. **Redeploy notifier**

## 🔍 Verificar en Railway Dashboard

**Railway Dashboard → Redis → Variables:**

Deberías ver algo como:
- `REDIS_URL=redis://default:password@containers-us-west-xxx.railway.app:6379`

O si usa dominio interno:
- `REDIS_URL=redis://redis.railway.internal:6379`

## 💡 Nota

Railway a veces tarda 1-2 minutos en agregar las variables automáticamente después de crear Redis.

Si después de esperar no aparece, puedes:
1. Usar el dominio interno: `redis://redis.railway.internal:6379`
2. O verificar en Railway Dashboard → Redis → Connect/Networking

---

¿Puedes verificar en Railway Dashboard → Redis → Variables si aparece REDIS_URL?



