# 🔧 Configuración de Variables de Entorno - Railway y Vercel

## 📋 Resumen

Esta guía te muestra **paso a paso** cómo configurar todas las variables de entorno necesarias en **Railway** y **Vercel** para que tu aplicación Constanza funcione correctamente.

---

## 🚂 RAILWAY - Configuración de Variables

### 1️⃣ Servicio: `@constanza/api-gateway`

Ve a **Railway Dashboard** → Tu proyecto → `api-gateway` → **Variables**

#### Variables Requeridas:

```env
# Base de datos (Railway la crea automáticamente al agregar Postgres)
DATABASE_URL=postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway

# Autenticación JWT
JWT_SECRET=tu_secreto_jwt_aqui_minimo_32_caracteres

# CORS - URLs permitidas (separadas por comas, SIN espacios)
ALLOWED_ORIGINS=https://tu-app.vercel.app,https://app.constanza.com

# URL del servicio Notifier (obtener después de desplegar notifier)
NOTIFIER_URL=https://constanza-notifier-production.up.railway.app

# Entorno
NODE_ENV=production
```

#### Cómo obtener cada valor:

1. **`DATABASE_URL`**: 
   - Railway la crea automáticamente cuando agregas Postgres
   - Ve a tu servicio Postgres → **Variables** → Copia `DATABASE_URL`
   - O ve a `api-gateway` → **Variables** → Busca en "Variables added by Railway"

2. **`JWT_SECRET`**: 
   - Genera una nueva con:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
     ```
   - Copia el resultado y pégalo como valor

3. **`ALLOWED_ORIGINS`**: 
   - Agrega tu dominio de Vercel (ej: `https://constanza-web.vercel.app`)
   - Si tienes múltiples, sepáralos por comas: `https://app1.vercel.app,https://app2.vercel.app`
   - **NO incluyas espacios** entre las URLs

4. **`NOTIFIER_URL`**: 
   - Primero despliega el servicio `notifier` (ver paso 2)
   - Ve a `notifier` → **Settings** → **Networking** → Copia el **Public Domain**
   - Formato: `https://constanza-notifier-production.up.railway.app`

5. **`NODE_ENV`**: 
   - Simplemente pon: `production`

---

### 2️⃣ Servicio: `@constanza/notifier`

Ve a **Railway Dashboard** → Tu proyecto → `notifier` → **Variables**

#### Variables Requeridas:

```env
# Base de datos (misma que api-gateway)
DATABASE_URL=postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway

# Redis (Railway la crea automáticamente al agregar Redis)
REDIS_URL=redis://default:password@containers-us-west-xxx.railway.app:6379

# Configuración SMTP para envío de emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password_de_16_caracteres
SMTP_FROM_EMAIL=noreply@constanza.com
SMTP_FROM_NAME=Constanza

# Entorno
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
```

#### Cómo obtener cada valor:

1. **`DATABASE_URL`**: 
   - Usa la misma que configuraste en `api-gateway`
   - O cópiala desde el servicio Postgres → **Variables**

2. **`REDIS_URL`**: 
   - Railway la crea automáticamente cuando agregas Redis
   - Ve a tu servicio Redis → **Variables** → Copia `REDIS_URL`
   - O ve a `notifier` → **Variables** → Busca en "Variables added by Railway"

3. **`SMTP_HOST`**: 
   - Para Gmail: `smtp.gmail.com`
   - Para otros proveedores, consulta su documentación

4. **`SMTP_PORT`**: 
   - Para Gmail con STARTTLS: `587`
   - Para Gmail con SSL: `465`

5. **`SMTP_USER`**: 
   - Tu email de Gmail completo: `tu_email@gmail.com`

6. **`SMTP_PASS`**: 
   - **⚠️ IMPORTANTE**: Debe ser una **App Password de Google**, NO tu contraseña normal
   - Cómo generar App Password:
     1. Ve a: https://myaccount.google.com/apppasswords
     2. Selecciona **"Correo"** y **"Otro (nombre personalizado)"**
     3. Escribe: "Constanza Notifier"
     4. Google te dará una contraseña de **16 caracteres** (ej: `abcd efgh ijkl mnop`)
     5. **Cópiala SIN espacios**: `abcdefghijklmnop`
     6. Pégalo como valor de `SMTP_PASS`

