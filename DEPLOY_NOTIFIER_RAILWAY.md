# 🚀 Deploy del Notifier en Railway - Guía Completa

## ✅ Checklist de Deploy

### 1. Verificar Configuración en Railway

Ve a **Railway Dashboard** → Tu proyecto → Servicio `@constanza/notifier`

#### Settings → Build
```
Builder: Dockerfile
Dockerfile Path: apps/notifier/Dockerfile
Root Directory: / (root del repo)
Custom Build Command: (DEJAR VACÍO)
Build Args: (DEJAR VACÍO)
```

#### Settings → Deploy
```
Start Command: (DEJAR VACÍO - el Dockerfile tiene el CMD)
```

---

## 🔧 Variables de Entorno Requeridas

Ve a **Settings → Variables** y configura estas variables:

### Variables Obligatorias

```env
# Base de datos (ya debería estar configurada)
DATABASE_URL=postgresql://postgres:password@host:port/railway

# Redis (ya debería estar configurada)
REDIS_URL=redis://default:password@host:port

# Configuración SMTP para envío de emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password_de_gmail

# Remitente (opcional, pero recomendado)
SMTP_FROM_NAME=Constanza
SMTP_FROM_EMAIL=noreply@constanza.com
```

### Variables Opcionales (si usas otros canales)

```env
# WhatsApp (si usas BuilderBot)
BUILDERBOT_API_KEY=tu_api_key

# Voice/TTS (si usas ElevenLabs)
ELEVENLABS_AGENT_ID=tu_agent_id
TTS_URL=https://api.elevenlabs.io/v1/text-to-speech
```

### Variables de Entorno del Sistema

```env
NODE_ENV=production
PORT=3001  # Railway lo inyecta automáticamente, pero puedes especificarlo
```

---

## 📧 Configuración SMTP para Gmail

### Paso 1: Habilitar Autenticación de 2 Factores

1. Ve a: https://myaccount.google.com/security
2. Activa "Verificación en 2 pasos"

### Paso 2: Generar App Password

1. Ve a: https://myaccount.google.com/apppasswords
2. Selecciona "Correo" y "Otro (nombre personalizado)"
3. Escribe "Constanza Notifier"
4. Copia la contraseña de 16 caracteres (ej: `abcd efgh ijkl mnop`)

### Paso 3: Configurar en Railway

En Railway → `@constanza/notifier` → Variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=abcdefghijklmnop  # Sin espacios, los 16 caracteres juntos
SMTP_FROM_NAME=Constanza
SMTP_FROM_EMAIL=tu_email@gmail.com  # O usa otro email si tienes dominio
```

**⚠️ IMPORTANTE**: 
- Usa la **App Password**, NO tu contraseña normal de Gmail
- Quita los espacios de la App Password (ej: `abcd efgh ijkl mnop` → `abcdefghijklmnop`)

---

## 🔗 Configurar NOTIFIER_URL en API Gateway

El `api-gateway` necesita saber dónde está el `notifier`:

1. Ve a **Railway Dashboard** → `@constanza/notifier`
2. Ve a la pestaña **Settings** → **Networking**
3. Copia la **Public Domain** (ej: `notifier-production.up.railway.app`)
4. Ve a `@constanza/api-gateway` → **Variables**
5. Agrega o actualiza:

```env
NOTIFIER_URL=https://notifier-production.up.railway.app
```

**O si prefieres usar el servicio interno de Railway:**

```env
NOTIFIER_URL=http://notifier:3001
```

---

## 🚀 Deploy

### Opción 1: Deploy Automático (Recomendado)

1. **Push a GitHub** (ya deberías haber hecho `git push`)
2. Railway detecta el cambio automáticamente
3. Ve a **Railway Dashboard** → `@constanza/notifier` → **Deployments**
4. Espera a que termine el build (2-3 minutos)

### Opción 2: Deploy Manual

1. Ve a **Railway Dashboard** → `@constanza/notifier`
2. Click en **"Redeploy"** o **"Deploy latest commit"**
3. Espera a que termine el build

---

## ✅ Verificación Post-Deploy

### 1. Verificar Logs

Ve a **Railway Dashboard** → `@constanza/notifier` → **Logs**

Deberías ver:
```
🚀 Notifier running on http://0.0.0.0:3001
✅ Redis connected
✅ Database connected
```

**Si ves errores:**
- `ERROR_SMTP_CONFIG_MISSING` → Faltan variables SMTP
- `ERROR_SMTP_AUTH_FAILED` → App Password incorrecta
- `ECONNREFUSED 127.0.0.1:6379` → `REDIS_URL` no configurada
- `Can't reach database server` → `DATABASE_URL` incorrecta

