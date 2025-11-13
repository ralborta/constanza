# ✅ Configuración FINAL de Vercel - Monorepo pnpm

## 🎯 Configuración Exacta en Vercel UI

### Settings → General

**Root Directory:**
```
apps/web
```

### Settings → Build & Development Settings

**Install Command (Override: ON):**
```
cd ../.. && pnpm install --frozen-lockfile
```

**Build Command (Override: ON):**
```
pnpm build
```

**Output Directory:**
```
.next
```
(O dejar default - Vercel lo detecta automáticamente)

**Development Command:**
```
next dev
```
(O dejar default)

### Settings → Environment Variables

**NEXT_PUBLIC_API_URL:**
```
https://api-gateway-production.up.railway.app
```
(Actualizar con la URL real de Railway cuando esté lista)

### "Include files outside root directory in the Build Step"

**Enabled: ON** ✅

---

## 🔍 Por qué esta configuración funciona

1. **Root Directory = `apps/web`:**
   - Vercel trabaja desde `apps/web`
   - El Build Command `pnpm build` se ejecuta desde ahí
   - Next.js encuentra `package.json` y `tsconfig.json` correctamente

2. **Install Command va al root:**
   - `cd ../..` va al root del monorepo
   - `pnpm install --frozen-lockfile` instala todas las deps del workspace
   - Esto asegura que `@types/node` y todas las devDeps estén disponibles

3. **Build Command simple:**
   - `pnpm build` se ejecuta desde `apps/web` (Root Directory)
   - Ejecuta el script `"build": "next build"` de `apps/web/package.json`
   - Next.js encuentra todas las dependencias instaladas

---

## ✅ Checklist Final

- [ ] Root Directory = `apps/web`
- [ ] Install Command = `cd ../.. && pnpm install --frozen-lockfile`
- [ ] Build Command = `pnpm build` (simple, sin `cd` ni `--filter`)
- [ ] Output Directory = `.next` (o default)
- [ ] "Include files outside root directory" = Enabled ON
- [ ] NEXT_PUBLIC_API_URL configurada
- [ ] Último commit en Vercel = `9fa9553` o más reciente

---

## 🚨 Si sigue fallando

1. **Verificar que Vercel esté usando el último commit:**
   - En Deployment Details, verificar el commit hash
   - Debe ser `9fa9553` o más reciente
   - Si es más viejo, hacer "Redeploy" o "Deploy latest commit"

2. **Verificar que `pnpm-lock.yaml` esté commiteado:**
   - Debe estar en el root del repo
   - Debe incluir todas las deps de `apps/web`

3. **Ver logs completos:**
   - Expandir "Build Logs" en Vercel
   - Buscar el primer error (no solo el último)
   - Verificar si `pnpm install` se ejecuta correctamente

---

## 📝 Notas

- **NO uses** `pnpm --filter @constanza/web build` en el Build Command
- **NO uses** `cd apps/web` en el Build Command (ya estás en `apps/web` por Root Directory)
- El Build Command debe ser simple: `pnpm build`

