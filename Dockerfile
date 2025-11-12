# syntax=docker/dockerfile:1
# Dockerfile multi-app para Railway
# Railway configurará el Build Arg SERVICE para cada servicio

FROM node:20-alpine AS base

# Instalar dependencias del sistema necesarias para Prisma
RUN apk add --no-cache openssl libc6-compat

# Habilitar pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copiar manifests y lockfile (para cache correcto)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copiar el resto del repo que necesitan los builds
COPY apps ./apps
COPY packages ./packages
COPY infra ./infra

# Instalar deps de todos los workspaces
RUN pnpm install --frozen-lockfile

# Generar Prisma Client en CADA app que lo usa
RUN pnpm --filter @constanza/notifier run generate || true
RUN pnpm --filter @constanza/rail-cucuru run generate || true
RUN pnpm --filter @constanza/api-gateway run generate || true

# -----------------------------------------------------------------------------
# Elegir qué app compilar pasando ARG SERVICE
# Railway: configurar Build args -> SERVICE=notifier (o rail-cucuru, api-gateway)
# -----------------------------------------------------------------------------
ARG SERVICE
ENV SERVICE=${SERVICE}

# Compilar solo el servicio indicado
RUN pnpm --filter "@constanza/${SERVICE}" run build

# Imagen final
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copiar node_modules y el paquete compilado
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/${SERVICE} ./apps/${SERVICE}
COPY --from=base /app/infra ./infra
COPY --from=base /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=base /app/package.json ./package.json

ENV NODE_ENV=production

# Usar el servicio indicado
CMD ["sh", "-c", "pnpm --filter \"@constanza/${SERVICE}\" start"]

