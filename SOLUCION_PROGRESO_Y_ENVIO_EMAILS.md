# 🔧 Solución: Ver Progreso y Enviar Emails

## ⚠️ Problemas Detectados

1. **No se ve la cola de mensajes** - Falta página para ver progreso
2. **El email no llega** - Probablemente falta configuración SMTP

---

## ✅ Solución 1: Ver Progreso de Mensajes

### Opción A: Ver en Logs del `notifier` (Temporal)

**Railway Dashboard** → `@constanza/notifier` → **Logs**

**Busca:**
- `Processing notification` (cuando procesa un mensaje)
- `Notification sent successfully` (cuando se envía correctamente)
- `Failed to send email notification` (si falla)

---

### Opción B: Crear Página de Progreso (Recomendado)

Necesitamos crear una página similar a `/calls/batches` pero para notificaciones.

**Endpoint que ya existe:**
- `GET /v1/notify/batch/:id` - Estado de un batch específico

**Falta crear:**
- `GET /v1/notify/batches` - Listar todos los batches
- Página frontend para mostrar el progreso

---

## ✅ Solución 2: Configurar SMTP para Enviar Emails

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

### Paso 3: Verificar Logs del `notifier`

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

## 🎯 Acción Inmediata

1. **Railway** → `@constanza/notifier` → **Variables**
   - Verifica que `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` estén configuradas
   - Si no, agrégalas

2. **Railway** → `@constanza/notifier` → **Logs**
   - Intenta enviar un email de nuevo
   - ¿Qué errores ves?

3. **Crear página de progreso** (si quieres ver el estado)
   - Similar a `/calls/batches` pero para `/notify/batches`

---

## 📋 Checklist

- [ ] Variables SMTP configuradas en `notifier`
- [ ] Gmail App Password generada (si usas Gmail)
- [ ] Redeploy `notifier` después de configurar SMTP
- [ ] Verificar logs (debe decir "Notification sent successfully")
- [ ] Crear página de progreso (opcional)

---

**Con SMTP configurado, los emails deberían enviarse correctamente. Los logs del `notifier` te dirán exactamente qué está fallando.**




