# 🚨 FORZAR DEPLOY EN RAILWAY - PASO A PASO

## ⚠️ Problema Actual

Los commits están en GitHub pero Railway no está haciendo deploy automáticamente.

## ✅ SOLUCIÓN: Forzar Deploy Manual

### Paso 1: Ir a Railway Dashboard

1. Abre: https://railway.app
2. Inicia sesión
3. Selecciona tu proyecto

### Paso 2: Abrir el Servicio api-gateway

1. Click en el servicio **`@constanza/api-gateway`**
2. Deberías ver las pestañas: Deployments, Metrics, Logs, Variables, Settings

### Paso 3: Forzar Redeploy

**Opción A: Desde la pestaña Deployments (RECOMENDADO)**

1. Click en la pestaña **"Deployments"**
2. Busca el último deployment en la lista
3. Click en el menú de tres puntos (⋯) al lado del deployment
4. Selecciona **"Redeploy"**
   O busca el botón **"Deploy Latest Commit"** o **"Redeploy"** en la parte superior

**Opción B: Desde Settings**

1. Click en **"Settings"**
2. Busca la sección **"Deploy"** o **"Source"**
3. Busca el botón **"Redeploy"** o **"Deploy Latest Commit"**
4. Click en él

**Opción C: Crear Nuevo Deployment**

1. En la pestaña **"Deployments"**
2. Click en **"New Deployment"** o **"Create Deployment"**
3. Selecciona:
   - **Branch**: `main`
   - **Commit**: `Latest` o busca `f956ae9`
4. Click en **"Deploy"**

### Paso 4: Verificar que el Deploy se Inició

Después de hacer redeploy, deberías ver:

1. Un nuevo deployment apareciendo en la lista
2. Estado cambiando a:
   - **"Building..."** (construyendo)
   - **"Deploying..."** (desplegando)
   - **"Active"** (activo) ✅

### Paso 5: Revisar los Logs

1. Click en la pestaña **"Logs"**
2. Deberías ver mensajes como:
   ```
   Building...
   Installing dependencies...
   Building application...
   Deploying...
   Starting...
   ```

## 🔍 Verificar Configuración (Si No Funciona)

### Verificar Auto-Deploy

1. Settings → **"Deploy"** o **"Source"**
2. Verifica:
   - **Auto Deploy**: Debe estar **ON** (activado)
   - **Branch**: Debe ser `main`
   - **Repository**: Debe ser `ralborta/constanza`

### Verificar Build Settings

1. Settings → **"Build"**
2. Verifica:
   - **Builder**: Debe ser `Dockerfile` (NO Nixpacks)
   - **Dockerfile Path**: Debe ser `/Dockerfile` o `Dockerfile`
   - **Root Directory**: Debe ser `/` (root)

### Verificar Variables

1. Settings → **"Variables"**
2. Verifica que exista:
   - `DATABASE_URL` (con la URL interna de Railway)
   - `JWT_SECRET` (si se usa)
   - `NODE_ENV=production`

## ⏱️ Tiempo de Espera

El deploy normalmente toma:
- **Build**: 1-3 minutos
- **Deploy**: 30 segundos - 1 minuto
- **Total**: 2-5 minutos

## 🚨 Si el Deploy Falla

1. Revisa los **Logs** para ver el error específico
2. Errores comunes:
   - **Build failed**: Problemas con dependencias
   - **Deploy failed**: Variables de entorno faltantes
   - **Health check failed**: El servicio no arranca

## 📋 Checklist Post-Deploy

Después de que el deploy termine:

- [ ] Deployment está en estado **"Active"**
- [ ] Servicio está **"Running"** (no "Stopped" o "Error")
- [ ] No hay errores en los logs
- [ ] `DATABASE_URL` está configurada
- [ ] Puedes probar cargar el archivo

## 🎯 Acción Inmediata

**Ve a Railway Dashboard AHORA y haz click en "Redeploy" en el servicio api-gateway.**
