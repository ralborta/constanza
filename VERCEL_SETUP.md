# 🚀 Configuración de Vercel - Paso a Paso

## 📋 Prerequisitos

- ✅ Repositorio en GitHub: `ralborta/constanza`
- ✅ Cuenta de Vercel (gratis): https://vercel.com

---

## 🔧 Paso 1: Crear Proyecto en Vercel

1. **Ir a Vercel Dashboard:**
   - https://vercel.com/new
   - O desde el dashboard → "Add New..." → "Project"

2. **Conectar Repositorio:**
   - Click en "Import Git Repository"
   - Seleccionar `ralborta/constanza`
   - Si no aparece, click en "Adjust GitHub App Permissions" y dar permisos

3. **Configurar Proyecto:**
   - **Framework Preset:** Next.js (debería detectarse automáticamente)
   - **Root Directory:** `apps/web` ⚠️ **IMPORTANTE**
   - **Build Command:** (dejar vacío, Vercel usa `vercel.json`)
   - **Output Directory:** (dejar vacío, Vercel usa `vercel.json`)
   - **Install Command:** (dejar vacío, Vercel usa `vercel.json`)

---

## ⚙️ Paso 2: Configurar Variables de Entorno

En la sección "Environment Variables", agregar:

### Variable Requerida:

```
NEXT_PUBLIC_API_URL=https://api-gateway-production.up.railway.app
```

⚠️ **Nota:** Esta URL la obtendrás después de deployar `api-gateway` en Railway. Por ahora puedes usar un placeholder o dejarla vacía y actualizarla después.

### Variables Opcionales (si las necesitas):

```
NEXT_PUBLIC_TENANT=tu-tenant-id
```

---

## 🎯 Paso 3: Deploy

1. Click en **"Deploy"**
2. Vercel comenzará a:
   - Instalar dependencias (`pnpm install` desde el root)
   - Buildear el proyecto (`pnpm --filter @constanza/web build`)
   - Deployar

---

## ✅ Paso 4: Verificar Deploy

1. **Esperar a que termine el build** (2-5 minutos)
2. **Verificar logs:**
   - Deberías ver: `✓ Compiled successfully`
   - No debería haber errores de TypeScript o build

3. **Obtener URL:**
   - Vercel asignará una URL automática: `constanza-web-xxx.vercel.app`
   - O puedes configurar un dominio personalizado en Settings → Domains

---

## 🔄 Paso 5: Actualizar API URL (Después de Railway)

Una vez que tengas la URL del `api-gateway` en Railway:

1. **Vercel Dashboard** → Tu proyecto → **Settings** → **Environment Variables**
2. **Editar** `NEXT_PUBLIC_API_URL`:
   ```
   NEXT_PUBLIC_API_URL=https://api-gateway-production.up.railway.app
   ```
   (Reemplazar con la URL real de Railway)

3. **Redeploy:**
   - Settings → Deployments → Click en "..." → "Redeploy"
   - O hacer un nuevo commit para trigger automático

---

## 📝 Configuración Actual (vercel.json)

El proyecto ya tiene `apps/web/vercel.json` configurado:

```json
{
  "buildCommand": "cd ../.. && pnpm install && pnpm --filter @constanza/web build",
  "outputDirectory": ".next",
  "installCommand": "cd ../.. && pnpm install",
  "framework": "nextjs",
  "rootDirectory": "apps/web"
}
```

Esto le dice a Vercel:
- ✅ Instalar desde el root del monorepo
- ✅ Buildear solo el servicio `@constanza/web`
- ✅ Usar `apps/web` como root directory

---

## 🚨 Problemas Comunes

### Error: "Cannot find module '@constanza/web'"

**Causa:** Vercel no está usando el `vercel.json` o el Root Directory está mal.

**Solución:**
1. Verificar que **Root Directory** = `apps/web`
2. Verificar que `vercel.json` existe en `apps/web/`
3. Si persiste, en Settings → General → Build & Development Settings:
   - **Build Command:** `cd ../.. && pnpm install && pnpm --filter @constanza/web build`
   - **Install Command:** `cd ../.. && pnpm install`

### Error: "pnpm-lock.yaml not found"

**Causa:** Root Directory apunta a `apps/web` pero el lockfile está en el root.

**Solución:** El `vercel.json` ya maneja esto con `cd ../..`. Si persiste, verificar que el Root Directory sea `apps/web` (no `/`).

### Error: "NEXT_PUBLIC_API_URL is undefined"

**Causa:** Variable de entorno no configurada.

**Solución:** Agregar `NEXT_PUBLIC_API_URL` en Settings → Environment Variables.

---

## 📊 Checklist Final

- [ ] Proyecto creado en Vercel
- [ ] Repositorio conectado (`ralborta/constanza`)
- [ ] Root Directory = `apps/web`
- [ ] Variable `NEXT_PUBLIC_API_URL` configurada (placeholder OK por ahora)
- [ ] Deploy exitoso
- [ ] URL obtenida y funcionando
- [ ] (Después) Actualizar `NEXT_PUBLIC_API_URL` con URL real de Railway

---

## 🎉 Listo!

Una vez deployado, tendrás:
- ✅ Frontend en Vercel: `https://tu-proyecto.vercel.app`
- ✅ API Gateway en Railway: `https://api-gateway.railway.app` (después de configurarlo)

El frontend estará listo para conectarse al backend cuando lo configures en Railway.

