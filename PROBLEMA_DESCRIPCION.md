# 📋 Descripción del Problema - Deploy en Railway

## 🎯 Contexto

Estamos intentando deployar 3 microservicios en Railway desde un monorepo pnpm:
- `api-gateway`
- `notifier`
- `rail-cucuru`

Todos comparten:
- Un mismo schema de Prisma en `infra/prisma/schema.prisma`
- Dependencias instaladas con `pnpm install --frozen-lockfile`
- Necesitan generar Prisma Client antes de compilar TypeScript

## ❌ El Problema Principal

**Prisma intenta auto-instalarse durante `generate` y falla**, causando que todos los builds fallen.

### Síntomas

1. **Error durante `prisma generate`:**
   ```
   Error: Command failed with exit code 1: pnpm add prisma@5.22.0 -D --silent
   ```

2. **O error de comando no encontrado:**
   ```
   ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "prisma" not found
   ```

3. **Los builds fallan en la etapa de generación de Prisma Client**

## 🔍 Análisis del Problema

### ¿Por qué pasa esto?

1. **Monorepo con pnpm:**
   - Prisma está instalado como dependencia en cada app (`apps/api-gateway/package.json`)
   - pnpm usa una estructura de `node_modules` diferente (`.pnpm` store)
   - Los ejecutables pueden estar en diferentes ubicaciones

2. **Contexto Docker:**
   - Docker ejecuta comandos en un contexto aislado
   - El PATH puede no incluir `node_modules/.bin`
   - `pnpm exec` y `pnpm dlx` no siempre funcionan correctamente en Docker

3. **Auto-instalación de Prisma:**
   - Cuando Prisma no encuentra su ejecutable, intenta instalarse automáticamente
   - Esto falla porque estamos usando `--frozen-lockfile` (no permite instalar nuevas deps)
   - O porque no tiene permisos/contexto para instalar

### Intentos de Solución (que NO funcionaron)

1. ❌ `pnpm --filter "@constanza/api-gateway" run generate`
   - Prisma intenta auto-instalarse

2. ❌ `pnpm exec prisma generate`
   - Prisma intenta auto-instalarse

3. ❌ `pnpm dlx prisma generate`
   - Descarga Prisma 6.19.0 (última) pero el proyecto usa 5.22.0
   - Prisma intenta auto-instalarse

4. ❌ `pnpm exec -- prisma generate`
   - Error: `Command "prisma" not found`

5. ❌ `./node_modules/.bin/prisma generate`
   - Error: `./node_modules/.bin/prisma: not found`

6. ❌ `npx prisma generate`
   - Prisma intenta auto-instalarse

## ✅ Solución Actual (Intentando)

**Usar path relativo directo:**
```dockerfile
RUN node_modules/.bin/prisma generate --schema=infra/prisma/schema.prisma
```

### ¿Por qué debería funcionar?

- Usa el path relativo desde WORKDIR (`/repo`)
- Después de `pnpm install`, Prisma debería estar en `node_modules/.bin/prisma`
- No depende de `pnpm exec`, `npx`, ni variables de entorno
- Es la forma más directa y simple

### Estado Actual

- ✅ Commit pusheado: `c23f121`
- ⏳ Esperando resultado del deploy en Railway

## 🔄 Flujo del Build

```
1. pnpm install --frozen-lockfile
   ↓
2. node_modules/.bin/prisma generate --schema=infra/prisma/schema.prisma
   ↓ (debería generar Prisma Client)
3. pnpm --filter "@constanza/api-gateway" run build
   ↓ (compila TypeScript)
4. Copiar a imagen final
```

## 📊 Resumen

| Aspecto | Estado |
|---------|--------|
| **Código en GitHub** | ✅ Pusheado |
| **Dockerfiles** | ✅ Configurados |
| **Prisma instalado** | ✅ En dependencias |
| **Prisma generate** | ❌ Falla en Docker |
| **Build completo** | ❌ No llega a compilar |

## 🎯 Objetivo

Hacer que Prisma genere el Client **sin intentar auto-instalarse**, usando el Prisma que ya está instalado en `node_modules`.

