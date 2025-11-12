# syntax=docker/dockerfile:1
# Dockerfile multi-app para Railway
# Railway configurará el Build Arg SERVICE para cada servicio
# Ejemplo: docker build --build-arg SERVICE=api-gateway -t constanza-api-gateway .

FROM node:20-alpine AS base

# Instalar dependencias del sistema necesarias para Prisma
RUN apk add --no-cache openssl libc6-compat

# Habilitar pnpm (versión alineada con local)
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copiar manifests y lockfile (para cache correcto)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copiar el resto del repo que necesitan los builds
COPY apps ./apps
COPY packages ./packages
COPY infra ./infra

# Instalar deps de todos los workspaces (incluye prisma en deps)
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Elegir qué app compilar pasando ARG SERVICE
# Railway: configurar Build args -> SERVICE=notifier (o rail-cucuru, api-gateway)
# -----------------------------------------------------------------------------
ARG SERVICE
ENV SERVICE=${SERVICE}

# Orden crítico: 1) Generar Prisma Client, 2) Compilar TypeScript
RUN pnpm --filter "@constanza/${SERVICE}" run generate
RUN pnpm --filter "@constanza/${SERVICE}" run build

# Imagen final (runner)
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copiar node_modules y el paquete compilado
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/${SERVICE} ./apps/${SERVICE}
COPY --from=base /app/infra ./infra
COPY --from=base /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=base /app/package.json ./package.json

# Copiar Prisma Client generado (si está en node_modules/.prisma)
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma 2>/dev/null || true

ENV NODE_ENV=production

# Usar el servicio indicado
CMD ["sh", "-c", "pnpm --filter \"@constanza/${SERVICE}\" start"]
