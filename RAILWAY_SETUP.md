# Configuración de Railway con Dockerfile Multi-App

## Cambios Implementados

### ✅ 1. Prisma Client por App
Cada app (`notifier`, `rail-cucuru`, `api-gateway`) ahora:
- Tiene su propio script `generate` que apunta al schema compartido
- Ejecuta `postinstall` para generar Prisma Client automáticamente
- Tiene `@prisma/client` y `prisma` como dependencias directas

### ✅ 2. `.npmrc` con Public Hoist
Creado en el root para que `@prisma/client` quede accesible en todos los workspaces.

### ✅ 3. Dockerfile Multi-App
Dockerfile parametrizado que:
- Instala todas las dependencias del monorepo
- Genera Prisma Client para cada app
- Compila solo el servicio indicado por `SERVICE`
- Usa sintaxis correcta de Docker/bash (no GitHub Actions)

### ✅ 4. Nixpacks Actualizado
Si Railway usa Nixpacks en lugar de Dockerfile:
- Usa sintaxis correcta de bash (`${RAILWAY_SERVICE_NAME}` en lugar de `${{...}}`)
- Genera Prisma Client antes de compilar

---

## Configuración en Railway

### Opción A: Usar Dockerfile (Recomendado)

1. **Crear un servicio por cada app** en Railway:
   - `api-gateway`
   - `notifier`
   - `rail-cucuru`

2. **Para cada servicio, configurar:**
   - **Build Command**: (dejar vacío, Railway usará el Dockerfile)
   - **Dockerfile Path**: `Dockerfile`
   - **Build Args**:
     ```
     SERVICE=api-gateway    # o notifier, rail-cucuru según el servicio
     ```

3. **Variables de Entorno** (comunes a todos):
   ```
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://...
   JWT_SECRET=...
   ```

4. **Variables específicas por servicio:**
   - `notifier`: `BUILDERBOT_API_KEY`, `SMTP_URL`, `TTS_URL`
   - `rail-cucuru`: `CUCURU_WEBHOOK_SECRET`
   - `api-gateway`: (solo las comunes)

### Opción B: Usar Nixpacks

Si prefieres Nixpacks (o Railway lo detecta automáticamente):

1. **Crear servicios** como en la Opción A
2. **Railway automáticamente:**
   - Detectará `nixpacks.toml`
   - Usará `RAILWAY_SERVICE_NAME` para saber qué app compilar
   - Ejecutará los comandos en el orden correcto

3. **Asegúrate de que `RAILWAY_SERVICE_NAME` esté configurado:**
   - Railway lo inyecta automáticamente
   - Debe coincidir con el nombre del servicio (ej: `api-gateway`, `notifier`, `rail-cucuru`)

---

## Verificación Local

Antes de deployar, verifica localmente:

```bash
# 1. Validar schema de Prisma
pnpm dlx prisma validate --schema=infra/prisma/schema.prisma

# 2. Generar Prisma Client en cada app
pnpm --filter @constanza/api-gateway run generate
pnpm --filter @constanza/notifier run generate
pnpm --filter @constanza/rail-cucuru run generate

# 3. Compilar cada app
pnpm --filter @constanza/api-gateway run build
pnpm --filter @constanza/notifier run build
pnpm --filter @constanza/rail-cucuru run build
```

---

## Troubleshooting

### Error: "Cannot find module '@prisma/client'"
- Verifica que cada app tenga `@prisma/client` en `dependencies`
- Verifica que el script `generate` se ejecute antes de `build`
- Revisa que `.npmrc` esté en el root

### Error: "bad substitution"
- Asegúrate de usar `${VAR}` en bash, no `${{VAR}}` (sintaxis de GitHub Actions)
- En Dockerfile usa `ARG SERVICE` y `ENV SERVICE=${SERVICE}`

### Error: "ERR_PNPM_NO_LOCKFILE"
- Verifica que `pnpm-lock.yaml` esté commiteado
- Verifica que `.dockerignore` no lo ignore

### Error: "Prisma Validation Error"
- Ejecuta `pnpm dlx prisma validate --schema=infra/prisma/schema.prisma`
- Corrige los errores antes de deployar

---

## Orden de Build Correcto

1. `pnpm install --frozen-lockfile` (instala todas las deps)
2. `pnpm --filter <app> run generate` (genera Prisma Client)
3. `pnpm --filter <app> run build` (compila TypeScript)

Este orden está garantizado en:
- Dockerfile (fases `install` → `build`)
- Nixpacks (fases `install` → `build`)
- Scripts `postinstall` (se ejecutan después de `install`)

---

## Próximos Pasos

1. Crear proyectos en Railway para cada servicio
2. Configurar Build Args (`SERVICE`) si usas Dockerfile
3. Configurar variables de entorno
4. Hacer deploy y verificar logs

