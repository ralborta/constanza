# Railway no deploya al pushear — Deploy Hook (plan B)

Si **GitHub está conectado** en Railway pero **no aparece ningún deployment** al hacer `git push`, el webhook puede estar roto. Esto **no lo arregla el código**: hay que reconectar en Railway (**Settings → Source → Disconnect / Connect**) o usar un **Deploy Hook** disparado desde **GitHub Actions**.

## Pasos (una vez)

### 1) Crear el hook en Railway

1. [railway.app](https://railway.app) → **proyecto** → servicio **api-gateway** (o el que quieras).
2. **Settings** (del servicio) → buscá **Deploy Hooks** (a veces bajo **Deployments** o **Git**).
3. **Create Deploy Hook** → rama **`main`** → copiá la **URL** (algo largo con token).

### 2) Guardar la URL en GitHub

1. GitHub → repo **constanza** → **Settings** → **Secrets and variables** → **Actions**.
2. **New repository secret**  
   - Name: `RAILWAY_DEPLOY_HOOK`  
   - Value: pegá la URL del paso 1.

### 3) Probar

Hacé un push a `main` (o dejá que corra el workflow `.github/workflows/railway-deploy-hook.yml`).

En **GitHub → Actions** deberías ver el job **Railway deploy (hook)**. Si el secret está bien, Railway arranca un deploy.

---

## Si no encontrás Deploy Hooks

En la UI de Railway cambia según versión: buscá **Deploy** / **Triggers** / **Webhooks** en el servicio, o usá **Redeploy** manual mientras tanto.

## Reconectar GitHub (plan A)

Railway → **Project** → **Settings** → **Source** → **Disconnect** del repo y volvé a **Connect** a `ralborta/constanza`, rama `main`.
