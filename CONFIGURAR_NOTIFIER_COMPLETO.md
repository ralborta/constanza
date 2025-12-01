# 🔧 Configuración Completa del Notifier - Paso a Paso

## ⚠️ Error Actual

```
503 - El servicio de notificaciones no está disponible
```

Esto significa que el `api-gateway` no puede conectarse al servicio `notifier`.

## ✅ Checklist de Configuración

### 1. Verificar que `notifier` Esté Corriendo

**Railway Dashboard** → `@constanza/notifier` → **Logs**

Deberías ver:
```
🚀 Notifier running on http://0.0.0.0:3001
✅ Redis connected
✅ Database connected
```

**Si NO está corriendo:**
- Ve a **Deployments** → **"Redeploy"**
- Espera 2-3 minutos

---

### 2. Configurar `NOTIFIER_URL` en `api-gateway` (CRÍTICO)

**Railway Dashboard** → `@constanza/notifier` → **Settings → Networking**

1. Copia el **Public Domain** (ej: `notifier-production.up.railway.app`)

2. **Railway Dashboard** → `@constanza/api-gateway` → **Variables**

3. Busca `NOTIFIER_URL`

4. **Si NO existe**, agrega:
   ```
   NOTIFIER_URL=https://notifier-production.up.railway.app
   ```
   (Usa el dominio que copiaste en el paso 1)

5. **Si existe pero tiene otro valor**, actualízala con el dominio correcto

6. **Guarda**

7. **Redeploy** `api-gateway`:
   - Ve a **Deployments** → **"Redeploy"**

---

### 3. Configurar Variables SMTP en `notifier` (Para Envío de Emails)

**Railway Dashboard** → `@constanza/notifier` → **Variables**

Agrega estas variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password_de_gmail
SMTP_FROM_NAME=Constanza
SMTP_FROM_EMAIL=tu_email@gmail.com
```

**Para Gmail:**
1. Habilita autenticación de 2 factores: https://myaccount.google.com/security
2. Genera App Password: https://myaccount.google.com/apppasswords
3. Usa la App Password como `SMTP_PASS` (16 caracteres sin espacios)

---

### 4. Verificar Variables de Base de Datos

**Railway Dashboard** → `@constanza/notifier` → **Variables**

Debe existir:
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

**Si faltan:**
- `DATABASE_URL`: Cópiala desde Railway → Postgres → Variables
- `REDIS_URL`: Cópiala desde Railway → Redis → Variables

---

## 🔍 Verificación Post-Configuración

### Paso 1: Verificar que `notifier` Esté Corriendo

**Railway** → `@constanza/notifier` → **Logs**

Deberías ver:
```
🚀 Notifier running on http://0.0.0.0:3001
✅ Redis connected
✅ Database connected
```

### Paso 2: Verificar Health Check del Notifier

Desde tu máquina o desde Railway logs:

```bash
curl https://notifier-production.up.railway.app/health
```

Debería responder:
```json
{
  "status": "ok",
  "service": "notifier",
  "queue": { ... }
}
```

### Paso 3: Verificar que `NOTIFIER_URL` Esté Configurada

**Railway** → `@constanza/api-gateway` → **Variables**

Debe existir `NOTIFIER_URL` con el dominio correcto del `notifier`.

### Paso 4: Probar Envío de Email

1. Ve al frontend → `/notify`
2. Selecciona un cliente
3. Escribe un mensaje
4. Selecciona canal "Email"
5. Click en "Enviar"

**Si funciona:**
- ✅ Deberías ver "Mensajes en cola"
- ✅ Los logs del `notifier` mostrarán el procesamiento

**Si sigue fallando:**
- Revisa los logs de `api-gateway` para ver el error específico
- Revisa los logs de `notifier` para ver si hay errores de SMTP

---

## 📋 Resumen de Variables Necesarias

### `@constanza/api-gateway`
```env
DATABASE_URL=postgresql://...
JWT_SECRET=tu_secret
NOTIFIER_URL=https://notifier-production.up.railway.app  ← IMPORTANTE
```

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

---

## 🎯 Acción Inmediata

**Lo más importante ahora:**

1. ✅ **Configurar `NOTIFIER_URL`** en `api-gateway`
2. ✅ **Verificar que `notifier` esté corriendo**
3. ✅ **Configurar variables SMTP** en `notifier`
4. ✅ **Redeploy ambos servicios**

Después de esto, el envío de emails debería funcionar.

