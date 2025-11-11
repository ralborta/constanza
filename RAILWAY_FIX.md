# 🔧 Fix para Railway - pnpm-lock.yaml

## Problema

Railway está fallando porque no encuentra `pnpm-lock.yaml` durante el build.

## Solución Aplicada

1. ✅ `pnpm-lock.yaml` agregado al repositorio (commit `a2f9f03`)
2. ✅ Referencias de Prisma corregidas en `package.json`
3. ✅ Configuración explícita para Railway (`nixpacks.toml`, `Dockerfile.railway`)

## Verificar en Railway

### Opción 1: Forzar nuevo deploy

1. Ve a tu servicio en Railway
2. Settings → Deployments
3. Click en "Redeploy" o "Deploy latest commit"

### Opción 2: Verificar Root Directory

Asegúrate de que el **Root Directory** esté configurado correctamente:

- **Para servicios individuales**: Dejar vacío (raíz del repo) o `apps/api-gateway`
- **Railway necesita acceso a**:
  - `pnpm-lock.yaml` (en la raíz)
  - `package.json` (en la raíz)
  - `pnpm-workspace.yaml` (en la raíz)

### Opción 3: Build Command Manual

Si sigue fallando, configura manualmente el Build Command en Railway:

```bash
corepack enable && corepack prepare pnpm@8.15.0 --activate && pnpm install --frozen-lockfile && cd apps/api-gateway && pnpm build
```

Y Start Command:

```bash
cd apps/api-gateway && pnpm start
```

## Verificar que el archivo está en GitHub

```bash
curl -s https://raw.githubusercontent.com/ralborta/constanza/main/pnpm-lock.yaml | head -1
```

Debería mostrar: `lockfileVersion: '6.0'`

## Si sigue fallando

1. Verifica que Railway esté usando el commit más reciente (`e768673`)
2. Revisa los logs de build en Railway
3. Asegúrate de que el Root Directory esté en la raíz del repo (no en `apps/`)

