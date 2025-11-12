# syntax=docker/dockerfile:1
# Dockerfile multi-app para Railway
# Railway configurará el Build Arg SERVICE para cada servicio
# Ejemplo: docker build --build-arg SERVICE=api-gateway -t constanza-api-gateway .

FROM node:20-alpine AS build

# Instalar dependencias del sistema necesarias para Prisma
RUN apk add --no-cache openssl libc6-compat \
 && corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /repo

# Copiar manifests y lockfile (para cache correcto)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copiar el resto del repo que necesitan los builds
COPY apps ./apps
COPY packages ./packages
COPY infra ./infra

# 1) Instalar con lockfile "congelado"
RUN pnpm install --frozen-lockfile

# 2) Elegimos el servicio a compilar
ARG SERVICE
ENV SERVICE=${SERVICE}

# 3) Generar Prisma y compilar SOLO ese servicio
RUN pnpm --filter "@constanza/${SERVICE}" run generate
RUN pnpm --filter "@constanza/${SERVICE}" run build

# Imagen final (runner)
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat \
 && corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copiar node_modules y el paquete compilado desde el stage build
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/${SERVICE} ./apps/${SERVICE}
COPY --from=build /repo/infra ./infra
COPY --from=build /repo/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /repo/package.json ./package.json

ENV NODE_ENV=production

# Usar el servicio indicado
CMD ["sh", "-c", "pnpm --filter \"@constanza/${SERVICE}\" start"]
