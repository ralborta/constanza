# ⚙️ Configuración EXACTA en Railway - Paso a Paso

## 🎯 El Problema

Railway está usando configuraciones incorrectas que hacen que:
- No encuentre el `pnpm-lock.yaml` (Root Directory en subfolder)
- Use Nixpacks en lugar de Dockerfile
- Use un commit viejo

## ✅ Configuración CORRECTA en Railway

### Para CADA servicio, seguir estos pasos EXACTOS:

#### 1. Ir a Settings → Build

**Builder:**
```
Dockerfile
```
(NO "Nixpacks", NO "Dockerfile (Nixpacks)")

**Dockerfile Path:**
```
Dockerfile
```
(O `/Dockerfile` - ambos funcionan)

**Root Directory:**
```
/
```
⚠️ **CRÍTICO**: Debe ser el root del repo, NO `apps/notifier` ni ningún subfolder

**Build Command:**
```
(DEJAR VACÍO)
```
Railway usará el Dockerfile automáticamente

**Build Args:**
```
SERVICE=api-gateway
```
- Para `notifier`: `SERVICE=notifier`
- Para `rail-cucuru`: `SERVICE=rail-cucuru`
- Para `api-gateway`: `SERVICE=api-gateway`
- Para `web`: `SERVICE=web`

#### 2. Ir a Settings → Deploy

**Branch:**
```
main
```

**Commit:**
```
Latest
```
(O hacer "Redeploy" para usar el último commit)

**Start Command:**
```
(DEJAR VACÍO)
```
El Dockerfile ya tiene el CMD configurado

#### 3. Ir a Settings → Variables

Agregar las variables según el servicio (ver `RAILWAY_CHECKLIST.md`)

#### 4. Limpiar y Rebuild

1. Settings → Build → "Clear build cache"
2. Dashboard → "Redeploy"

## 🔍 Cómo Verificar que Está Correcto

Después de configurar, en los logs del build deberías ver:

```
Step 1/15 : FROM node:20-alpine AS build
...
Step 9/15 : COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
Step 10/15 : RUN pnpm install --frozen-lockfile
...
```

Si ves "Nixpacks detected" o "Cannot find pnpm-lock.yaml" → la configuración está mal.

## 🚨 Errores Comunes

### "ERR_PNPM_NO_LOCKFILE"
- **Causa**: Root Directory no es `/`
- **Solución**: Settings → Build → Root Directory = `/`

### "Nixpacks detected"
- **Causa**: Builder no es `Dockerfile`
- **Solución**: Settings → Build → Builder = `Dockerfile`

### "Cannot find Dockerfile"
- **Causa**: Dockerfile Path incorrecto o Root Directory mal
- **Solución**: Dockerfile Path = `Dockerfile`, Root Directory = `/`

### Usa commit viejo
- **Causa**: Commit fijado a uno viejo
- **Solución**: Settings → Deploy → Commit = "Latest" o "Redeploy"

## 📸 Screenshot de Configuración Correcta

**Settings → Build debería verse así:**

```
Builder: Dockerfile
Dockerfile Path: Dockerfile
Root Directory: /
Build Command: (vacío)
Build Args:
  SERVICE=api-gateway
```

**Settings → Deploy debería verse así:**

```
Branch: main
Commit: Latest
Start Command: (vacío)
```

Con esta configuración EXACTA, Railway debería encontrar el lockfile y hacer el build correctamente.

