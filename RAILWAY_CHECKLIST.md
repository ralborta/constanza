# ✅ Checklist Completo de Configuración Railway

## 🔍 Configuraciones que DEBES verificar en Railway

### Para CADA servicio (`api-gateway`, `notifier`, `rail-cucuru`, `web`):

#### 1. Settings → Build

**Builder:**
- ✅ Debe ser: `Dockerfile`
- ❌ NO debe ser: `Nixpacks` o `Dockerfile (Nixpacks)`

**Dockerfile Path:**
- ✅ Debe ser: `/Dockerfile` o `Dockerfile`
- ❌ NO debe ser: `apps/notifier/Dockerfile` ni ningún subfolder

**Root Directory:**
- ✅ Debe ser: `/` (root del repo)
- ❌ NO debe ser: `apps/notifier` ni ningún subfolder
- ⚠️ **ESTE ES EL MÁS IMPORTANTE** - Si está en un subfolder, Railway no encuentra el `pnpm-lock.yaml`

**Build Command:**
- ✅ Debe estar VACÍO (Railway usa el Dockerfile)
- ❌ NO debe tener: `cd apps/notifier && pnpm install` ni nada similar

**Build Args:**
- ✅ Debe tener: `SERVICE=api-gateway` (cambiar según el servicio)
- Para `notifier`: `SERVICE=notifier`
- Para `rail-cucuru`: `SERVICE=rail-cucuru`
- Para `api-gateway`: `SERVICE=api-gateway`
- Para `web`: `SERVICE=web`

#### 2. Settings → Deploy

**Branch:**
- ✅ Debe ser: `main` (o la rama que uses)
- Verificar que esté en la rama correcta

**Commit:**
- ✅ Debe ser: `dc60b22` o más reciente
- Si muestra un commit viejo, hacer "Redeploy" o cambiar a "Latest"

**Start Command:**
- ✅ Debe estar VACÍO (el Dockerfile tiene el CMD)
- ❌ NO debe tener: `cd apps/notifier && pnpm start` ni nada similar

#### 3. Settings → Variables

**Variables requeridas por servicio:**

**api-gateway:**
```
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=tu-secret-jwt
REDIS_URL=redis://...  # Si usa Redis
```

**notifier:**
```
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
BUILDERBOT_API_KEY=...
SMTP_URL=...
TTS_URL=...
```

**rail-cucuru:**
```
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
CUCURU_WEBHOOK_SECRET=...
```

**web:**
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api-gateway.railway.app
NEXT_PUBLIC_TENANT=tu-tenant-id
```

#### 4. Settings → Network

**Port:**
- Verificar que el puerto esté configurado correctamente
- Railway normalmente detecta el puerto automáticamente

**Public:**
- Si necesitas exponer el servicio públicamente, activar "Public"

## 🚨 Problemas Comunes y Soluciones

### Error: "ERR_PNPM_NO_LOCKFILE"

**Causa:** Root Directory apunta a un subfolder o está usando Nixpacks

**Solución:**
1. Settings → Build → Root Directory = `/`
2. Settings → Build → Builder = `Dockerfile`
3. Clear cache y redeploy

### Error: "Cannot find Dockerfile"

**Causa:** Dockerfile Path incorrecto o Root Directory mal configurado

**Solución:**
1. Settings → Build → Dockerfile Path = `/Dockerfile`
2. Settings → Build → Root Directory = `/`

### Error: "Nixpacks detected"

**Causa:** Railway está usando Nixpacks en lugar de Dockerfile

**Solución:**
1. Settings → Build → Builder = `Dockerfile`
2. Verificar que no existan `nixpacks.toml` o `railway.json` en el repo (ya los eliminamos)

### Error: "Build Arg SERVICE not found"

**Causa:** Build Args no configurado

**Solución:**
1. Settings → Build → Build Args
2. Agregar: `SERVICE=api-gateway` (o el servicio correspondiente)

### Deploy usa commit viejo

**Causa:** Railway está configurado para usar un commit específico

**Solución:**
1. Settings → Deploy → Branch = `main`
2. Settings → Deploy → Commit = "Latest" o hacer "Redeploy"

## 📋 Checklist Rápido

Para cada servicio, verificar:

- [ ] Builder = `Dockerfile` (no Nixpacks)
- [ ] Root Directory = `/` (root del repo)
- [ ] Dockerfile Path = `/Dockerfile`
- [ ] Build Args = `SERVICE=<nombre-del-servicio>`
- [ ] Build Command = VACÍO
- [ ] Start Command = VACÍO
- [ ] Branch = `main`
- [ ] Commit = `dc60b22` o más reciente
- [ ] Variables de entorno configuradas
- [ ] Cache limpiado antes del rebuild

## 🔄 Pasos para Corregir

1. **Ir a cada servicio en Railway**
2. **Settings → Build**
   - Cambiar Builder a `Dockerfile`
   - Cambiar Root Directory a `/`
   - Agregar Build Arg `SERVICE=<nombre>`
3. **Settings → Deploy**
   - Verificar Branch = `main`
   - Hacer "Redeploy" o cambiar a "Latest"
4. **Settings → Build → Clear build cache**
5. **Redeploy**

Con estas configuraciones, Railway debería encontrar el `pnpm-lock.yaml` y hacer el build correctamente.

