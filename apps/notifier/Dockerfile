# syntax=docker/dockerfile:1
FROM node:20-alpine AS build

# Habilitar pnpm
RUN apk add --no-cache openssl \
 && corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /repo

# Copiar manifiestos y código del monorepo (contexto: raíz del repo)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json types.d.ts ./
COPY apps ./apps
COPY packages ./packages
COPY infra ./infra

# Instalar dependencias bloqueadas por lockfile
RUN pnpm install --frozen-lockfile

# Generar cliente prisma (hot-fix)
RUN npx -y prisma@5.22.0 generate --schema=infra/prisma/schema.prisma

# Compilar únicamente el servicio notifier
ARG SERVICE=notifier
ENV SERVICE=${SERVICE}
RUN pnpm --filter "@constanza/${SERVICE}" run build

# Imagen final minimal
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copiar manifiestos necesarios para instalar deps de producción del servicio
COPY --from=build /repo/package.json ./
COPY --from=build /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/pnpm-lock.yaml ./
COPY --from=build /repo/apps/${SERVICE}/package.json ./apps/${SERVICE}/package.json
COPY --from=build /repo/infra ./infra

# Instalar solo prod deps del servicio específico
ARG SERVICE=notifier
ENV SERVICE=${SERVICE}
RUN pnpm install --frozen-lockfile --prod --filter "@constanza/${SERVICE}"

# Copiar el build del servicio
COPY --from=build /repo/apps/${SERVICE}/dist ./apps/${SERVICE}/dist

ENV NODE_ENV=production

CMD ["sh", "-c", "node apps/${SERVICE}/dist/index.js"]

# Dockerfile para notifier
FROM node:20-alpine AS build

RUN apk add --no-cache openssl \
 && corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /repo

# Copiar archivos necesarios del monorepo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json types.d.ts ./
COPY apps/notifier ./apps/notifier
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
ARG SERVICE=notifier
ENV SERVICE=${SERVICE}
RUN pnpm --filter "@constanza/${SERVICE}" run build

# Imagen final
FROM node:20-alpine AS runner

# Instalar dependencias SSL necesarias para Prisma Query Engine
RUN apk add --no-cache openssl libc6-compat

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copiar solo lo necesario para instalar deps de producción
COPY --from=build /repo/package.json ./
COPY --from=build /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/pnpm-lock.yaml ./
COPY --from=build /repo/apps/notifier/package.json ./apps/notifier/package.json
COPY --from=build /repo/infra ./infra

# Instalar SOLO las dependencias de producción del servicio
RUN pnpm install --frozen-lockfile --prod --filter "@constanza/notifier"

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
COPY --from=build /repo/apps/notifier/dist ./apps/notifier/dist

ENV NODE_ENV=production

# Ejecutar desde /app (root del workspace)
# NOTA: Las migraciones se ejecutan solo desde api-gateway
CMD sh -c "node apps/notifier/dist/index.js"

