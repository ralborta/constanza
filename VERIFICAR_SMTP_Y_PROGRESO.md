# ✅ Solución: Ver Progreso y Configurar SMTP

## 🎯 Cambios Realizados

### 1. ✅ Endpoint para Listar Batches

**Agregado:** `GET /v1/notify/batches`

Este endpoint lista todos los batches de notificaciones con su progreso.

---

### 2. ✅ Página de Progreso

**Creada:** `/notify/batches`

Página para ver el progreso de todos los mensajes enviados, similar a `/calls/batches`.

**Características:**
- Lista todos los batches de notificaciones
- Muestra progreso en tiempo real (se actualiza cada 5 segundos)
- Muestra estado: Pendiente, Procesando, Completado, Fallido
- Muestra canal: Email, WhatsApp, Voice
- Muestra cantidad de mensajes enviados y fallidos

---

## ⚠️ Problema: Email No Llega

**Causa probable:** Falta configuración SMTP

---

## ✅ Solución: Configurar SMTP

### Paso 1: Verificar Variables SMTP

**Railway Dashboard** → `@constanza/notifier` → **Variables**

**Debe tener TODAS estas variables:**

- ✅ `SMTP_HOST` (ej: `smtp.gmail.com`)
- ✅ `SMTP_PORT` (ej: `587`)
- ✅ `SMTP_USER` (tu email de Gmail)
- ✅ `SMTP_PASS` (tu App Password de Gmail)
- ✅ `SMTP_FROM_NAME` (opcional, ej: `Constanza`)
- ✅ `SMTP_FROM_EMAIL` (opcional, tu email)

**Si falta alguna:**
- El worker intentará enviar pero fallará
- Verás errores en logs: `ERROR_SMTP_CONFIG_MISSING`

---

### Paso 2: Configurar Gmail App Password

**Si usas Gmail:**

1. Ve a tu cuenta de Google → **Seguridad**
2. Activa **"Verificación en 2 pasos"** (si no está activada)
3. Ve a **"Contraseñas de aplicaciones"**
4. Genera una nueva contraseña para "Correo"
5. Copia la contraseña generada (16 caracteres)

**Configura en Railway:**
- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_USER=tu_email@gmail.com`
- `SMTP_PASS=la_app_password_de_16_caracteres`

---

### Paso 3: Redeploy el `notifier`

Después de configurar SMTP:

1. **Railway** → `@constanza/notifier` → **Deployments** → **Redeploy**
2. Espera 2-3 minutos

---

### Paso 4: Verificar Logs

**Railway Dashboard** → `@constanza/notifier` → **Logs**

**Cuando intentas enviar un email, busca:**

**Si falta SMTP:**
```
ERROR_SMTP_CONFIG_MISSING: Faltan variables de entorno SMTP: SMTP_HOST, SMTP_USER, SMTP_PASS
```

**Si SMTP está mal configurado:**
```
ERROR_SMTP_AUTH_FAILED: Authentication failed
```

**Si se envía correctamente:**
```
Notification sent successfully
```

---

## 🚀 Cómo Usar la Nueva Página de Progreso

1. **Envía un mensaje** desde `/notify`
2. **Ve a** `/notify/batches` para ver el progreso
3. La página se actualiza automáticamente cada 5 segundos
4. Verás el estado en tiempo real: Procesando → Completado

---

## 📋 Checklist Final

- [ ] Variables SMTP configuradas en `notifier`
- [ ] Gmail App Password generada (si usas Gmail)
- [ ] Redeploy `notifier` después de configurar SMTP
- [ ] Verificar logs (debe decir "Notification sent successfully")
- [ ] Probar envío de email
- [ ] Ver progreso en `/notify/batches`

---

**Con SMTP configurado, los emails deberían enviarse correctamente. La página `/notify/batches` te mostrará el progreso en tiempo real.**




