# ✅ Solución: Railway No Hace Deploy Automático

## 🔍 Diagnóstico

✅ **GitHub está bien:**
- Repositorio: `ralborta/constanza`
- Branch: `main`
- Último commit: `68a571f` (pusheado correctamente)

❌ **Railway no detecta cambios:**
- Último deploy hace 19 horas
- No está haciendo auto-deploy

## 🚀 Solución: Forzar Deploy Manual

### Paso 1: Verificar Configuración en Railway

Ve a **Railway Dashboard** → `@constanza/notifier` → **Settings**

#### Settings → Source
```
✅ Debe mostrar: ralborta/constanza
✅ Branch: main
✅ Auto Deploy: ON (activado)
```

#### Settings → Deploy
```
✅ Auto Deploy: ON
✅ Branch: main
✅ Commit: Debe mostrar "Latest" o el commit más reciente
```

#### Settings → Build
```
✅ Builder: Dockerfile
✅ Dockerfile Path: apps/notifier/Dockerfile
✅ Root Directory: / (root del repo)
```

### Paso 2: Forzar Redeploy Manual (MÁS IMPORTANTE)

**Opción A: Desde Deployments (RECOMENDADO)**

1. Ve a Railway → `@constanza/notifier`
2. Click en la pestaña **"Deployments"**
3. Click en el botón **"Redeploy"** o **"Deploy latest commit"**
4. Selecciona el commit `68a571f` (el más reciente)
5. Espera 2-3 minutos

**Opción B: Desde Settings**

1. Railway → `@constanza/notifier` → **Settings → Deploy**
2. Busca el botón **"Redeploy"** o **"Deploy latest commit"**
3. Click y espera

**Opción C: Cambiar Variable para Forzar**

1. Railway → `@constanza/notifier` → **Variables**
2. Agrega una variable temporal: `DEPLOY_TRIGGER=2024`
3. Guarda (esto fuerza un redeploy)
4. Opcional: elimina la variable después

### Paso 3: Verificar que el Deploy se Inició

Después de hacer "Redeploy", deberías ver:

1. **Nuevo deployment en la lista** con estado "Building" o "Deploying"
2. **Commit**: `68a571f` o más reciente
3. **Logs del build** mostrando:
   ```
   Step 1/XX : FROM node:20-alpine AS build
   Step 2/XX : RUN apk add --no-cache openssl
   ...
   Step X/XX : COPY apps/notifier ./apps/notifier
   Step X/XX : RUN pnpm install --frozen-lockfile
   Step X/XX : RUN pnpm --filter "@constanza/notifier" run build
   ```

## 🔧 Si Sigue Sin Funcionar

### Verificar que Railway vea el commit correcto:

1. Railway → `@constanza/notifier` → **Settings → Deploy**
2. Ver qué commit está mostrando
3. Si es viejo (no `68a571f`), hacer "Redeploy"

### Limpiar Cache:

1. Railway → `@constanza/notifier` → **Settings → Build**
2. Click en **"Clear build cache"**
3. Ve a **Deployments** → **"Redeploy"**

### Desconectar y Reconectar Repo:

1. Railway → `@constanza/notifier` → **Settings → Source**
2. Click en **"Disconnect"**
3. Click en **"Connect GitHub repo"**
4. Selecciona `ralborta/constanza`
5. Selecciona branch `main`
6. Guarda

## ✅ Verificación Final

Cuando el deploy termine, en los logs deberías ver:

```
🚀 Notifier running on http://0.0.0.0:3001
✅ Redis connected
✅ Database connected
```

Si ves errores de SMTP, significa que el deploy funcionó pero faltan las variables SMTP (configúralas según `DEPLOY_NOTIFIER_RAILWAY.md`).

---

## 📋 Resumen Rápido

1. ✅ GitHub está bien (commits pusheados)
2. ❌ Railway no detecta cambios automáticamente
3. ✅ **Solución**: Forzar redeploy manual desde Railway Dashboard
4. ✅ Verificar logs para confirmar deploy exitoso

**ACCIÓN INMEDIATA**: Ve a Railway → `@constanza/notifier` → Deployments → "Redeploy"




