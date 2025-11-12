# 🚨 Deploy Manual en Railway - Si NO hace Auto-Deploy

## ⚠️ Si Railway NO detecta los cambios automáticamente

### Para CADA servicio (`notifier`, `api-gateway`, `rail-cucuru`):

#### 1. Ir al servicio en Railway
- Click en el servicio (ej: `@constanza/notifier`)

#### 2. Ir a la pestaña "Deployments"
- Verás una lista de deployments

#### 3. Click en "New Deployment" o "Redeploy"
- Busca el botón "Redeploy" o "Deploy latest commit"
- O click en los tres puntos (⋯) → "Redeploy"

#### 4. Verificar configuración (si sigue sin funcionar)

**Settings → Source:**
- Debe estar conectado a: `ralborta/constanza`
- Branch: `main`

**Settings → Deploy:**
- Auto Deploy: **ON** (activado)
- Branch: `main`
- Commit: "Latest" o `58c4475`

**Settings → Build:**
- Builder: `Dockerfile`
- Dockerfile Path: `apps/notifier/Dockerfile` (o `apps/api-gateway/Dockerfile`, etc.)
- Root Directory: `/`

#### 5. Limpiar cache y redeploy
1. Settings → Build → "Clear build cache"
2. Dashboard → "Redeploy"

## 🔍 Verificar que el Deploy se Inició

Después de hacer "Redeploy", deberías ver:
- Un nuevo deployment en la lista
- Estado: "Building" o "Deploying"
- Commit: `58c4475` o más reciente

## 📞 Si NADA funciona

1. **Desconectar y reconectar el repo:**
   - Settings → Source → "Disconnect"
   - Luego "Connect GitHub repo" → seleccionar `ralborta/constanza`

2. **Verificar permisos de Railway en GitHub:**
   - GitHub → Settings → Applications → Authorized OAuth Apps
   - Railway debe tener permisos de lectura del repo

3. **Crear un nuevo servicio:**
   - Si el servicio está muy mal configurado, crear uno nuevo
   - New Service → GitHub Repo → `ralborta/constanza`
   - Configurar Dockerfile Path: `apps/<servicio>/Dockerfile`

