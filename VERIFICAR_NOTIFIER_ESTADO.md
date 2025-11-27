# 🔍 Verificar Estado del `notifier`

## ⚠️ Problema

El `notifier` no responde al health check. Esto significa que:
- El servicio está caído, O
- El servicio está corriendo pero tiene errores, O
- Falta alguna configuración crítica

---

## ✅ Verificaciones en Railway

### Paso 1: Ver Logs del `notifier`

**Railway Dashboard** → `@constanza/notifier` → **Logs**

**¿Qué ves?**

**Si NO hay logs o están vacíos:**
- El servicio está caído
- **Solución:** Redeploy

**Si hay errores de Redis:**
```
[ioredis] Unhandled error event: Error: connect ETIMEDOUT
```
- Falta `REDIS_URL`
- **Solución:** Configurar `REDIS_URL` y redeploy

**Si hay errores de Database:**
```
Error: Can't reach database server
```
- Falta `DATABASE_URL` o está incorrecta
- **Solución:** Verificar `DATABASE_URL`

**Si ves:**
```
🚀 Notifier running on http://0.0.0.0:3001
✅ Redis connected
✅ Database connected
```
- El servicio está corriendo correctamente
- El problema puede ser de red/conectividad

---

### Paso 2: Verificar Variables del `notifier`

**Railway Dashboard** → `@constanza/notifier` → **Variables**

**Debe tener TODAS estas variables:**

- ✅ `DATABASE_URL` (para conectar a Postgres)
- ✅ `REDIS_URL` (para la cola de mensajes) ← **CRÍTICO**
- ✅ `SMTP_HOST` (opcional, para enviar emails)
- ✅ `SMTP_PORT` (opcional)
- ✅ `SMTP_USER` (opcional)
- ✅ `SMTP_PASS` (opcional)

**Si falta `REDIS_URL`:**
1. Railway → Servicio `Redis` → Variables
2. Copia el valor de `REDIS_URL` (o `DATABASE_URL` si ese es el nombre)
3. Railway → `@constanza/notifier` → Variables
4. Agrega `REDIS_URL` con el valor copiado
5. Guarda
6. Redeploy el `notifier`

---

### Paso 3: Verificar Estado del Deployment

**Railway Dashboard** → `@constanza/notifier` → **Deployments**

**¿Qué estado tiene el último deployment?**

- ✅ **"Active"** (verde) = Deploy exitoso
- ⚠️ **"Building"** o **"Deploying"** = Aún en proceso
- ❌ **"Failed"** (rojo) = Deploy falló

**Si está "Failed":**
- Click en el deployment → **Logs**
- Busca el error específico
- Corrígelo y redeploy

---

### Paso 4: Verificar Networking Público

**Railway Dashboard** → `@constanza/notifier` → **Settings** → **Networking**

**Debe tener:**
- ✅ **"Public Networking"** habilitado
- ✅ Un dominio público: `constanzanotifier-production.up.railway.app`

**Si NO tiene dominio público:**
- El servicio no es accesible desde fuera
- **Solución:** Habilitar networking público en Settings

---

## 🎯 Acción Inmediata

1. **Railway** → `@constanza/notifier` → **Logs**
   - ¿Qué ves? ¿Errores? ¿Está corriendo?

2. **Railway** → `@constanza/notifier` → **Variables**
   - ¿Está `REDIS_URL` configurada?

3. **Railway** → `@constanza/notifier` → **Deployments**
   - ¿Qué estado tiene el último deployment?

---

## 📋 Resumen

**Si el servicio no responde, verifica:**

- [ ] Logs del `notifier` (¿está corriendo?)
- [ ] Variables del `notifier` (¿`REDIS_URL` configurada?)
- [ ] Estado del deployment (¿"Active"?)
- [ ] Networking público (¿habilitado?)

---

**Copia aquí qué ves en los logs del `notifier` para diagnosticar el problema específico.**




