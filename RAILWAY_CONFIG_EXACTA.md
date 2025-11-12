# ⚙️ Configuración EXACTA en Railway - Paso a Paso

## 🎯 Para CADA Servicio (notifier, api-gateway, rail-cucuru)

### 1. Ir a Settings → Build

#### Para `@constanza/notifier`:
```
Builder: Dockerfile
Dockerfile Path: apps/notifier/Dockerfile
Root Directory: /
Custom Build Command: (DEJAR VACÍO)
Build Args: (DEJAR VACÍO - eliminar si existe SERVICE=notifier)
```

#### Para `@constanza/api-gateway`:
```
Builder: Dockerfile
Dockerfile Path: apps/api-gateway/Dockerfile
Root Directory: /
Custom Build Command: (DEJAR VACÍO)
Build Args: (DEJAR VACÍO - eliminar si existe SERVICE=api-gateway)
```

#### Para `@constanza/rail-cucuru`:
```
Builder: Dockerfile
Dockerfile Path: apps/rail-cucuru/Dockerfile
Root Directory: /
Custom Build Command: (DEJAR VACÍO)
Build Args: (DEJAR VACÍO - eliminar si existe SERVICE=rail-cucuru)
```

### 2. Settings → Deploy
```
Start Command: (DEJAR VACÍO)
```

### 3. Limpiar y Redeploy
1. Settings → Build → "Clear build cache"
2. Dashboard → "Redeploy" o "Deploy latest commit"

## 🚨 Servicios que NO deberían estar en Railway

### `@constanza/web`
- **Este va a Vercel**, no a Railway
- Si está en Railway, podés eliminarlo o dejarlo (no va a funcionar bien)

### `@constanza/prisma`
- **Este NO es un servicio**, es un package compartido
- **ELIMINAR este servicio de Railway** (no debería estar ahí)

## ✅ Checklist Final

Para cada servicio (`notifier`, `api-gateway`, `rail-cucuru`):

- [ ] Dockerfile Path = `apps/<servicio>/Dockerfile`
- [ ] Custom Build Command = (vacío)
- [ ] Build Args = (vacío)
- [ ] Root Directory = `/`
- [ ] Start Command = (vacío)
- [ ] Clear cache hecho
- [ ] Redeploy hecho

## 🔍 Cómo Verificar que Funcionó

Después del redeploy, en los logs deberías ver:
```
Step 1/XX : FROM node:20-alpine AS build
Step 2/XX : RUN apk add --no-cache openssl
...
Step X/XX : COPY apps/notifier ./apps/notifier
Step X/XX : RUN pnpm install --frozen-lockfile
Step X/XX : RUN pnpm generate
Step X/XX : RUN pnpm build
```

Si ves errores de "Cannot find Dockerfile" → el path está mal
Si ves "ERR_PNPM_NO_LOCKFILE" → Root Directory no es `/`

