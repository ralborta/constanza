# Dockerfile para notifier
FROM node:20-alpine AS build

RUN apk add --no-cache openssl \
 && corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /repo

# Copiar archivos necesarios del monorepo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/notifier ./apps/notifier
COPY packages ./packages
COPY infra ./infra

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Generar Prisma usando el que ya está instalado (evita auto-instalación)
RUN pnpm exec -- prisma generate --schema=infra/prisma/schema.prisma

# Compilar
RUN pnpm --filter "@constanza/notifier" run build

# Imagen final
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copiar node_modules y dist
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/notifier/dist ./dist
COPY --from=build /repo/apps/notifier/package.json ./

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]

