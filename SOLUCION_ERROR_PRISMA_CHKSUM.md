# 🔧 Solución: Error de Prisma Checksum en Railway

## ⚠️ Error Actual

```
Error: Failed to fetch sha256 checksum at https://binaries.prisma.sh/...
- 500 Internal Server Error
```

## ✅ Fix Aplicado

El Dockerfile ya tiene el fix aplicado:
- `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` (líneas 20 y 52)
- Retry logic si falla la primera vez

**Commit**: `e8f63ae` - Ya pusheado a GitHub

## 🚨 Problema: Railway está usando cache viejo

Railway puede estar usando una versión cacheada del Dockerfile. Necesitamos forzar un rebuild limpio.

## 🔄 Solución: Limpiar Cache y Redeploy

### Paso 1: Limpiar Build Cache

1. **Railway Dashboard** → `@constanza/notifier`
2. **Settings → Build**
3. **Click en "Clear build cache"** (botón importante)
4. Espera a que termine

### Paso 2: Verificar que está usando el commit correcto

1. **Railway Dashboard** → `@constanza/notifier` → **Settings → Deploy**
2. Verifica que el **Commit** sea `e8f63ae` o más reciente
3. Si es más viejo, haz "Redeploy" seleccionando el commit `e8f63ae`

### Paso 3: Redeploy Forzado

1. **Railway Dashboard** → `@constanza/notifier` → **Deployments**
2. **Click en "Redeploy"** o **"Deploy latest commit"**
3. **Selecciona el commit `e8f63ae`** explícitamente
4. Espera 2-3 minutos

### Paso 4: Verificar Logs

En los logs del build deberías ver:
```
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
RUN npx -y prisma@5.22.0 generate...
✅ Prisma generate completado
```

**NO deberías ver** el error de checksum.

## 🔍 Si Sigue Fallando

### Opción A: Verificar que Railway vea el commit correcto

1. Railway → `@constanza/notifier` → **Settings → Source**
2. Verifica que esté conectado a `ralborta/constanza`
3. Verifica que el branch sea `main`
4. Verifica que "Auto Deploy" esté activado

### Opción B: Agregar Variable de Entorno en Railway

Como backup, puedes agregar la variable directamente en Railway:

1. Railway → `@constanza/notifier` → **Variables**
2. Agrega:
   ```
   PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
   ```
3. Guarda y redeploy

### Opción C: Desconectar y Reconectar Repo

Si nada funciona:

1. Railway → `@constanza/notifier` → **Settings → Source**
2. **"Disconnect"** el repo
3. **"Connect GitHub repo"** → selecciona `ralborta/constanza`
4. Selecciona branch `main`
5. Guarda y espera el deploy automático

## ✅ Verificación Final

Cuando el build termine exitosamente, deberías ver:

```
✅ Build completado
🚀 Notifier running on http://0.0.0.0:3001
✅ Redis connected
✅ Database connected
```

---

## 📋 Resumen

1. ✅ Fix aplicado en código (`PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1`)
2. ✅ Commit pusheado (`e8f63ae`)
3. ❌ Railway está usando cache viejo
4. ✅ **Solución**: Limpiar cache + Redeploy con commit `e8f63ae`

**ACCIÓN INMEDIATA**: 
1. Railway → `@constanza/notifier` → Settings → Build → **"Clear build cache"**
2. Railway → `@constanza/notifier` → Deployments → **"Redeploy"** → Seleccionar commit `e8f63ae`