### 2. Health Check

El notifier debería responder en:
```
GET https://notifier-production.up.railway.app/health
```

O desde el código del api-gateway:
```bash
curl https://notifier-production.up.railway.app/health
```

### 3. Probar Envío de Email

1. Ve al frontend (`/notify`)
2. Selecciona clientes
3. Escribe un mensaje
4. Selecciona canal "Email"
5. Click en "Enviar"
6. Verifica logs en Railway para confirmar envío

---

## 🐛 Troubleshooting

### Error: "ERROR_SMTP_CONFIG_MISSING"

**Causa**: Faltan variables SMTP

**Solución**:
1. Ve a Railway → `@constanza/notifier` → Variables
2. Verifica que existan: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
3. Redeploy

### Error: "ERROR_SMTP_AUTH_FAILED"

**Causa**: App Password incorrecta o no generada

**Solución**:
1. Genera una nueva App Password en Gmail
2. Actualiza `SMTP_PASS` en Railway
3. **Quita los espacios** de la App Password
4. Redeploy

### Error: "ECONNREFUSED 127.0.0.1:6379"

**Causa**: `REDIS_URL` no configurada

**Solución**:
1. Crea Redis en Railway (si no existe)
2. Railway automáticamente agrega `REDIS_URL`
3. Si no aparece, cópiala manualmente desde Redis → Variables
4. Redeploy

### Error: "Can't reach database server"

**Causa**: `DATABASE_URL` incorrecta o vacía

**Solución**:
1. Ve a Railway → Postgres → Variables
2. Copia `DATABASE_URL`
3. Ve a `@constanza/notifier` → Variables
4. Actualiza `DATABASE_URL`
5. Redeploy

### Emails no se envían

**Verificaciones**:
1. ✅ Variables SMTP configuradas correctamente
2. ✅ App Password válida (no contraseña normal)
3. ✅ `REDIS_URL` configurada
4. ✅ `DATABASE_URL` configurada
5. ✅ `NOTIFIER_URL` configurada en `api-gateway`
6. ✅ Clientes tienen email válido en la DB
7. ✅ Logs no muestran errores

**Debug**:
- Revisa logs del `notifier` en Railway
- Revisa logs del `api-gateway` en Railway
- Verifica que el mensaje llegue a la cola de BullMQ
- Revisa `contact.events` en la DB para ver el estado

---

## 📋 Resumen de Variables por Servicio

### `@constanza/notifier`
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password
SMTP_FROM_NAME=Constanza
SMTP_FROM_EMAIL=tu_email@gmail.com
```

### `@constanza/api-gateway`
```env
DATABASE_URL=postgresql://...
JWT_SECRET=tu_secret
NOTIFIER_URL=https://notifier-production.up.railway.app
# O: NOTIFIER_URL=http://notifier:3001
```

---

## ✅ Checklist Final

Antes de considerar el deploy completo:

- [ ] Variables SMTP configuradas en `notifier`
- [ ] `NOTIFIER_URL` configurada en `api-gateway`
- [ ] `REDIS_URL` configurada en `notifier`
- [ ] `DATABASE_URL` configurada en ambos servicios
- [ ] Build exitoso en Railway
- [ ] Logs sin errores
- [ ] Health check responde OK
- [ ] Prueba de envío de email funciona

---

**Última actualización**: Después de implementar templates y variables dinámicas ✅




