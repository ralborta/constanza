# 🚀 Forzar Deploy Manual en Railway - Paso a Paso

## ⚠️ Problema: Railway No Hace Deploy Automático

Si Railway no está detectando los cambios de GitHub automáticamente, debes hacer el deploy manualmente.

---

## ✅ Solución: Deploy Manual desde Railway Dashboard

### Paso 1: Abrir Railway Dashboard

1. Ve a: https://railway.app
2. Inicia sesión con tu cuenta
3. Abre tu proyecto (debería llamarse algo como "endearing-imagination" o similar)

---

### Paso 2: Abrir el Servicio api-gateway

1. En la lista de servicios, busca y click en **`@constanza/api-gateway`**
2. Se abrirá la página del servicio

---

### Paso 3: Ir a la Pestaña "Deployments"

1. En la parte superior de la página, busca la pestaña **"Deployments"**
2. Click en **"Deployments"**

---

### Paso 4: Crear Nuevo Deployment

Tienes dos opciones:

#### Opción A: Redeploy del Último Commit

1. Busca el último deployment en la lista
2. Click en los **tres puntos (⋯)** a la derecha del deployment
3. Selecciona **"Redeploy"**
4. Confirma el redeploy

#### Opción B: Nuevo Deployment desde Commit Específico

1. Click en el botón **"New Deployment"** o **"Deploy"** (arriba a la derecha)
2. Se abrirá una lista de commits
3. Busca el commit más reciente: **`a737fc6 - chore: force Railway deploy - fix duplicate errors`**
4. Click en ese commit
5. Click en **"Deploy"** o **"Create Deployment"**

---

### Paso 5: Verificar el Progreso

1. Después de hacer click en "Deploy", verás un nuevo deployment en la lista
2. El estado cambiará de:
   - **"Queued"** → **"Building"** → **"Deploying"** → **"Active"** (verde) ✅
3. Si hay errores, el estado será **"Failed"** (rojo) ❌

---

### Paso 6: Ver Logs del Build

1. Click en el deployment que está en proceso
2. Ve a la pestaña **"Logs"** o **"Build Logs"**
3. Verás el progreso del build en tiempo real
4. Si hay errores, aparecerán en rojo

---

## 🔍 Verificar que el Deploy Funcionó

### Método 1: Ver Estado en Railway

- Railway → `@constanza/api-gateway` → **Deployments**
- El último deployment debe tener estado **"Active"** (verde)
- Debe mostrar "Just now" o "1 minute ago"

### Método 2: Probar el Endpoint

```bash
# Probar el endpoint de retry (debe responder sin 404)
curl -X POST https://constanzaapi-gateway-production.up.railway.app/v1/notify/batch/TU_BATCH_ID/retry \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json"
```

### Método 3: Ver Logs del Servicio

- Railway → `@constanza/api-gateway` → **Logs**
- Deberías ver logs del servidor corriendo sin errores

---

## 🚨 Si el Deploy Sigue Fallando

### Verificar Errores en los Logs

1. Railway → `@constanza/api-gateway` → **Deployments** → Click en el deployment fallido
2. Ve a **"Logs"** o **"Build Logs"**
3. Busca mensajes en rojo que indiquen el error
4. Los errores comunes son:
   - Errores de TypeScript (ya corregidos)
   - Errores de dependencias
   - Errores de variables de entorno

### Verificar Variables de Entorno

1. Railway → `@constanza/api-gateway` → **Variables**
2. Verifica que todas las variables necesarias estén configuradas:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `ALLOWED_ORIGINS`
   - `NOTIFIER_URL`
   - `NODE_ENV=production`

---

## 📋 Checklist Rápido

- [ ] Abrir Railway Dashboard
- [ ] Abrir servicio `@constanza/api-gateway`
- [ ] Ir a pestaña "Deployments"
- [ ] Click en "New Deployment" o "Redeploy"
- [ ] Seleccionar commit `a737fc6` (más reciente)
- [ ] Click en "Deploy"
- [ ] Esperar 2-3 minutos
- [ ] Verificar que el estado sea "Active" (verde)
- [ ] Probar el endpoint de retry

---

## 💡 Nota Importante

**Si Railway tiene integración con GitHub configurada**, debería hacer deploy automáticamente cuando haces push. Si no lo hace, puede ser porque:

1. La integración no está configurada
2. El branch no es `main`
3. Hay algún problema con la configuración

En ese caso, siempre puedes hacer el deploy manualmente siguiendo los pasos de arriba.

---

**El deploy manual SIEMPRE funciona. Si sigues estos pasos, el código se desplegará correctamente.**



