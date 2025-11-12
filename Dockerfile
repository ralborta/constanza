# syntax=docker/dockerfile:1
FROM node:20-alpine AS build

RUN apk add --no-cache openssl \
 && corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /repo

# Manifests + configs base primero para cache correcto
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json types.d.ts ./
COPY apps ./apps
COPY packages ./packages
COPY infra ./infra

# Install (lockfile congelado)
RUN pnpm install --frozen-lockfile

# 🔥 Hot-fix: generar el cliente con npx SIN tocar tu lockfile
RUN npx -y prisma@5.22.0 generate --schema=infra/prisma/schema.prisma

# Elegimos el servicio a compilar desde Railway (Build Arg)
ARG SERVICE
ENV SERVICE=${SERVICE}

# Compilar SOLO ese servicio
RUN pnpm --filter "@constanza/${SERVICE}" run build

# Imagen final
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copiamos TODO lo necesario para que pnpm resuelva módulos correctamente
COPY --from=build /repo/package.json ./
COPY --from=build /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/.pnpm ./pnpm 2>/dev/null || true
COPY --from=build /repo/apps/${SERVICE} ./apps/${SERVICE}

ENV NODE_ENV=production

# Usar formato shell para que ${SERVICE} se expanda correctamente
# Ejecutar desde /app para que Node.js resuelva módulos correctamente
CMD sh -c "cd /app && node apps/${SERVICE}/dist/index.js"
