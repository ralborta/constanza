# 🚀 Forzar Deploy en Railway - Paso a Paso Visual

## ⚠️ Problema: Railway No Hace Deploy Automático

**Solución: Deploy Manual (SIEMPRE funciona)**

---

## 📍 Dónde Hacer Deploy Manual

### Paso 1: Abrir el Servicio

1. **Railway Dashboard** → Click en el servicio que quieres deployar
   - `@constanza/api-gateway` (deployado hace 25 min)
   - `@constanza/notifier` (deployado hace 8 horas) ← **ESTE NECESITA DEPLOY**

---

### Paso 2: Ir a la Pestaña "Deployments"

1. Con el servicio abierto, busca la pestaña **"Deployments"** (arriba, junto a "Variables")
2. Click en **"Deployments"**

---

### Paso 3: Forzar Deploy

**Opción A: Redeploy del Último Commit**
1. Busca el botón **"Redeploy"** o **"..."** (tres puntos) en el último deployment
2. Click en **"Redeploy"**
3. Espera 2-3 minutos

**Opción B: Nuevo Deployment**
1. Busca el botón **"New Deployment"** o **"Deploy"**
2. Selecciona el commit más reciente de la lista
3. Click en **"Deploy"**
4. Espera 2-3 minutos

---

## 🔍 Verificar que el Deploy Funcionó

1. **Railway Dashboard** → Servicio → **"Deployments"**
2. Deberías ver un nuevo deployment con:
   - Estado: **"Building"** → **"Deploying"** → **"Active"** (verde)
   - Tiempo: "Just now" o "1 minute ago"

**Si ves "Active" = Deploy exitoso ✅**

---

## ⚠️ Si No Ves el Botón "Redeploy"

**Railway Dashboard** → Servicio → **Settings** → **"Deploy"**

1. Verifica que **"Auto Deploy"** esté habilitado
2. Verifica que el **branch** sea `main`
3. Si está deshabilitado, actívalo y guarda

---

## 🎯 Para `@constanza/notifier` Específicamente

**Veo que fue deployado hace 8 horas. Si hiciste cambios recientes:**

1. **Railway** → `@constanza/notifier` → **"Deployments"**
2. **"Redeploy"** o **"New Deployment"**
3. Selecciona el commit más reciente
4. **"Deploy"**

**En 2-3 minutos estará actualizado.**

---

## 📋 Checklist Rápido

- [ ] Railway → `@constanza/notifier` → Pestaña "Deployments"
- [ ] Click en "Redeploy" o "New Deployment"
- [ ] Selecciona commit reciente → "Deploy"
- [ ] Espera 2-3 minutos
- [ ] Verifica que el estado sea "Active" (verde)

---

## 🚨 Si Aún No Funciona

**Copia aquí:**
1. ¿Qué ves en la pestaña "Deployments"?
2. ¿Hay algún botón "Redeploy" o "New Deployment"?
3. ¿Qué errores aparecen en los logs del último deployment?

---

**El deploy manual SIEMPRE funciona. Si no ves los botones, puede ser un problema de permisos o configuración del proyecto en Railway.**
