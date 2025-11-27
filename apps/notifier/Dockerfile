# syntax=docker/dockerfile:1
FROM node:20 AS build

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /repo

# Copiar manifiestos y código del monorepo (contexto: raíz del repo)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json types.d.ts ./
COPY apps ./apps
COPY packages ./packages
COPY infra ./infra

# Instalar dependencias (permitiendo leve desfase de lockfile)
RUN pnpm install --prefer-frozen-lockfile

# Compilar únicamente el servicio notifier
ARG SERVICE=notifier
ENV SERVICE=${SERVICE}
RUN pnpm --filter "@constanza/${SERVICE}" run build

# Imagen final sobre Debian (glibc/openssl 3)
FROM node:20 AS runner

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copiar manifiestos necesarios para instalar deps de producción del servicio
COPY --from=build /repo/package.json ./
COPY --from=build /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/pnpm-lock.yaml ./
COPY --from=build /repo/apps/notifier/package.json ./apps/notifier/package.json
COPY --from=build /repo/infra ./infra

# Instalar solo prod deps del servicio específico
RUN pnpm install --prefer-frozen-lockfile --prod --filter "@constanza/notifier"

# Limpiar engines antiguos y regenerar Prisma Client para Debian
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1
RUN rm -rf node_modules/.prisma && \
    rm -rf node_modules/@prisma/client/runtime/* || true && \
    rm -f node_modules/@prisma/client/*.so.node || true && \
    npx -y prisma@5.22.0 generate --schema=infra/prisma/schema.prisma

# Copiar el build del servicio
COPY --from=build /repo/apps/notifier/dist ./apps/notifier/dist

ENV NODE_ENV=production

CMD ["node", "apps/notifier/dist/index.js"]