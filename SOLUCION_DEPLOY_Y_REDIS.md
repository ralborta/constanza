# 🚀 Solución: Deploy Manual + Configurar Redis

## ⚠️ Problemas Detectados

1. **Railway no hace deploy automático** (el `notifier` fue deployado hace 8 horas)
2. **Redis está disponible** pero falta configurar `REDIS_URL` en el `notifier`

---

## ✅ Solución Paso a Paso

### Paso 1: Configurar `REDIS_URL` en `notifier`

**Railway Dashboard** → `@constanza/notifier` → **Variables**

1. Busca si existe `REDIS_URL`
2. **Si NO existe**, agrega:
   ```
   REDIS_URL=redis://default:PASSWORD@redis-production-19f5.up.railway.app:6379
   ```
   (Reemplaza `PASSWORD` con la contraseña real de Redis)

3. **Para obtener la `REDIS_URL` correcta:**
   - Railway → Servicio `Redis` → **Variables**
   - Busca `REDIS_URL` o `DATABASE_URL`
   - Copia el valor completo

4. **Guarda** la variable

---

### Paso 2: Forzar Deploy del `notifier`

**Railway Dashboard** → `@constanza/notifier` → **Deployments**

1. Busca el botón **"Redeploy"** o **"New Deployment"**
2. Si no lo ves, click en los **tres puntos (...)** del último deployment
3. Selecciona **"Redeploy"**
4. Espera 2-3 minutos

**O si prefieres:**
1. Click en **"New Deployment"**
2. Selecciona el commit más reciente (`55aadef`)
3. Click en **"Deploy"**

---

### Paso 3: Verificar que Funcionó

**Railway Dashboard** → `@constanza/notifier` → **Logs**

**Deberías ver:**
```
🚀 Notifier running on http://0.0.0.0:3001
✅ Redis connected  ← ESTO DEBE APARECER (sin errores)
✅ Database connected
📬 Worker started, processing notifications...
```

**Si ves errores de Redis:**
- Verifica que `REDIS_URL` esté correcta
- Verifica que el servicio Redis esté corriendo

---

## 🎯 Por Qué No Hace Deploy Automático

**Posibles causas:**
1. **Auto-Deploy deshabilitado** en Railway → Settings → Deploy
2. **Webhook de GitHub no funciona** (GitHub → Repo → Settings → Webhooks)
3. **Railway no detecta los commits** (puede ser un problema temporal)

**Solución temporal:** Usar deploy manual (SIEMPRE funciona)

---

## 📋 Checklist

- [ ] Obtener `REDIS_URL` del servicio Redis en Railway
- [ ] Configurar `REDIS_URL` en `@constanza/notifier` → Variables
- [ ] Forzar deploy del `notifier` (Deployments → Redeploy)
- [ ] Verificar logs (debe decir "Redis connected" sin errores)
- [ ] Probar envío de email de nuevo

---

## 🚀 Acción Inmediata

1. **Railway** → Servicio `Redis` → Variables → Copia `REDIS_URL`
2. **Railway** → `@constanza/notifier` → Variables → Agrega `REDIS_URL`
3. **Railway** → `@constanza/notifier` → Deployments → Redeploy
4. **Espera 2-3 minutos**
5. **Verifica logs** (debe decir "Redis connected")

---

**Con Redis configurado y deployado, el envío de emails debería funcionar.**




