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
# El lockfile del workspace puede cambiar al agregar dependencias.
# En entornos CI/containers preferimos asegurar instalación aunque el lockfile cambie.
RUN pnpm install --prefer-frozen-lockfile

# 🔥 Generar Prisma Client en el stage de build dentro del workspace del servicio
# (no es necesario volver a /app porque el WORKDIR aquí es /repo)
RUN cd apps/notifier && npx -y prisma@5.22.0 generate --schema=../../infra/prisma/schema.prisma

# Elegimos el servicio a compilar desde Railway (Build Arg)
# Valor por defecto para evitar fallos si no se pasa el build-arg
ARG SERVICE=notifier
ENV SERVICE=${SERVICE}

# Compilar SOLO ese servicio
RUN pnpm --filter "@constanza/${SERVICE}" run build

# Imagen final
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copiar solo lo necesario para instalar deps de producción
COPY --from=build /repo/package.json ./
COPY --from=build /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/pnpm-lock.yaml ./
COPY --from=build /repo/apps/notifier/package.json ./apps/notifier/package.json
COPY --from=build /repo/infra ./infra

# Instalar SOLO las dependencias de producción del servicio específico
ARG SERVICE=notifier
ENV SERVICE=${SERVICE}
RUN pnpm install --prefer-frozen-lockfile --prod --filter "@constanza/notifier"

# Generar Prisma Client dentro de la imagen final (la postinstall no encuentra el schema)
# Ejecutamos de forma explícita contra nuestro path de schema
RUN npx -y prisma@5.22.0 generate --schema=infra/prisma/schema.prisma

# Copiar el código compilado
COPY --from=build /repo/apps/notifier/dist ./apps/notifier/dist

ENV NODE_ENV=production

# Ejecutar desde /app (root del workspace)
CMD sh -c "node apps/notifier/dist/index.js"
