# Railway CLI — sin “kilombo”

## El error típico

Cuando ves `Open the browser? (Y/n)` **solo podés responder** una letra:

- **`y`** + Enter → abre el navegador para login  
- **`n`** + Enter → no abre navegador  

**No pegues** `railway link`, `railway up`) ni comentarios en esa misma línea. Si pegás algo largo, sale `Invalid answer`.

---

## Pasos uno por uno (copiá **un solo** comando por vez)

### 1) Instalar CLI (una vez)

```bash
npm install -g @railway/cli
```

### 2) Login

```bash
railway login
```

Cuando pregunte `Open the browser?` → escribí **`y`** y Enter.  
Completá el login en el navegador que se abre. **Cerrá la terminal** si quedó rara y abrí una nueva.

### 3) Ir al repo

```bash
cd /Users/ralborta/Constanza
```

### 4) Enlazar al proyecto (te va a preguntar en menús interactivos)

```bash
railway link
```

Elegí **proyecto** y **servicio** (el del api-gateway) con las flechas y Enter.

### 5) Deploy del servicio enlazado

```bash
railway up
```

(O desde el dashboard web: **Deployments → Redeploy** — no hace falta CLI.)

---

## Sin menús interactivos (token)

1. En [railway.app](https://railway.app) → **Account** → **Tokens** → creá un token.
2. En tu Mac, **solo para la sesión actual**:

```bash
export RAILWAY_TOKEN='pegá_el_token'
cd /Users/ralborta/Constanza
railway link
```

(El `link` puede seguir siendo interactivo la primera vez.)

Para CI/CD, usar el token en GitHub Actions es mejor que pegar en la terminal.

---

## Si solo querés redeploy

No hace falta CLI: **Railway web → tu servicio → Deployments → Redeploy**.
