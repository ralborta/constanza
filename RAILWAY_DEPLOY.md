# Configuración de Deploy en Railway - 5 Servicios

## Servicios a Deployar

1. **api-gateway** - API Gateway principal
2. **notifier** - Servicio de notificaciones (Email/WhatsApp/Voice)
3. **rail-cucuru** - Webhook receiver de Cucuru
4. **rail-bindx** - (Pendiente de desarrollo)
5. **web** - Frontend Next.js (debería estar en Vercel, pero si quieres en Railway)

## Configuración en Railway

### Para cada servicio, crear un nuevo servicio en Railway:

1. **Crear servicio** desde el repositorio GitHub
2. **Configurar Build Settings:**
   - **Build Command**: (dejar vacío, usar Dockerfile)
   - **Dockerfile Path**: `Dockerfile`
   - **Build Args**:
     ```
     SERVICE=api-gateway    # Cambiar según el servicio
     ```

### Variables de Entorno Comunes

Configurar en cada servicio:

```
NODE_ENV=production
DATABASE_URL=postgresql://...  # URL de Supabase
```

### Variables Específicas por Servicio

#### api-gateway
```
JWT_SECRET=tu-secret-jwt-aqui
REDIS_URL=redis://...  # Si usa Redis
```

#### notifier
```
BUILDERBOT_API_KEY=...
SMTP_URL=...
TTS_URL=...
REDIS_URL=redis://...
DATABASE_URL=postgresql://...
```

#### rail-cucuru
```
CUCURU_WEBHOOK_SECRET=...
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

#### web (si se deploya en Railway)
```
NEXT_PUBLIC_API_URL=https://api-gateway.railway.app
NEXT_PUBLIC_TENANT=tu-tenant-id
```

## Orden de Deploy Recomendado

1. **rail-cucuru** (más simple, solo webhooks)
2. **api-gateway** (depende de DB)
3. **notifier** (depende de DB y Redis)
4. **web** (depende de api-gateway)

## Verificación Post-Deploy

Para cada servicio, verificar:
- Health check: `GET /health` (si está disponible)
- Logs sin errores
- Variables de entorno configuradas

## Nota Importante

El servicio `web` (Next.js) está diseñado para deployarse en **Vercel**, no en Railway. Si lo deployas en Railway, necesitarás configurar:
- Build command: `cd apps/web && pnpm build`
- Start command: `cd apps/web && pnpm start`
- O crear un Dockerfile específico para Next.js

