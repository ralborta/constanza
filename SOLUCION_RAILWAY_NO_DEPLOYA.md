# 🔧 Solución: Railway No Está Haciendo Deploy Automático

## ⚠️ Problema

Railway no está haciendo deploy automáticamente cuando haces commit a GitHub.

---

## ✅ Verificaciones Paso a Paso

### Paso 1: Verificar que Railway Esté Conectado a GitHub

**Railway Dashboard** → Tu proyecto → **Settings** → **"Source"** o **"GitHub"**

**Deberías ver:**
- ✅ Repositorio conectado (ej: `tu-usuario/Constanza`)
- ✅ Branch configurado (ej: `main` o `master`)
- ✅ Auto-deploy habilitado

**Si NO está conectado:**
1. Click en **"Connect GitHub"** o **"Change Source"**
2. Selecciona tu repositorio `Constanza`
3. Selecciona el branch `main`
4. Guarda

---

### Paso 2: Verificar que el Servicio Esté Configurado para Auto-Deploy

**Railway Dashboard** → Tu proyecto → **`@constanza/notifier`** → **Settings**

**Busca la sección "Deploy" o "Build":**
- ✅ **"Auto Deploy"** debe estar **habilitado** (ON)
- ✅ **"Branch"** debe ser `main` (o el branch que uses)

**Si está deshabilitado:**
1. Activa **"Auto Deploy"**
2. Selecciona el branch correcto
3. Guarda

---

### Paso 3: Verificar Webhook de GitHub

**GitHub** → Tu repositorio `Constanza` → **Settings** → **Webhooks**

**Deberías ver un webhook de Railway:**
- ✅ URL: `https://api.railway.app/v1/webhooks/github/...`
- ✅ Events: `push`, `pull_request`
- ✅ Status: ✅ (verde, activo)

**Si NO existe:**
- Railway debería crearlo automáticamente al conectar el repo
- Si no aparece, desconecta y vuelve a conectar en Railway

---

### Paso 4: Forzar Deploy Manual (Solución Temporal)

**Railway Dashboard** → `@constanza/notifier` → **Deployments**

1. Click en **"New Deployment"** o **"Redeploy"**
2. Selecciona el commit más reciente
3. Click en **"Deploy"**

Esto fuerza un deploy inmediato sin esperar a GitHub.

---

### Paso 5: Verificar Logs de Build

**Railway Dashboard** → `@constanza/notifier` → **Deployments** → Último deployment → **Logs**

**Busca errores en el build:**
- ❌ Errores de compilación TypeScript
- ❌ Errores de dependencias (`pnpm install`)
- ❌ Errores de Prisma (`prisma generate`)

**Si hay errores:**
- Corrígelos y haz commit de nuevo
- Railway debería intentar deployar automáticamente

---

### Paso 6: Verificar que el Servicio Esté Activo

**Railway Dashboard** → `@constanza/notifier` → **Settings**

**Verifica:**
- ✅ El servicio NO está pausado
- ✅ El servicio NO está en modo "sleep"
- ✅ El servicio tiene recursos asignados

**Si está pausado:**
- Actívalo desde Settings

---

## 🎯 Soluciones Comunes

### Problema 1: Railway No Está Conectado a GitHub

**Solución:**
1. Railway → Proyecto → Settings → Source
2. Conecta tu repositorio de GitHub
3. Selecciona branch `main`
4. Guarda

---

### Problema 2: Auto-Deploy Está Deshabilitado

**Solución:**
1. Railway → Servicio → Settings → Deploy
2. Activa **"Auto Deploy"**
3. Selecciona branch `main`
4. Guarda

---

### Problema 3: Webhook de GitHub No Funciona

**Solución:**
1. GitHub → Repo → Settings → Webhooks
2. Verifica que el webhook de Railway esté activo
3. Si no existe, desconecta y vuelve a conectar en Railway

---

### Problema 4: Build Falla Silenciosamente

**Solución:**
1. Railway → Servicio → Deployments → Último deployment → Logs
2. Revisa errores de build
3. Corrígelos y haz commit de nuevo

---

## 🚀 Acción Inmediata

1. **Verifica conexión GitHub** en Railway → Settings → Source
2. **Verifica Auto-Deploy** en Railway → Servicio → Settings → Deploy
3. **Fuerza deploy manual** si es necesario (Railway → Deployments → Redeploy)
4. **Revisa logs de build** para ver si hay errores

---

## 📋 Checklist

- [ ] Railway está conectado a GitHub
- [ ] Auto-Deploy está habilitado
- [ ] Webhook de GitHub está activo
- [ ] El servicio NO está pausado
- [ ] No hay errores en los logs de build
- [ ] El branch configurado es `main` (o el correcto)

---

**Si después de verificar todo sigue sin deployar automáticamente, usa el deploy manual mientras investigamos el problema del webhook.**




