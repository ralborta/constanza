# 🚀 Redeploy de Todos los Servicios - Orden Correcto

## ✅ Orden de Redeploy (Importante)

**Hazlo en este orden para evitar problemas:**

1. **Redis** (si tiene cambios, pero generalmente no necesita)
2. **Postgres** (si tiene cambios, pero generalmente no necesita)
3. **`@constanza/notifier`** ← **CRÍTICO** (necesita REDIS_URL)
4. **`@constanza/api-gateway`** ← **CRÍTICO** (necesita NOTIFIER_URL)
5. **`@constanza/rail-cucuru`** (si tiene cambios)

---

## 📋 Paso a Paso

### Paso 1: Redis (Opcional)

**Railway** → Servicio `Redis` → **Deployments**

- **Solo redeploy si hiciste cambios en la configuración**
- Si no, **SALTAR este paso**

---

### Paso 2: Postgres (Opcional)

**Railway** → Servicio `Postgres` → **Deployments**

- **Solo redeploy si hiciste cambios en la configuración**
- Si no, **SALTAR este paso**

---

### Paso 3: `@constanza/notifier` ⚠️ **CRÍTICO**

**ANTES de redeploy:**

1. **Railway** → `@constanza/notifier` → **Variables**
2. Verifica que `REDIS_URL` esté configurada:
   ```
   REDIS_URL=redis://default:PASSWORD@redis-production-19f5.up.railway.app:6379
   ```
3. **Si NO está**, agrégala primero (obtén el valor del servicio Redis)

**Luego redeploy:**

1. **Railway** → `@constanza/notifier` → **Deployments**
2. Click en **"Redeploy"** o **"New Deployment"**
3. Selecciona el commit más reciente
4. Click en **"Deploy"**
5. **Espera 2-3 minutos**

**Verificar:**
- Railway → `@constanza/notifier` → **Logs**
- Debe decir: `✅ Redis connected` (sin errores)

---

### Paso 4: `@constanza/api-gateway` ⚠️ **CRÍTICO**

**ANTES de redeploy:**

1. **Railway** → `@constanza/api-gateway` → **Variables**
2. Verifica que `NOTIFIER_URL` esté configurada:
   ```
   NOTIFIER_URL=https://constanzanotifier-production.up.railway.app
   ```
3. **Si NO está o está mal**, corrígela primero

**Luego redeploy:**

1. **Railway** → `@constanza/api-gateway` → **Deployments**
2. Click en **"Redeploy"** o **"New Deployment"**
3. Selecciona el commit más reciente
4. Click en **"Deploy"**
5. **Espera 2-3 minutos**

**Verificar:**
- Railway → `@constanza/api-gateway` → **Logs**
- Debe decir: `🚀 API-GATEWAY vCORS-FIX DESPLEGADO` (o similar)

---

### Paso 5: `@constanza/rail-cucuru` (Opcional)

**Railway** → `@constanza/rail-cucuru` → **Deployments**

- **Solo redeploy si hiciste cambios en este servicio**
- Si no, **SALTAR este paso**

---

## 🎯 Checklist Final

- [ ] Verificar `REDIS_URL` en `notifier` → Variables
- [ ] Redeploy `@constanza/notifier`
- [ ] Verificar logs del `notifier` (Redis connected)
- [ ] Verificar `NOTIFIER_URL` en `api-gateway` → Variables
- [ ] Redeploy `@constanza/api-gateway`
- [ ] Verificar logs del `api-gateway` (sin errores)
- [ ] Probar envío de email desde el frontend

---

## ⚠️ Importante

**Haz el redeploy en este orden:**
1. `notifier` primero (necesita Redis)
2. `api-gateway` después (necesita que `notifier` esté corriendo)

**Si haces `api-gateway` antes que `notifier`, puede fallar temporalmente hasta que `notifier` esté listo.**

---

## 🚀 Resumen Ultra Rápido

1. **Railway** → `notifier` → Variables → Verificar `REDIS_URL` → Deployments → Redeploy
2. **Railway** → `api-gateway` → Variables → Verificar `NOTIFIER_URL` → Deployments → Redeploy
3. **Esperar 2-3 minutos** cada uno
4. **Verificar logs** de ambos
5. **Probar envío de email**

---

**Con ambos servicios redeployados y configurados correctamente, el envío de emails debería funcionar.**




