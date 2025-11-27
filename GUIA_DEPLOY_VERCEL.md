# 🚀 Guía Completa de Deploy en Vercel

## ✅ Configuración Actual del Proyecto

- **Monorepo:** pnpm workspace
- **Frontend:** `apps/web` (Next.js 14)
- **API Gateway:** Railway (`https://constanzaapi-gateway-production.up.railway.app`)

---

## 📋 Paso 1: Verificar Configuración en Vercel

### 1.1. Settings → General

**Root Directory:**
```
apps/web
```

**Framework Preset:**
```
Next.js
```

### 1.2. Settings → Build & Development Settings

**Install Command (Override: ON):**
```
cd ../.. && pnpm install --frozen-lockfile
```

**Build Command (Override: ON):**
```
pnpm run vercel-build
```

**O alternativamente:**
```
cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @constanza/web build
```

**Output Directory:**
```
.next
```

**Development Command:**
```
next dev
```

**"Include files outside root directory in the Build Step":**
```
✅ Enabled (ON)
```

### 1.3. Settings → Environment Variables

**Variable Requerida:**

```
NEXT_PUBLIC_API_URL=https://constanzaapi-gateway-production.up.railway.app
```

**Configurar para:**
- ✅ Production
- ✅ Preview  
- ✅ Development

---

## 🔧 Paso 2: Verificar que el Script Existe

El script `vercel-build` ya está en `apps/web/package.json`:

```json
{
  "scripts": {
    "vercel-build": "cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @constanza/web build"
  }
}
```

---

## 🚀 Paso 3: Hacer Deploy

### Opción A: Deploy Automático (Recomendado)

1. **Hacer commit y push:**
   ```bash
   git add .
   git commit -m "fix: actualizar configuración"
   git push origin main
   ```

2. **Vercel detectará automáticamente** el push y hará deploy

### Opción B: Deploy Manual

1. **Vercel Dashboard** → Tu proyecto → **Deployments**
2. Click en **"..."** → **"Redeploy"**
3. Seleccionar el commit que quieres deployar

---

## ✅ Paso 4: Verificar el Deploy

### 4.1. Verificar Build Logs

En Vercel → Deployments → Click en el último deployment → **Build Logs**

Deberías ver:
```
✓ Installing dependencies
✓ Building application
✓ Compiled successfully
```

### 4.2. Verificar que la Variable de Entorno Está Configurada

En el código del frontend, puedes verificar en runtime:

```javascript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
```

Debería mostrar: `https://constanzaapi-gateway-production.up.railway.app`

### 4.3. Probar el Login

1. Ir a la URL de Vercel (ej: `constanza-xxx.vercel.app`)
2. Intentar login con:
   - Email: `admin@constanza.com`
   - Password: `admin123`
3. Verificar que funciona

---

## 🚨 Troubleshooting

### Error: "Cannot find module"

**Causa:** Root Directory incorrecto o Install Command mal configurado.

**Solución:**
1. Verificar que **Root Directory** = `apps/web`
2. Verificar que **Install Command** = `cd ../.. && pnpm install --frozen-lockfile`
3. Verificar que **"Include files outside root directory"** = Enabled

### Error: "NEXT_PUBLIC_API_URL is undefined"

**Causa:** Variable de entorno no configurada o no está en el ambiente correcto.

**Solución:**
1. Vercel → Settings → Environment Variables
2. Verificar que `NEXT_PUBLIC_API_URL` existe
3. Verificar que está configurada para **Production**, **Preview** y **Development**
4. Hacer **Redeploy** después de agregar/modificar variables

### Error: "Build failed"

**Causa:** Error en el código o dependencias.

**Solución:**
1. Verificar los **Build Logs** completos en Vercel
2. Probar build localmente:
   ```bash
   cd apps/web
   pnpm run vercel-build
   ```
3. Si funciona localmente pero falla en Vercel, puede ser problema de versión de Node.js
   - Vercel → Settings → General → Node.js Version
   - Usar: `20.x` o `18.x`

### Error: "CORS error" o "Network error"

**Causa:** `NEXT_PUBLIC_API_URL` incorrecta o API Gateway no está corriendo.

**Solución:**
1. Verificar que `NEXT_PUBLIC_API_URL` apunta a la URL correcta de Railway
2. Verificar que el API Gateway está corriendo:
   ```bash
   curl https://constanzaapi-gateway-production.up.railway.app/health
   ```
3. Debería devolver: `{"status":"ok",...}`

---

## 📊 Checklist Final

- [ ] Root Directory = `apps/web`
- [ ] Install Command = `cd ../.. && pnpm install --frozen-lockfile`
- [ ] Build Command = `pnpm run vercel-build`
- [ ] Output Directory = `.next`
- [ ] "Include files outside root directory" = Enabled
- [ ] `NEXT_PUBLIC_API_URL` configurada = `https://constanzaapi-gateway-production.up.railway.app`
- [ ] Variable configurada para Production, Preview y Development
- [ ] Último commit pusheado a GitHub
- [ ] Deploy completado exitosamente
- [ ] Login funciona en la URL de Vercel

---

## 🔗 URLs Importantes

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Railway Dashboard:** https://railway.app
- **API Gateway Health:** https://constanzaapi-gateway-production.up.railway.app/health
- **GitHub Repo:** https://github.com/ralborta/constanza

---

## 💡 Tips

1. **Siempre verifica los Build Logs** si algo falla
2. **Las variables de entorno** necesitan redeploy para aplicarse
3. **El build puede tardar 2-5 minutos** la primera vez
4. **Usa Preview Deployments** para probar cambios antes de production





