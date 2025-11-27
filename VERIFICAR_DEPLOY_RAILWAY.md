# 🔍 Verificar y Forzar Deploy en Railway

## ⚠️ Problema

Railway no está haciendo deploy automáticamente o el servicio sigue con errores 404/405.

## ✅ Pasos para Verificar y Solucionar

### Paso 1: Verificar Estado del Servicio

1. Railway Dashboard → `@constanza/api-gateway`
2. Verifica el estado:
   - **"Running"** ✅ → El servicio está corriendo
   - **"Stopped"** ❌ → Necesitas iniciarlo
   - **"Error"** ❌ → Hay un problema, revisa los logs

### Paso 2: Verificar Último Deploy

1. Railway Dashboard → `@constanza/api-gateway` → **Deployments**
2. Busca el último deployment:
   - ¿Cuándo fue el último deploy?
   - ¿Está en estado "Active" o "Failed"?
   - ¿Qué commit está deployado? (debería ser `f956ae9` o más reciente)

### Paso 3: Verificar Conexión con GitHub

1. Railway Dashboard → `@constanza/api-gateway` → **Settings** → **Source**
2. Verifica:
   - **Repository**: Debe ser `ralborta/constanza`
   - **Branch**: Debe ser `main`
   - **Auto Deploy**: Debe estar **ON**

### Paso 4: Forzar Redeploy Manual

Si el auto-deploy no funciona:

1. Railway Dashboard → `@constanza/api-gateway` → **Deployments**
2. Click en el botón **"New Deployment"** o **"Redeploy"**
3. Selecciona:
   - **Branch**: `main`
   - **Commit**: `Latest` o el commit `f956ae9`
4. Click en **"Deploy"**

### Paso 5: Verificar Logs del Deploy

1. Railway Dashboard → `@constanza/api-gateway` → **Logs**
2. Busca mensajes de:
   - **Build**: "Building...", "Installing dependencies..."
   - **Deploy**: "Deploying...", "Starting..."
   - **Error**: Cualquier mensaje en rojo

### Paso 6: Verificar Variables de Entorno

1. Railway Dashboard → `@constanza/api-gateway` → **Variables**
2. Verifica que existan:
   - `DATABASE_URL` (debe tener la URL interna de Railway)
   - `JWT_SECRET` (si se usa)
   - `NODE_ENV=production`

## 🚨 Si el Deploy Falla

### Error: "Build failed"

Revisa los logs para ver el error específico. Errores comunes:
- Dependencias faltantes
- Scripts de build incorrectos
- Problemas con Prisma Client

### Error: "Deploy failed"

- Verifica que el servicio tenga las variables de entorno correctas
- Revisa que el Dockerfile esté correcto
- Verifica que el puerto esté configurado

### Error: "Health check failed"

- El servicio no arranca correctamente
- Revisa los logs para ver el error de inicio
- Verifica que `DATABASE_URL` esté correcta

## 🔧 Solución Rápida: Redeploy desde Railway CLI

Si tienes Railway CLI instalado:

```bash
railway login
railway link
railway up
```

## 📋 Checklist Completo

- [ ] Servicio está "Running"
- [ ] Último deploy es reciente (menos de 1 hora)
- [ ] Auto Deploy está habilitado
- [ ] Repository conectado correctamente
- [ ] Branch es `main`
- [ ] `DATABASE_URL` está configurada
- [ ] No hay errores en los logs
- [ ] El endpoint `/health` responde (si existe)

## 🎯 Próximo Paso

Después de verificar todo, prueba de nuevo cargar el archivo. Si sigue fallando, revisa los logs específicos del error 405.





