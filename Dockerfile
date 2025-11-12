# syntax=docker/dockerfile:1
FROM node:20-alpine AS build

RUN apk add --no-cache openssl \
 && corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /repo

# Manifests primero para cache correcto
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps ./apps
COPY packages ./packages
COPY infra ./infra

# Install (lockfile congelado)
RUN pnpm install --frozen-lockfile

# Elegimos el servicio a compilar desde Railway (Build Arg)
ARG SERVICE
ENV SERVICE=${SERVICE}

# Generar Prisma y compilar SOLO ese servicio
RUN pnpm --filter "@constanza/${SERVICE}" run generate
RUN pnpm --filter "@constanza/${SERVICE}" run build

# Imagen final
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copiamos node_modules y el paquete compilado desde el stage build
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/${SERVICE} ./apps/${SERVICE}

ENV NODE_ENV=production

# Usar formato shell para que ${SERVICE} se expanda correctamente
CMD sh -c "node apps/${SERVICE}/dist/index.js"
