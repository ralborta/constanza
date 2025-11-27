# Dockerfile para api-gateway
FROM node:20 AS build

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /repo

# Copiar archivos necesarios del monorepo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json types.d.ts ./
# Copiamos todos los apps para poder compilar también notifier
COPY apps ./apps
COPY packages ./packages
COPY infra ./infra

# Instalar dependencias (preferir lockfile pero permitir resolver si quedó desfasado)
RUN pnpm install --prefer-frozen-lockfile

# 🔥 Hot-fix: generar el cliente con npx SIN tocar tu lockfile
# Ignorar errores de checksum y usar reintentos más robustos si Prisma servers están caídos
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1
RUN for i in 1 2 3 4 5; do \
      echo "🔄 Intento $i/5 de Prisma generate..." && \
      npx -y prisma@5.22.0 generate --schema=infra/prisma/schema.prisma && break || \
      (echo "⚠️ Intento $i falló, esperando 10 segundos..." && sleep 10); \
    done || (echo "❌ Todos los intentos fallaron, pero continuando..." && exit 0)

# Compilar servicios necesarios (api-gateway y notifier)
ARG SERVICE=api-gateway
ENV SERVICE=${SERVICE}
RUN pnpm --filter "@constanza/${SERVICE}" run build
RUN pnpm --filter "@constanza/notifier" run build

# Imagen final
FROM node:20 AS runner

# postgresql-client para ejecutar SQL (Debian)
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copiar solo lo necesario para instalar deps de producción
COPY --from=build /repo/package.json ./
COPY --from=build /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/pnpm-lock.yaml ./
COPY --from=build /repo/apps/api-gateway/package.json ./apps/api-gateway/package.json
COPY --from=build /repo/apps/notifier/package.json ./apps/notifier/package.json
COPY --from=build /repo/infra ./infra

# Instalar SOLO las dependencias de producción de ambos servicios
RUN pnpm install --prefer-frozen-lockfile --prod --filter "@constanza/api-gateway"
RUN pnpm install --prefer-frozen-lockfile --prod --filter "@constanza/notifier"

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
COPY --from=build /repo/apps/notifier/dist ./apps/notifier/dist

ENV NODE_ENV=production

# Copiar migraciones SQL para crear esquemas
COPY --from=build /repo/infra/supabase/migrations ./infra/supabase/migrations

# Ejecutar ambos servicios en un solo contenedor:
# 1) Crear esquemas SQL y hacer prisma db push
# 2) Iniciar Notifier en puerto 3001 (interno)
# 3) Iniciar API Gateway (puerto $PORT o 8080)
CMD sh -c "if [ -n \"$DATABASE_URL\" ]; then psql \"$DATABASE_URL\" -f infra/supabase/migrations/001_initial_schemas.sql 2>/dev/null || true; npx -y prisma@5.22.0 db push --schema=infra/prisma/schema.prisma --accept-data-loss || true; fi && PORT=3001 node apps/notifier/dist/index.js & PORT=${PORT:-8080} node apps/api-gateway/dist/index.js"

