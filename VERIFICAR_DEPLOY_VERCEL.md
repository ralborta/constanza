# 🔍 Verificar Deploy en Vercel - Paso a Paso

## ⚠️ Problema Actual

El deploy puede estar fallando o la configuración no estar aplicada correctamente.

---

## 📋 Paso 1: Verificar Build Logs en Vercel

1. **Vercel Dashboard:** https://vercel.com/dashboard
2. Click en tu proyecto
3. Ve a **Deployments**
4. Click en el **último deployment**
5. Click en **Build Logs**

### Qué Buscar:

**✅ Build Exitoso:**
```
✓ Installing dependencies
✓ Building application
✓ Compiled successfully
```

**❌ Build Fallido:**
- Busca el primer error (no solo el último)
- Copia el mensaje de error completo

---

## 📋 Paso 2: Verificar Configuración en Vercel

### 2.1. Settings → General

**Root Directory:**
```
apps/web
```

**Framework Preset:**
```
Next.js
```

### 2.2. Settings → Build & Development Settings

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

### 2.3. Settings → Environment Variables

**Verificar que existe:**
```
NEXT_PUBLIC_API_URL=https://constanzaapi-gateway-production.up.railway.app
```

**Verificar que está configurada para:**
- ✅ Production
- ✅ Preview
- ✅ Development

---

## 📋 Paso 3: Verificar en el Navegador

### 3.1. Abrir la App en Vercel

1. Ve a la URL de Vercel (ej: `constanza-xxx.vercel.app`)
2. Abre **DevTools** (F12)
3. Ve a la pestaña **Console**

### 3.2. Buscar los Logs de Debug

Deberías ver estos mensajes al cargar la página:

```
🔍 API_URL configurada: https://constanzaapi-gateway-production.up.railway.app
🔍 NEXT_PUBLIC_API_URL: https://constanzaapi-gateway-production.up.railway.app
🔍 NODE_ENV: production
```

**Si ves:**
```
🔍 API_URL configurada: 
🔍 NEXT_PUBLIC_API_URL: undefined
```

**Problema:** `NEXT_PUBLIC_API_URL` no está configurada en Vercel.

**Solución:**
1. Vercel → Settings → Environment Variables
2. Agregar `NEXT_PUBLIC_API_URL` = `https://constanzaapi-gateway-production.up.railway.app`
3. Configurar para Production, Preview y Development
4. Hacer **Redeploy**

### 3.3. Intentar Login

1. Email: `admin@constanza.com`
2. Password: `admin123`
3. Click en "Iniciar sesión"

**En la consola deberías ver:**
```
🔍 Login attempt: { email: 'admin@constanza.com', apiUrl: '...' }
✅ Usando usuario fake
```

**O si intenta con el backend:**
```
🔍 Login attempt: { email: 'admin@constanza.com', apiUrl: '...' }
🌐 Intentando login con backend: https://constanzaapi-gateway-production.up.railway.app/auth/login
```

**Si ves un error:**
```
❌ Error en login: { message: '...', status: 404, url: '...' }
```

**Comparte ese error completo** para identificar el problema.

---

## 📋 Paso 4: Verificar Network Tab

1. DevTools → **Network**
2. Filtrar por **Fetch/XHR**
3. Intentar login
4. Buscar la request de login

**Comparte:**
- **Status Code** (200, 404, 502, CORS error, etc.)
- **Request URL** completa
- **Response** (si hay)

---

## 🚨 Problemas Comunes

### Problema 1: "NEXT_PUBLIC_API_URL is undefined"

**Causa:** Variable no configurada en Vercel.

**Solución:**
1. Vercel → Settings → Environment Variables
2. Agregar `NEXT_PUBLIC_API_URL`
3. Configurar para todos los ambientes
4. **Redeploy**

### Problema 2: Build Falla

**Causa:** Error en el código o configuración.

**Solución:**
1. Ver Build Logs completos
2. Probar build localmente:
   ```bash
   cd apps/web
   pnpm run vercel-build
   ```
3. Si funciona localmente, puede ser problema de Node.js version en Vercel

### Problema 3: Deploy No Se Actualiza

**Causa:** Vercel no detecta los cambios.

**Solución:**
1. Verificar que el commit está en GitHub
2. Vercel → Deployments → Click "..." → "Redeploy"
3. Seleccionar el commit más reciente

---

## ✅ Checklist de Verificación

- [ ] Build Logs muestran "✓ Compiled successfully"
- [ ] Root Directory = `apps/web`
- [ ] Build Command = `pnpm run vercel-build`
- [ ] "Include files outside root directory" = Enabled
- [ ] `NEXT_PUBLIC_API_URL` configurada en Vercel
- [ ] Variable configurada para Production, Preview y Development
- [ ] Logs en consola muestran la URL correcta
- [ ] Login funciona (usuario fake o backend)

---

## 📊 Qué Compartir para Debug

Si sigue fallando, comparte:

1. **Build Logs** completos de Vercel (especialmente errores)
2. **Logs de la consola** del navegador (los mensajes con 🔍)
3. **Status Code** de la request de login en Network
4. **Request URL** completa
5. **Screenshot** de Settings → Environment Variables en Vercel

Con esa información podré identificar exactamente qué está fallando.





