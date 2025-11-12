# Dockerfile para rail-cucuru
FROM node:20-alpine AS build

RUN apk add --no-cache openssl \
 && corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /repo

# Copiar archivos necesarios del monorepo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/rail-cucuru ./apps/rail-cucuru
COPY packages ./packages
COPY infra ./infra

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# 🔥 Hot-fix: generar el cliente con npx SIN tocar tu lockfile
RUN npx -y prisma@5.22.0 generate --schema=infra/prisma/schema.prisma

# Compilar SOLO el servicio
ARG SERVICE=rail-cucuru
ENV SERVICE=${SERVICE}
RUN pnpm --filter "@constanza/${SERVICE}" run build

# Imagen final
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copiar node_modules y dist
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/rail-cucuru/dist ./dist
COPY --from=build /repo/apps/rail-cucuru/package.json ./

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]

