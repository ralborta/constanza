# Setup Inicial - Constanza

## ✅ Completado

- ✅ Estructura del monorepo
- ✅ Schema Prisma completo
- ✅ API Gateway básico
- ✅ Autenticación JWT
- ✅ Endpoints CRUD (invoices, customers, KPIs)
- ✅ Seed de datos
- ✅ RLS policies (SQL)
- ✅ Dashboard web (Next.js 14)
- ✅ Notifier con BullMQ

## Prerequisitos

- Node.js 20+
- pnpm 8+
- Supabase cuenta y proyecto
- Redis (local o Railway)
- Railway cuenta (opcional para desarrollo local)

## Instalación

```bash
# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp apps/api-gateway/.env.example apps/api-gateway/.env
cp apps/web/.env.example apps/web/.env
cp apps/notifier/.env.example apps/notifier/.env
cp infra/prisma/.env.example infra/prisma/.env

# Editar .env files con tus valores
```

## Base de Datos

### 1. Crear esquemas en Supabase

```bash
# Aplicar migración SQL de esquemas
supabase db push
# O manualmente ejecutar: infra/supabase/migrations/001_initial_schemas.sql
```

### 2. Aplicar migraciones Prisma

```bash
# Generar cliente Prisma
cd infra/prisma
pnpm generate

# Crear y aplicar migraciones
pnpm migrate
```

### 3. Aplicar RLS policies

```bash
# Ejecutar migración SQL de RLS
supabase db push
# O ejecutar: infra/supabase/migrations/002_rls_policies.sql
```

### 4. Seed de datos de prueba

```bash
cd infra/prisma
pnpm seed
```

**Credenciales de prueba:**
- Admin: `admin@constanza.com` / `admin123`
- Operador 1: `operador1@constanza.com` / `operador123`
- Cliente: `cliente@acme.com` / `cliente123`

## Desarrollo

### API Gateway

```bash
cd apps/api-gateway
pnpm dev
# http://localhost:3000
```

### Web (Next.js)

```bash
cd apps/web
pnpm dev
# http://localhost:3001
```

### Notifier

```bash
# Asegúrate de tener Redis corriendo
redis-server

cd apps/notifier
pnpm dev
# http://localhost:3002
```

## Endpoints Disponibles

### API Gateway (puerto 3000)

**Autenticación:**
- `POST /auth/login` - Login empleados
- `POST /auth/customer/login` - Login clientes
- `GET /auth/verify` - Verificar token

**Facturas:**
- `GET /v1/invoices` - Lista facturas (con filtros)
- `GET /v1/invoices/:id` - Detalle con timeline

**Clientes:**
- `GET /v1/customers` - Lista clientes
- `POST /v1/customers` - Crear cliente

**KPIs:**
- `GET /v1/kpi/summary` - Resumen de KPIs

### Notifier (puerto 3002)

- `POST /notify/send` - Agregar mensaje a cola
- `GET /health` - Estado de la cola

## Estructura del Proyecto

```
apps/
  ├── api-gateway/     # Fastify API Gateway
  ├── web/             # Next.js 14 Dashboard
  └── notifier/        # BullMQ Worker (Email/WhatsApp/Voice)

packages/
  └── events/          # Contratos Zod de eventos

infra/
  ├── prisma/          # Schema y migraciones
  └── supabase/       # Migraciones SQL (RLS)
```

## Próximos Pasos

1. ✅ Dashboard web básico
2. ✅ Notifier con BullMQ
3. 🚧 Integrar rail-cucuru existente
4. 🚧 Contact Orchestrator
5. 🚧 Rail BindX (e-cheques)