7. **`SMTP_FROM_EMAIL`** (Opcional): 
   - Email que aparecerá como remitente
   - Si no lo configuras, usará `SMTP_USER`
   - Ejemplo: `noreply@constanza.com`

8. **`SMTP_FROM_NAME`** (Opcional): 
   - Nombre que aparecerá como remitente
   - Si no lo configuras, usará `Constanza`
   - Ejemplo: `Constanza - Sistema de Cobranzas`

9. **`PORT`** y **`HOST`**: 
   - Railway los configura automáticamente, pero puedes ponerlos explícitamente:
     - `PORT=3001`
     - `HOST=0.0.0.0`

---

### 3️⃣ Servicio: `@constanza/postgres` (Base de Datos)

Railway crea automáticamente `DATABASE_URL`. Solo necesitas:

1. Ve a tu servicio Postgres → **Variables**
2. Copia `DATABASE_URL` 
3. Úsala en `api-gateway` y `notifier`

---

### 4️⃣ Servicio: `@constanza/redis` (Cache y Colas)

Railway crea automáticamente `REDIS_URL`. Solo necesitas:

1. Ve a tu servicio Redis → **Variables**
2. Copia `REDIS_URL`
3. Úsala en `notifier`

---

## ▲ VERCEL - Configuración de Variables

### Servicio: `constanza-web` (Frontend)

Ve a **Vercel Dashboard** → Tu proyecto `constanza-web` → **Settings** → **Environment Variables**

#### Variables Requeridas:

```env
# URL del API Gateway (obtener desde Railway)
NEXT_PUBLIC_API_URL=https://constanzaapi-gateway-production.up.railway.app
```

#### Cómo obtener el valor:

1. Ve a **Railway Dashboard** → Tu proyecto → `api-gateway`
2. Ve a **Settings** → **Networking**
3. Copia el **Public Domain** (ej: `constanzaapi-gateway-production.up.railway.app`)
4. Agrega `https://` al inicio: `https://constanzaapi-gateway-production.up.railway.app`

#### Configurar en Vercel:

1. Ve a **Vercel Dashboard** → Tu proyecto → **Settings** → **Environment Variables**
2. Click en **"Add New"**
3. **Name**: `NEXT_PUBLIC_API_URL`
4. **Value**: `https://constanzaapi-gateway-production.up.railway.app` (tu URL de Railway)
5. **Environment**: Selecciona todas las opciones:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
6. Click en **"Save"**

#### ⚠️ IMPORTANTE: Redeploy después de agregar variables

Después de agregar o modificar variables de entorno en Vercel:

1. Ve a **Deployments**
2. Click en los **tres puntos (⋯)** del último deployment
3. Selecciona **"Redeploy"**
4. O simplemente haz un nuevo commit y push (Vercel redeploy automáticamente)

**⚠️ CRÍTICO**: Las variables de entorno en Vercel solo se aplican en el **build**, no en runtime. Si cambias una variable, **debes redeploy**.

---

## 📋 Checklist Completo

### Railway - api-gateway
- [ ] `DATABASE_URL` configurada (desde Postgres)
- [ ] `JWT_SECRET` configurada (generada nueva)
- [ ] `ALLOWED_ORIGINS` configurada (con tu dominio de Vercel)
- [ ] `NOTIFIER_URL` configurada (después de desplegar notifier)
- [ ] `NODE_ENV=production`

### Railway - notifier
- [ ] `DATABASE_URL` configurada (misma que api-gateway)
- [ ] `REDIS_URL` configurada (desde Redis)
- [ ] `SMTP_HOST=smtp.gmail.com`
- [ ] `SMTP_PORT=587`
- [ ] `SMTP_USER=tu_email@gmail.com`
- [ ] `SMTP_PASS` configurada (App Password de 16 caracteres)
- [ ] `SMTP_FROM_EMAIL` configurada (opcional)
- [ ] `SMTP_FROM_NAME` configurada (opcional)
- [ ] `NODE_ENV=production`

