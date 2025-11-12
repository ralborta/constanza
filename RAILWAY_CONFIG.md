# Configuración Railway - Paso a Paso

## ⚠️ PROBLEMA COMÚN

Si ves `ERR_PNPM_NO_LOCKFILE`, es porque Railway está construyendo sin el `pnpm-lock.yaml` en el contexto. Esto pasa cuando:
- El "Root Directory" apunta a un subfolder (ej: `apps/notifier`)
- O está usando Nixpacks en lugar de Dockerfile

## ✅ SOLUCIÓN: Dockerfile único con Build Args

### Para CADA servicio en Railway:

1. **Settings → Build**
   - **Builder**: `Dockerfile` (NO Nixpacks)
   - **Dockerfile Path**: `/Dockerfile` (del root del repo)
   - **Root Directory**: `/` (root del repo, NO un subfolder)
   - **Build Args**:
     ```
     SERVICE=api-gateway    # Cambiar según el servicio
     ```
     - Para `api-gateway`: `SERVICE=api-gateway`
     - Para `notifier`: `SERVICE=notifier`
     - Para `rail-cucuru`: `SERVICE=rail-cucuru`
     - Para `web`: `SERVICE=web` (aunque debería estar en Vercel)

2. **Settings → Variables**
   - Configurar variables de entorno necesarias (ver abajo)

3. **Settings → Deploy**
   - Verificar que no haya "Root Directory" configurado (debe estar vacío o en `/`)

## 🔍 Verificación

Después de configurar, en los logs del build deberías ver:
- ✅ `COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./`
- ✅ `RUN pnpm install --frozen-lockfile` (sin errores)
- ✅ `RUN pnpm --filter "@constanza/${SERVICE}" run generate`
- ✅ `RUN pnpm --filter "@constanza/${SERVICE}" run build`

Si ves "Nixpacks detected" en los logs → **cambialo a Dockerfile** en Settings.

## 📋 Variables de Entorno por Servicio

### api-gateway
```
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=tu-secret-jwt
REDIS_URL=redis://...  # Si usa Redis
```

### notifier
```
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
BUILDERBOT_API_KEY=...
SMTP_URL=...
TTS_URL=...
```

### rail-cucuru
```
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
CUCURU_WEBHOOK_SECRET=...
```

### web (si se deploya en Railway)
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api-gateway.railway.app
NEXT_PUBLIC_TENANT=tu-tenant-id
```

## 🚨 Checklist Final

- [ ] Todos los servicios usan **Dockerfile** (no Nixpacks)
- [ ] **Root Directory** = `/` (root del repo)
- [ ] **Build Arg** `SERVICE` configurado correctamente
- [ ] `pnpm-lock.yaml` está commiteado en el root
- [ ] `.dockerignore` NO ignora `pnpm-lock.yaml`
- [ ] Rebuild sin cache después de cambiar configuración

## 🔄 Si sigue fallando

1. **Verificar en Railway qué commit está usando:**
   - Debe ser `7594907` o más reciente
   - Si es más viejo, hacer "Redeploy" o "Clear cache"

2. **Verificar logs del build:**
   - Si dice "Nixpacks detected" → cambiar a Dockerfile
   - Si dice "Cannot find Dockerfile" → verificar que `Dockerfile` esté en el root
   - Si dice "pnpm-lock.yaml is absent" → verificar Root Directory = `/`

3. **Forzar rebuild sin cache:**
   - Settings → Build → "Clear build cache"
   - Luego "Redeploy"

