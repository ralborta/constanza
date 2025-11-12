# 🔧 Forzar Railway a Usar el Commit Correcto

## ⚠️ PROBLEMA

Railway está usando un commit viejo (hace 2 horas) que no tiene el `pnpm-lock.yaml` regenerado. El commit actual correcto es `41de054` o más reciente.

## ✅ SOLUCIÓN: Forzar Rebuild en Railway

### Para CADA servicio en Railway:

1. **Ir a cada servicio** (`api-gateway`, `notifier`, `rail-cucuru`)

2. **Settings → Build**
   - Verificar que esté usando el commit más reciente
   - Si no, hacer "Redeploy" o "Clear cache and redeploy"

3. **Settings → Build → Build Configuration**
   - **Builder**: `Dockerfile` (NO Nixpacks)
   - **Dockerfile Path**: `/Dockerfile`
   - **Root Directory**: `/` (root del repo, NO `apps/notifier` ni ningún subfolder)
   - **Build Args**:
     ```
     SERVICE=api-gateway    # Cambiar según el servicio
     ```

4. **Forzar rebuild:**
   - Settings → Build → "Clear build cache"
   - Luego hacer "Redeploy"
   - O simplemente hacer "Redeploy" desde el dashboard

## 🔍 Verificar Commit Correcto

El commit correcto debe ser:
- `41de054` - docs: Agregar guía detallada de configuración Railway con Dockerfile
- O más reciente

Si Railway muestra un commit más viejo (como "Agregar archivos de deployment y config..."), necesitas forzar el redeploy.

## 📋 Checklist de Configuración

Para cada servicio, verificar:

- [ ] **Builder** = `Dockerfile` (no Nixpacks)
- [ ] **Root Directory** = `/` (no un subfolder)
- [ ] **Build Arg** `SERVICE` configurado correctamente
- [ ] **Commit** = `41de054` o más reciente
- [ ] **Cache limpiado** antes del rebuild

## 🚨 Si Sigue Fallando

1. **Verificar en Railway qué commit está usando:**
   - Debe ser `41de054` o más reciente
   - Si es más viejo, hacer "Redeploy" o "Clear cache"

2. **Verificar logs del build:**
   - Si dice "Nixpacks detected" → cambiar a Dockerfile
   - Si dice "Cannot find Dockerfile" → verificar Root Directory = `/`
   - Si dice "pnpm-lock.yaml is absent" → verificar Root Directory = `/` y commit correcto

3. **Eliminar y recrear el servicio:**
   - Si nada funciona, eliminar el servicio y recrearlo con la configuración correcta desde el inicio

