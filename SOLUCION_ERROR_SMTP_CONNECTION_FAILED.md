# 🔧 Solución: ERROR_SMTP_CONNECTION_FAILED

## ⚠️ Problema Detectado

El error `ERROR_SMTP_CONNECTION_FAILED` significa que **no puede conectarse al servidor SMTP de Gmail**.

---

## ✅ Configuración Actual

Veo que tienes:
- ✅ `SMTP_HOST`: `smtp.gmail.com` (correcto)
- ✅ `SMTP_USER`: `empliadoemilia@gmail.com` (correcto)
- ✅ `SMTP_PASS`: `empliados2025` (⚠️ **PROBLEMA**: Esta NO es una App Password)
- ❓ `SMTP_PORT`: (enmascarado, necesito verificar)

---

## 🔍 Problemas Detectados

### Problema 1: `SMTP_PASS` No Es App Password

**Gmail NO acepta contraseñas normales para SMTP.** Necesitas una **App Password** (contraseña de aplicación).

**La contraseña `empliados2025` es una contraseña normal, no una App Password.**

---

### Problema 2: `SMTP_PORT` Puede Estar Incorrecto

Para Gmail, el puerto debe ser:
- ✅ `587` (TLS/STARTTLS) - **Recomendado**
- ✅ `465` (SSL) - Alternativa

---

## ✅ Solución Paso a Paso

### Paso 1: Generar App Password de Gmail

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. **Seguridad** → **Verificación en 2 pasos** (debe estar activada)
3. **Contraseñas de aplicaciones** → **Generar nueva contraseña**
4. Selecciona "Correo" y "Otro (nombre personalizado)"
5. Escribe "Constanza" o "Notifier"
6. Click en **"Generar"**
7. **Copia la contraseña de 16 caracteres** (ej: `abcd efgh ijkl mnop`)

---

### Paso 2: Configurar Variables SMTP en Railway

**Railway Dashboard** → `@constanza/notifier` → **Variables**

**Edita o agrega:**

1. **`SMTP_HOST`**: `smtp.gmail.com` ✅ (ya está bien)

2. **`SMTP_PORT`**: `587` ✅ (verifica que sea 587, no 465)

3. **`SMTP_USER`**: `empliadoemilia@gmail.com` ✅ (ya está bien)

4. **`SMTP_PASS`**: **[PEGA LA APP PASSWORD DE 16 CARACTERES]** ⚠️ **IMPORTANTE**
   - NO uses la contraseña normal `empliados2025`
   - Usa la App Password que generaste en el Paso 1
   - Debe tener 16 caracteres (puede tener espacios, pero mejor sin espacios)

5. **`SMTP_FROM_NAME`** (opcional): `Constanza`

6. **`SMTP_FROM_EMAIL`** (opcional): `empliadoemilia@gmail.com`

---

### Paso 3: Redeploy el `notifier`

**Railway Dashboard** → `@constanza/notifier` → **Deployments** → **Redeploy**

Espera 2-3 minutos.

---

### Paso 4: Verificar Logs

**Railway Dashboard** → `@constanza/notifier` → **Logs**

**Cuando intentes enviar un email, busca:**

**Si funciona:**
```
Notification sent successfully
```

**Si sigue fallando:**
```
❌ Failed to send EMAIL notification: ERROR_SMTP_AUTH_FAILED
```
- La App Password es incorrecta

**O:**
```
❌ Failed to send EMAIL notification: ERROR_SMTP_CONNECTION_FAILED
```
- El puerto está mal o hay problema de red

---

## 🎯 Formato Correcto de Variables SMTP

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=empliadoemilia@gmail.com
SMTP_PASS=abcdefghijklmnop  ← App Password de 16 caracteres (sin espacios)
SMTP_FROM_NAME=Constanza
SMTP_FROM_EMAIL=empliadoemilia@gmail.com
```

---

## ⚠️ Importante

**NO uses la contraseña normal de Gmail.** Gmail bloquea las conexiones SMTP con contraseñas normales por seguridad.

**Solo funciona con App Password.**

---

## 📋 Checklist

- [ ] Verificación en 2 pasos activada en Google
- [ ] App Password generada (16 caracteres)
- [ ] `SMTP_PASS` actualizada con App Password (no contraseña normal)
- [ ] `SMTP_PORT` configurado como `587`
- [ ] Redeploy del `notifier`
- [ ] Verificar logs (debe decir "Notification sent successfully")

---

**Con la App Password correcta, el error `ERROR_SMTP_CONNECTION_FAILED` debería desaparecer.**