### Vercel - web
- [ ] `NEXT_PUBLIC_API_URL` configurada (URL del api-gateway de Railway)
- [ ] Redeploy hecho después de agregar la variable

---

## 🔍 Verificación Paso a Paso

### 1. Verificar que api-gateway está funcionando:

```bash
# Desde tu terminal o navegador
curl https://constanzaapi-gateway-production.up.railway.app/health

# Debería responder:
# {"status":"ok"}
```

### 2. Verificar que notifier está funcionando:

```bash
# Desde tu terminal o navegador
curl https://constanza-notifier-production.up.railway.app/health

# Debería responder:
# {"status":"ok","service":"notifier","queue":{...}}
```

### 3. Verificar que el frontend puede conectarse:

1. Abre tu app en Vercel (ej: `https://constanza-web.vercel.app`)
2. Abre la consola del navegador (F12 → Console)
3. Deberías ver:
   ```
   🔍 API_URL configurada: https://constanzaapi-gateway-production.up.railway.app
   🔍 NEXT_PUBLIC_API_URL: https://constanzaapi-gateway-production.up.railway.app
   ```

### 4. Verificar envío de emails:

1. Intenta enviar un email desde la aplicación
2. Ve a Railway → `notifier` → **Logs**
3. Deberías ver logs de envío exitoso o errores específicos

---

## 🚨 Problemas Comunes y Soluciones

### Error: "Failed to fetch" en el login

**Causa**: `NEXT_PUBLIC_API_URL` no está configurada en Vercel o está mal configurada.

**Solución**:
1. Verifica que `NEXT_PUBLIC_API_URL` esté en Vercel → **Environment Variables**
2. Verifica que el valor sea correcto (debe empezar con `https://`)
3. **Haz redeploy** después de agregar/modificar la variable

---

### Error: "SMTP_AUTH_FAILED" al enviar emails

**Causa**: `SMTP_PASS` no es una App Password válida.

**Solución**:
1. Ve a https://myaccount.google.com/apppasswords
2. Genera una nueva App Password
3. Cópiala SIN espacios (16 caracteres)
4. Actualiza `SMTP_PASS` en Railway → `notifier` → **Variables**
5. Railway redeploy automáticamente

---

### Error: "SMTP_CONNECTION_FAILED"

**Causa**: Puerto bloqueado o configuración incorrecta.

**Solución**:
1. Verifica que `SMTP_PORT=587` (STARTTLS) o `SMTP_PORT=465` (SSL)
2. Verifica que `SMTP_HOST=smtp.gmail.com` (sin `https://`)
3. Verifica que tu servidor Railway pueda hacer conexiones salientes al puerto 587/465

---

### Error: "NOTIFIER_URL no está configurada"

**Causa**: `NOTIFIER_URL` no está configurada en `api-gateway`.

**Solución**:
1. Obtén la URL pública del servicio `notifier` en Railway
2. Agrega `NOTIFIER_URL=https://constanza-notifier-production.up.railway.app` en `api-gateway` → **Variables**
3. Railway redeploy automáticamente

---

## 📚 Referencias

- [Railway Variables Documentation](https://docs.railway.app/develop/variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [Nodemailer Documentation](https://nodemailer.com/about/)

---

## ✅ Resumen Rápido

1. **Railway - api-gateway**: Configura `DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGINS`, `NOTIFIER_URL`
2. **Railway - notifier**: Configura `DATABASE_URL`, `REDIS_URL`, `SMTP_*` (con App Password de Gmail)
3. **Vercel - web**: Configura `NEXT_PUBLIC_API_URL` y haz redeploy
4. **Verifica**: Prueba login y envío de emails

¡Listo! Tu aplicación debería estar funcionando correctamente. 🚀

