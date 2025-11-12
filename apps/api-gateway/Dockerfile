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
RUN npx -y prisma@5.22.0 generate --schema=infra/prisma/schema.prisma

# Compilar SOLO el servicio
ARG SERVICE=api-gateway
ENV SERVICE=${SERVICE}
RUN pnpm --filter "@constanza/${SERVICE}" run build

# Imagen final
FROM node:20-alpine AS runner

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
RUN npx -y prisma@5.22.0 generate --schema=infra/prisma/schema.prisma

# Copiar el código compilado
COPY --from=build /repo/apps/api-gateway/dist ./apps/api-gateway/dist

ENV NODE_ENV=production

# Ejecutar desde /app (root del workspace)
CMD sh -c "node apps/api-gateway/dist/index.js"

