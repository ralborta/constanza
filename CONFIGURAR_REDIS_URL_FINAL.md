# ✅ Configurar REDIS_URL - Instrucciones Finales

## 📋 Información de Redis

**Dominio público:** `redis-production-19f5.up.railway.app`  
**Puerto:** `6379`

## 🔧 Configurar REDIS_URL en Notifier

### Opción 1: URL Pública (Desde Internet)

1. **Ve a Railway Dashboard**
2. **Abre `@constanza/notifier`** → Variables
3. **"+ New Variable"**
4. **Name:** `REDIS_URL`
5. **Value:** 
   ```
   redis://redis-production-19f5.up.railway.app:6379
   ```
6. **Guarda**

### Opción 2: URL Interna (Más Rápida - Recomendada)

Si los servicios están en el mismo proyecto de Railway, usa el dominio interno:

1. **Ve a Railway Dashboard**
2. **Abre `@constanza/notifier`** → Variables
3. **"+ New Variable"**
4. **Name:** `REDIS_URL`
5. **Value:**
   ```
   redis://redis.railway.internal:6379
   ```
6. **Guarda**

## 🔍 Verificar si Necesita Password

Algunas instancias de Redis requieren password. Para verificar:

1. **Railway Dashboard → Redis → Variables**
2. **Busca `REDIS_PASSWORD` o similar**
3. **Si hay password, la URL sería:**
   ```
   redis://default:password@redis-production-19f5.up.railway.app:6379
   ```

## ✅ Después de Configurar

1. **Redeploy `@constanza/notifier`**
2. **Verifica logs** - Los errores `ECONNREFUSED` deberían desaparecer
3. **Deberías ver:** `🚀 Notifier running on http://0.0.0.0:3001`

## 📋 Resumen

**REDIS_URL a usar:**
- Pública: `redis://redis-production-19f5.up.railway.app:6379`
- Interna (recomendada): `redis://redis.railway.internal:6379`

**Agregar en:**
- `@constanza/notifier` → Variables → `REDIS_URL`
- `@constanza/api-gateway` (si también usa Redis)
- `@constanza/rail-cucuru` (si también usa Redis)

---

¿Quieres que verifique algo más después de configurar REDIS_URL?



