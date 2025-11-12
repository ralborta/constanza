# 🚀 Forzar Deploy en Railway - Paso a Paso

## ⚠️ Problema
Railway no está haciendo deploy automáticamente después del push a GitHub.

## ✅ Solución: Forzar Deploy Manual

### Para CADA servicio (`notifier`, `api-gateway`, `rail-cucuru`):

#### 1. Verificar que esté conectado a GitHub
- Settings → Source
- Debe mostrar: `ralborta/constanza` (tu repo de GitHub)
- Branch: `main`

#### 2. Verificar Auto-Deploy
- Settings → Deploy
- **Auto Deploy**: Debe estar **activado** (toggle ON)
- **Branch**: `main`
- **Commit**: "Latest" o el commit `e48a1d5`

#### 3. Verificar Dockerfile Path (IMPORTANTE)
- Settings → Build
- **Dockerfile Path**: Debe ser:
  - `apps/notifier/Dockerfile` (para notifier)
  - `apps/api-gateway/Dockerfile` (para api-gateway)
  - `apps/rail-cucuru/Dockerfile` (para rail-cucuru)
- **Root Directory**: `/` (root del repo)

#### 4. Forzar Redeploy
**Opción A: Desde el Dashboard**
1. Ir al servicio en Railway
2. Click en el botón **"Redeploy"** o **"Deploy latest commit"**
3. Esperar a que termine el build

**Opción B: Desde Settings**
1. Settings → Deploy
2. Click en **"Redeploy"** o **"Deploy latest commit"**
3. Si hay opción "Clear build cache", activarla también

**Opción C: Forzar con commit específico**
1. Settings → Deploy
2. En "Commit", seleccionar o escribir: `e48a1d5`
3. Click en "Deploy"

## 🔍 Verificar que Funcionó

Después del redeploy, en los logs deberías ver:

```
Step 1/XX : FROM node:20-alpine AS build
Step 2/XX : RUN apk add --no-cache openssl
...
Step X/XX : COPY apps/notifier ./apps/notifier
Step X/XX : RUN pnpm install --frozen-lockfile
Step X/XX : RUN pnpm --filter "@constanza/notifier" run generate
Step X/XX : RUN pnpm --filter "@constanza/notifier" run build
```

## 🚨 Si Sigue Sin Funcionar

### Verificar que Railway vea el commit correcto:
1. Settings → Deploy
2. Ver qué commit está mostrando
3. Si es viejo (no `e48a1d5`), hacer "Redeploy"

### Verificar configuración del Dockerfile:
1. Settings → Build
2. **Dockerfile Path** debe ser: `apps/<servicio>/Dockerfile`
3. **NO** debe ser: `/Dockerfile` (ese es el viejo)

### Limpiar cache:
1. Settings → Build
2. Click en **"Clear build cache"**
3. Luego hacer "Redeploy"

## 📋 Checklist Rápido

Para cada servicio:
- [ ] Auto Deploy activado
- [ ] Branch = `main`
- [ ] Commit = `e48a1d5` o "Latest"
- [ ] Dockerfile Path = `apps/<servicio>/Dockerfile`
- [ ] Root Directory = `/`
- [ ] Redeploy hecho manualmente
- [ ] Build completado sin errores

