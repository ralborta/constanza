# 🔧 Solución: SMTP Connection Timeout en Railway

## ⚠️ Problema Detectado

```
ERROR_SMTP_CONNECTION_FAILED: Error de conexión SMTP: Connection timeout
```

**Significado**: Railway no puede conectarse al servidor SMTP de Gmail (`smtp.gmail.com`).

---

## 🔍 Posibles Causas

### 1. Railway Bloquea Conexiones SMTP Salientes (MÁS PROBABLE)

**Railway puede tener restricciones de firewall** que bloquean conexiones SMTP salientes a puertos 587/465.

**Solución**: Usar un servicio SMTP optimizado para cloud (SendGrid, Resend, Mailgun).

---

### 2. Timeouts Muy Cortos

Los timeouts pueden ser muy cortos para la latencia de Railway.

**Solución**: Ya aumenté los timeouts a 30 segundos en el código.

---

### 3. Puerto Bloqueado

El puerto 587 (STARTTLS) puede estar bloqueado, pero 465 (SSL) puede funcionar.

**Solución**: Probar con puerto 465.

---

## ✅ Soluciones Paso a Paso

### Solución 1: Probar con Puerto 465 (SSL) en lugar de 587

**Railway Dashboard** → `@constanza/notifier` → **Variables**

1. Cambia `SMTP_PORT` de `587` a `465`:
   ```
   SMTP_PORT=465
   ```

2. Railway redeploy automáticamente

3. Prueba enviar un email de nuevo

**Si funciona con 465**: El problema era el puerto 587 bloqueado.

---

### Solución 2: Usar SendGrid (Recomendado para Producción)

SendGrid está optimizado para cloud y funciona mejor con Railway.

#### Paso 1: Crear Cuenta en SendGrid

1. Ve a: https://signup.sendgrid.com/
2. Crea una cuenta gratuita (100 emails/día gratis)
3. Verifica tu email

#### Paso 2: Generar API Key

1. SendGrid Dashboard → **Settings** → **API Keys**
2. Click en **"Create API Key"**
3. Nombre: `Constanza Notifier`
4. Permisos: **"Full Access"** o **"Mail Send"**
5. Click en **"Create & View"**
6. **Copia la API Key** (solo se muestra una vez)

#### Paso 3: Configurar en Railway

**Railway Dashboard** → `@constanza/notifier` → **Variables**

Cambia estas variables:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMTP_FROM_EMAIL=noreply@constanza.com
SMTP_FROM_NAME=Constanza
```

**Nota**: `SMTP_USER` debe ser literalmente `apikey` (no tu email).

**Nota**: `SMTP_PASS` es la API Key que copiaste (empieza con `SG.`).

#### Paso 4: Verificar Dominio en SendGrid (Opcional pero Recomendado)

1. SendGrid Dashboard → **Settings** → **Sender Authentication**
2. Verifica tu dominio o usa el dominio de SendGrid para pruebas

---

### Solución 3: Usar Resend (Alternativa Moderna)

Resend es otro servicio moderno optimizado para desarrolladores.

1. Ve a: https://resend.com/
2. Crea cuenta gratuita
3. Genera API Key
4. Configura en Railway:

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMTP_FROM_EMAIL=onboarding@resend.dev  # O tu dominio verificado
SMTP_FROM_NAME=Constanza
```

---

### Solución 4: Verificar Firewall de Railway

Si Railway está bloqueando conexiones SMTP, puedes:

1. **Contactar soporte de Railway**: https://railway.app/contact
2. Preguntar si hay restricciones de firewall para SMTP
3. Solicitar que habiliten conexiones salientes a `smtp.gmail.com:587` y `smtp.gmail.com:465`

---

## 🔍 Diagnóstico Adicional

### Verificar Logs en Railway

**Railway Dashboard** → `@constanza/notifier` → **Logs**

Busca mensajes como:
- `Connection timeout`
- `ECONNREFUSED`
- `ETIMEDOUT`
- `ENOTFOUND`

### Probar Conexión desde Railway (Debug)

Puedes crear un script temporal para probar la conexión:

```javascript
// test-smtp.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
});

transporter.verify()
  .then(() => console.log('✅ SMTP conectado correctamente'))
  .catch((err) => console.error('❌ Error SMTP:', err.message));
```

Ejecutar en Railway:
```bash
railway run node test-smtp.js
```

---

## 📋 Checklist de Solución

- [ ] Probar cambiar `SMTP_PORT` de `587` a `465`
- [ ] Si no funciona, crear cuenta en SendGrid
- [ ] Configurar variables SMTP de SendGrid en Railway
- [ ] Redeploy `notifier`
- [ ] Probar envío de email
- [ ] Verificar logs en Railway

---

## 🎯 Recomendación Final

**Para producción, recomiendo usar SendGrid o Resend** en lugar de Gmail SMTP directo porque:

1. ✅ Están optimizados para cloud (Railway, Vercel, etc.)
2. ✅ No tienen problemas de firewall
3. ✅ Mejor entregabilidad (menos spam)
4. ✅ Métricas y analytics
5. ✅ APIs modernas
6. ✅ Planes gratuitos generosos

**Gmail SMTP es mejor para desarrollo local**, pero en producción cloud puede tener problemas de conectividad.

---

## ✅ Cambios Aplicados en el Código

Ya aumenté los timeouts en `apps/notifier/src/channels/email.ts`:

- `connectionTimeout`: 10s → 30s
- `greetingTimeout`: 10s → 30s  
- `socketTimeout`: 10s → 30s

Esto debería ayudar si el problema es solo de latencia, pero si Railway bloquea SMTP, necesitarás usar SendGrid/Resend.

---

**Prueba primero con puerto 465, y si no funciona, migra a SendGrid que es la solución más confiable para producción.**



