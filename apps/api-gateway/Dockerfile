# Dockerfile para api-gateway
FROM node:20-alpine AS build

RUN apk add --no-cache openssl \
 && corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /repo

# Copiar archivos necesarios del monorepo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api-gateway ./apps/api-gateway
COPY packages ./packages
COPY infra ./infra

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Generar Prisma y compilar (desde root con filtro)
RUN pnpm --filter "@constanza/api-gateway" run generate
RUN pnpm --filter "@constanza/api-gateway" run build

# Imagen final
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copiar node_modules y dist
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api-gateway/dist ./dist
COPY --from=build /repo/apps/api-gateway/package.json ./

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]

