# Prisma Setup

## Configuración

1. Copiar `.env.example` a `.env` y configurar `DATABASE_URL`:

```bash
cp .env.example .env
# Editar .env con tu DATABASE_URL de Supabase
```

2. Generar Prisma Client:

```bash
pnpm generate
```

3. Crear migraciones:

```bash
pnpm migrate
# Esto creará la primera migración basada en schema.prisma
```

4. Aplicar migraciones SQL de Supabase:

```bash
# Desde la raíz del proyecto
supabase db push
```

5. Seed de datos de prueba:

```bash
pnpm seed
```

## Estructura

- `schema.prisma` - Schema completo de la base de datos
- `migrations/` - Migraciones generadas por Prisma
- `seed.ts` - Script para poblar datos de prueba

## Comandos

- `pnpm generate` - Genera Prisma Client
- `pnpm migrate` - Crea y aplica migraciones
- `pnpm migrate:deploy` - Aplica migraciones en producción
- `pnpm studio` - Abre Prisma Studio (GUI)
- `pnpm seed` - Ejecuta seed de datos

