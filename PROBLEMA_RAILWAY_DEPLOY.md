# ⚠️ Problema: Railway no está deployando cambios

## Situación Actual

- ✅ Código correcto y commiteado (commit `bbf54c0`)
- ✅ Build local funciona correctamente
- ✅ Endpoint `/seed` está correctamente implementado
- ❌ Railway no está deployando los cambios
- ❌ Endpoint `/seed` responde `404 Not Found`
- ❌ Endpoint `/test-seed` también responde `404 Not Found`

## Posibles Causas

1. **Railway no está configurado para auto-deploy desde GitHub**
   - Verificar en Railway → Settings → Source
   - Debe estar conectado a GitHub y configurado para auto-deploy

2. **Railway está usando un commit específico viejo**
   - Verificar en Railway → Deployments
   - Debe estar usando el commit más reciente (`bbf54c0`)

3. **Problema con el Dockerfile**
   - Verificar que Railway esté usando el Dockerfile correcto
   - Settings → Build → Dockerfile Path debe ser `/Dockerfile`

4. **Build está fallando silenciosamente**
   - Revisar logs de build en Railway
   - Verificar que no haya errores de compilación

## Soluciones a Intentar

### 1. Verificar Configuración de Railway

1. Ve a Railway Dashboard → `api-gateway` → Settings
2. Verifica:
   - **Source**: Debe estar conectado a GitHub repo `ralborta/constanza`
   - **Branch**: Debe ser `main`
   - **Auto Deploy**: Debe estar habilitado
   - **Dockerfile Path**: Debe ser `/Dockerfile` (root)
   - **Root Directory**: Debe estar vacío o ser `/`

### 2. Forzar Redeploy Manual

1. Railway → `api-gateway` → Deployments
2. Click en "Redeploy" o "Deploy Latest Commit"
3. Espera 2-3 minutos
4. Verifica los logs del deploy

### 3. Verificar Logs de Build

1. Railway → `api-gateway` → Deployments
2. Click en el último deployment
3. Revisa los logs de build
4. Busca errores de compilación o problemas con el Dockerfile

### 4. Verificar que el Commit esté en GitHub

```bash
git log --oneline -5
```

El commit `bbf54c0` debe estar en GitHub.

### 5. Verificar Variables de Entorno

Railway → `api-gateway` → Settings → Variables:
- `SEED_SECRET` = `constanza-seed-2025` (debe estar configurado)

## Verificación Final

Después de hacer redeploy, verifica:

```bash
# Debe responder 200 (no 404)
curl https://api-gateway-production.railway.app/test-seed

# Debe responder 200 o 503 (no 404)
curl -X POST https://api-gateway-production.railway.app/seed \
  -H "Content-Type: application/json" \
  -H "x-seed-secret: constanza-seed-2025"
```

Si `/test-seed` responde 404, Railway no está deployando los cambios.
Si `/test-seed` responde 200 pero `/seed` responde 404, hay un problema con el registro de `seedRoutes`.

