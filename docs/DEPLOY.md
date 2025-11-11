# Guía de Despliegue

## Prerequisitos

- Cuenta en Vercel
- Cuenta en Railway
- Cuenta en Supabase
- Cuenta en GitHub
- Node.js 20+ instalado localmente
- pnpm instalado

## Setup Inicial

### 1. Clonar y Configurar Monorepo

```bash
git clone <repo>
cd Constanza
pnpm install
```

### 2. Configurar Supabase

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link proyecto
supabase link --project-ref <project-ref>

# Aplicar migraciones
supabase db push
```

### 3. Configurar Prisma

```bash
# Generar cliente
pnpm prisma generate

# Aplicar migraciones
pnpm prisma migrate deploy
```

## Variables de Entorno

### Vercel (Frontend)

```bash
vercel env add NEXT_PUBLIC_API_URL
vercel env add NEXT_PUBLIC_TENANT
```

### Railway (Microservicios)

Cada servicio necesita sus propias variables. Ver matriz en README.md.

```bash
# Ejemplo: api-gateway
railway variables set JWT_SECRET=<secret>
railway variables set DATABASE_URL=<supabase-url>
railway variables set REDIS_URL=<redis-url>
```

## Despliegue Manual

### Frontend (Vercel)

```bash
cd apps/web
vercel --prod
```

### Microservicios (Railway)

```bash
# Desde raíz del monorepo
railway up --service api-gateway
railway up --service contact-orchestrator
# ... etc
```

## CI/CD con GitHub Actions

### Workflow Básico

Crear `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm -w lint
      - run: pnpm -w test

  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: pnpm install
      - run: pnpm prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

  deploy-vercel:
    needs: [test, migrate]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./apps/web

  deploy-railway:
    needs: [test, migrate]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: bervProject/railway-deploy@v0.2.1
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: api-gateway
          # Repetir para cada servicio
```

### Secrets en GitHub

Configurar en Settings → Secrets and variables → Actions:

- `DATABASE_URL`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `RAILWAY_TOKEN`
- `JWT_SECRET`
- `REDIS_URL`
- `BUILDERBOT_API_KEY`
- `ELEVENLABS_API_KEY`
- `TWILIO_*`
- `CUCURU_WEBHOOK_SECRET`
- `BINDX_API_KEY`
- `BINDX_WEBHOOK_SECRET`

## Health Checks

Todos los servicios deben exponer `/health`:

```typescript
// Ejemplo
app.get('/health', async (req, res) => {
  const db = await checkDatabase();
  const redis = await checkRedis();
  
  if (db && redis) {
    return res.json({ status: 'ok' });
  }
  
  return res.status(503).json({ status: 'unhealthy' });
});
```

## Smoke Tests Post-Deploy

```bash
# API Gateway
curl https://api.constanza.com/health

# Cada microservicio
curl https://api.constanza.com/v1/health
```

## Rollback

### Vercel
```bash
vercel rollback
```

### Railway
```bash
railway rollback --service <service-name>
```

### Supabase
```sql
-- Revertir migración específica
-- (requiere backup o migración down)
```

## Monitoreo Post-Deploy

1. Verificar logs en Railway dashboard
2. Verificar métricas en Vercel dashboard
3. Ejecutar smoke tests
4. Verificar webhooks (test con payloads de prueba)

## Troubleshooting

### Error: "Database connection failed"
- Verificar `DATABASE_URL` en Railway
- Verificar que Supabase permite conexiones desde Railway IPs

### Error: "Redis connection failed"
- Verificar `REDIS_URL` en Railway
- Verificar que Redis está corriendo

### Error: "JWT verification failed"
- Verificar `JWT_SECRET` es el mismo en todos los servicios
- Verificar formato del token

### Error: "Webhook signature invalid"
- Verificar secret compartido con proveedor (Cucuru/BindX)
- Verificar algoritmo HMAC (SHA256)

## Próximos Pasos

1. Configurar alertas en Railway/Vercel
2. Setup OpenTelemetry (opcional)
3. Configurar backups automáticos en Supabase
4. Documentar runbooks operativos


