# 🚀 Deploy en Vercel - Guía Rápida

## ✅ Configuración Necesaria en Vercel

### 1. Settings → General

**Root Directory:**
```
apps/web
```

### 2. Settings → Build & Development Settings

**Install Command (Override: ON):**
```
cd ../.. && pnpm install --frozen-lockfile
```

**Build Command (Override: ON):**
```
pnpm run vercel-build
```

**Output Directory:**
```
.next
```

**"Include files outside root directory in the Build Step":**
```
✅ Enabled (ON)
```

### 3. Settings → Environment Variables

**Agregar:**
```
NEXT_PUBLIC_API_URL=https://constanzaapi-gateway-production.up.railway.app
```

**Configurar para:**
- ✅ Production
- ✅ Preview
- ✅ Development

---

## 🚀 Cómo Hacer Deploy

### Opción 1: Deploy Automático (Recomendado)

1. **Hacer commit y push:**
   ```bash
   git add .
   git commit -m "fix: actualizar configuración"
   git push origin main
   ```

2. **Vercel detectará automáticamente** el push y hará deploy
   - Ve a: https://vercel.com/dashboard
   - Click en tu proyecto
   - Verás el nuevo deployment iniciándose

### Opción 2: Deploy Manual

1. **Vercel Dashboard** → Tu proyecto → **Deployments**
2. Click en **"..."** → **"Redeploy"**
3. Seleccionar el commit que quieres deployar

---

## ✅ Verificar que Funciona

1. **Esperar 2-5 minutos** a que termine el build
2. **Ver Build Logs:**
   - Vercel → Deployments → Click en el deployment → **Build Logs**
   - Deberías ver: `✓ Compiled successfully`
3. **Probar la URL:**
   - Vercel te dará una URL tipo: `constanza-xxx.vercel.app`
   - Abre esa URL en el navegador
   - Deberías ver la pantalla de login

---

## 🚨 Si Hay Problemas

### Error: "Cannot find module"

**Solución:**
- Verificar que **Root Directory** = `apps/web`
- Verificar que **Install Command** = `cd ../.. && pnpm install --frozen-lockfile`
- Verificar que **"Include files outside root directory"** = Enabled

### Error: "NEXT_PUBLIC_API_URL is undefined"

**Solución:**
- Vercel → Settings → Environment Variables
- Agregar `NEXT_PUBLIC_API_URL` = `https://constanzaapi-gateway-production.up.railway.app`
- Configurar para Production, Preview y Development
- Hacer **Redeploy**

### Error: "Build failed"

**Solución:**
1. Ver Build Logs completos en Vercel
2. Probar build localmente:
   ```bash
   cd apps/web
   pnpm run vercel-build
   ```
3. Si funciona localmente pero falla en Vercel:
   - Verificar versión de Node.js en Vercel (Settings → General → Node.js Version)
   - Usar: `20.x` o `18.x`

---

## 📋 Checklist Rápido

- [ ] Root Directory = `apps/web`
- [ ] Install Command = `cd ../.. && pnpm install --frozen-lockfile`
- [ ] Build Command = `pnpm run vercel-build`
- [ ] "Include files outside root directory" = Enabled
- [ ] `NEXT_PUBLIC_API_URL` configurada
- [ ] Variable configurada para Production, Preview y Development
- [ ] Último commit pusheado a GitHub
- [ ] Deploy completado exitosamente

---

## 🔗 Links Útiles

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Railway Dashboard:** https://railway.app
- **API Gateway Health:** https://constanzaapi-gateway-production.up.railway.app/health

