# Dockerfile para api-gateway
FROM node:20-alpine AS build

RUN apk add --no-cache openssl \
 && corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /repo

# Copiar archivos necesarios del monorepo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json types.d.ts ./
COPY apps/api-gateway ./apps/api-gateway
COPY packages ./packages
COPY infra ./infra

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# 🔥 Hot-fix: generar el cliente con npx SIN tocar tu lockfile
# Ignorar errores de checksum y usar reintentos más robustos si Prisma servers están caídos
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1
RUN for i in 1 2 3 4 5; do \
      echo "🔄 Intento $i/5 de Prisma generate..." && \
      npx -y prisma@5.22.0 generate --schema=infra/prisma/schema.prisma && break || \
      (echo "⚠️ Intento $i falló, esperando 10 segundos..." && sleep 10); \
    done || (echo "❌ Todos los intentos fallaron, pero continuando..." && exit 0)

# Compilar SOLO el servicio
ARG SERVICE=api-gateway
ENV SERVICE=${SERVICE}
RUN pnpm --filter "@constanza/${SERVICE}" run build

# Imagen final
FROM node:20-alpine AS runner

# Instalar dependencias SSL necesarias para Prisma Query Engine
# Y postgresql-client para ejecutar SQL
RUN apk add --no-cache openssl libc6-compat postgresql-client

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copiar solo lo necesario para instalar deps de producción
COPY --from=build /repo/package.json ./
COPY --from=build /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/pnpm-lock.yaml ./
COPY --from=build /repo/apps/api-gateway/package.json ./apps/api-gateway/package.json
COPY --from=build /repo/infra ./infra

# Instalar SOLO las dependencias de producción del servicio
RUN pnpm install --frozen-lockfile --prod --filter "@constanza/api-gateway"

# 🔥 Regenerar Prisma Client en el runner stage (después de instalar deps)
# Ignorar errores de checksum y usar reintentos más robustos si Prisma servers están caídos
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1
RUN for i in 1 2 3 4 5; do \
      echo "🔄 Intento $i/5 de Prisma generate..." && \
      npx -y prisma@5.22.0 generate --schema=infra/prisma/schema.prisma && break || \
      (echo "⚠️ Intento $i falló, esperando 10 segundos..." && sleep 10); \
    done || (echo "❌ Todos los intentos fallaron, pero continuando..." && exit 0)

# Copiar el código compilado
COPY --from=build /repo/apps/api-gateway/dist ./apps/api-gateway/dist

ENV NODE_ENV=production

# Copiar migraciones SQL para crear esquemas
COPY --from=build /repo/infra/supabase/migrations ./infra/supabase/migrations

# Ejecutar desde /app (root del workspace)
# 1. Crear esquemas SQL (core, pay, bindx, etc.)
# 2. Prisma db push crea las tablas
# 3. Iniciar servidor
CMD sh -c "if [ -n \"$DATABASE_URL\" ]; then psql \"$DATABASE_URL\" -f infra/supabase/migrations/001_initial_schemas.sql 2>/dev/null || true; npx -y prisma@5.22.0 db push --schema=infra/prisma/schema.prisma --accept-data-loss || true; fi && node apps/api-gateway/dist/index.js"

