# 🚀 Forzar Deploy AHORA - Paso a Paso

## ⚡ Para CADA servicio (`notifier`, `api-gateway`, `rail-cucuru`):

### 1. Ir al servicio en Railway
- Click en el servicio (ej: `@constanza/notifier`)

### 2. Forzar Redeploy
**Opción A: Desde el Dashboard**
- Click en el botón **"Redeploy"** o **"Deploy latest commit"**
- Si no ves el botón, ir a la pestaña "Deployments"

**Opción B: Desde Settings**
- Settings → Deploy
- Click en **"Redeploy"** o **"Deploy latest commit"**

### 3. Verificar el commit
- Debe mostrar el commit: `58c4475 - fix: Usar pnpm exec -- prisma en lugar de pnpm dlx`
- Si muestra un commit viejo, hacer "Clear build cache" primero

### 4. Limpiar cache (recomendado)
- Settings → Build
- Click en **"Clear build cache"**
- Luego hacer "Redeploy"

## ✅ Checklist Rápido

Para cada servicio:
- [ ] Ir al servicio en Railway
- [ ] Settings → Build → "Clear build cache"
- [ ] Dashboard → "Redeploy" o "Deploy latest commit"
- [ ] Verificar que use commit `58c4475`
- [ ] Esperar a que termine el build
- [ ] Verificar que no haya errores

## 🔍 Cómo Verificar que Funcionó

En los logs del build deberías ver:
```
Step 16/XX : RUN pnpm install --frozen-lockfile
Step 19/XX : RUN pnpm exec -- prisma generate --schema=infra/prisma/schema.prisma
Prisma schema loaded from infra/prisma/schema.prisma
✔ Generated Prisma Client (v5.22.0) ...
Step 22/XX : RUN pnpm --filter "@constanza/notifier" run build
```

Si ves errores, compartir los logs.

