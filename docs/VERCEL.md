# Deploy del front (Vercel)

El Next.js vive en `apps/web` (monorepo pnpm). Hay que decirle a Vercel que use esa carpeta y que instale desde la **raíz** del repo.

## 1. Ajustes en el proyecto Vercel (una vez)

1. [Vercel](https://vercel.com) → tu proyecto → **Settings** → **General**.
2. **Root Directory** → `apps/web` → **Save**.
3. **Build & Development Settings** (misma página, abajo):
   - **Framework Preset:** Next.js (debería detectarse solo).
   - **Build Command:** dejar vacío o `pnpm run build` (ya está en `apps/web/vercel.json`).
   - **Install Command:** dejar vacío (también lo define `vercel.json`: instala desde la raíz del monorepo).
4. **Environment Variables:** `NEXT_PUBLIC_API_URL` = URL pública de tu api-gateway (Railway).

Tras guardar, **Deployments** → **Redeploy** el último commit (o hacé push a `main`).

## 2. Deploy automático al pushear (GitHub)

Opción A — **Deploy Hook** (simple):

1. Vercel → proyecto → **Settings** → **Git** → **Deploy Hooks** → Create Hook (branch `main`).
2. Copiá la URL del hook.
3. En GitHub → repo → **Settings** → **Secrets and variables** → **Actions** → New repository secret:
   - Nombre: `VERCEL_DEPLOY_HOOK`
   - Valor: la URL del hook.

El workflow `.github/workflows/deploy-vercel-web.yml` llamará a ese hook en cada push a `main` (solo si el secret existe).

Opción B — Conectar el repo en Vercel (**Git** → **Connect Repository**) y que el proyecto use **Root Directory** `apps/web`. Cada push a la rama de producción debería disparar build sin el hook.

## 3. Si el build falla

- Revisá que **Root Directory** sea exactamente `apps/web`.
- Revisá logs del deploy: tiene que ejecutarse `pnpm install` desde la raíz (workspace).
