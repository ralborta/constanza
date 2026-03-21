# Desplegar `rail-cucuru` en Railway (webhook Cresium)

Cresium debe llamar a:

`POST https://<tu-dominio-publico>/wh/cresium/deposito`

Ese endpoint **solo** lo sirve este servicio, no `api-gateway` ni la web.

## 1. Nuevo servicio en Railway

1. Mismo **proyecto** que Constanza (recomendado) o uno nuevo.
2. **New** → **GitHub Repo** → elegí el repo del monorepo.
3. Railway suele detectar Nixpacks; **no uses Nixpacks** para este app: hay que usar **Dockerfile**.

## 2. Build con Docker (importante)

El `Dockerfile` está en `apps/rail-cucuru/Dockerfile` pero el **contexto de build** tiene que ser la **raíz del monorepo** (copia `pnpm-workspace.yaml`, `infra/prisma`, etc.).

En Railway → el servicio **rail-cucuru** → **Settings**:

| Ajuste | Valor |
|--------|--------|
| **Root directory** | *(vacío o raíz del repo)* — raíz del monorepo, **no** `apps/rail-cucuru` |
| **Dockerfile path** | `apps/rail-cucuru/Dockerfile` |

Si Railway solo permite “Dockerfile” en la raíz, alternativa: dejar **Root directory** = `apps/rail-cucuru` y usar un Dockerfile que haga `COPY` desde arriba **no** aplica con el Dockerfile actual; **el contexto debe ser la raíz del repo**.

## 3. Red pública

- **Settings** → **Networking** → **Generate domain** (HTTPS).
- La URL base será algo como `https://xxxx.up.railway.app`.
- Webhook en Cresium: `https://xxxx.up.railway.app/wh/cresium/deposito`

## 4. Variables de entorno (mínimo)

Copiá desde el mismo Postgres que usa Constanza (o referencia compartida):

| Variable | Obligatorio | Notas |
|----------|-------------|--------|
| `DATABASE_URL` | Sí | Misma DB que el resto de Constanza (Prisma). |
| `CRESIUM_TENANT_ID` | Sí | UUID del tenant en `core.tenants`. |
| `CRESIUM_PARTNER_SECRET` | Sí (prod) | Mismo secret de partner que en Cresium para firmar webhooks. |
| `REDIS_URL` | No | Idempotencia; si falta, sigue funcionando sin deduplicación Redis. |
| `CRESIUM_COMPANY_ID` | No | Solo si lo usás y Cresium manda `x-company-id`. |

Lista completa: `VARIABLES_ENTORNO.md` (sección Cresium).

`PORT` lo define Railway; el código usa `process.env.PORT` (default 3003).

## 5. Watch paths (si usás auto-deploy por repo)

Si en otros servicios tenés **Watch Paths** restrictivos, para **este** servicio incluí al menos:

`apps/rail-cucuru/**`

y lo que comparta (`infra/prisma/**`, etc.), o desactivá watch paths solo para rail-cucuru para que cada push despliegue.

## 6. Verificar

```bash
curl -sS "https://<tu-host>.up.railway.app/health"
```

Debería responder JSON con `"status":"ok"` y `"service":"rail-cresium"`.

## 7. Deploy Hook (opcional)

Podés crear un **Deploy Hook** solo para este servicio y guardarlo en GitHub como otro secret si querés CI distinto al de api-gateway (ver `.github/workflows/railway-deploy-hook.yml`).
