# 📧 Configuración SMTP para Dominio nivel41.site

## ✅ Valores de Configuración del Administrador

El administrador de correos ha proporcionado la siguiente configuración:

### Datos del Servidor

- **Usuario:** `ralborta@nivel41.site`
- **Contraseña:** `*8AjcOxK`
- **Servidor SMTP:** `c2810482.ferozo.com`
- **Puerto SMTP:** `465` (con SSL)
- **SSL:** Sí (habilitado)

---

## 🔧 Configuración en Railway

### Paso 1: Acceder a Variables del Notifier

1. Ve a **Railway Dashboard** → Tu proyecto → `@constanza/notifier` → **Variables**

### Paso 2: Configurar Variables SMTP

Agrega o actualiza las siguientes variables:

#### Variables Requeridas:

```env
SMTP_HOST=c2810482.ferozo.com
SMTP_PORT=465
SMTP_USER=ralborta@nivel41.site
SMTP_PASS=*8AjcOxK
```

#### Variables Opcionales (Recomendadas):

```env
SMTP_FROM_EMAIL=ralborta@nivel41.site
SMTP_FROM_NAME=Constanza
```

---

## 📝 Instrucciones Detalladas

### Variable 1: `SMTP_HOST`

- **Nombre:** `SMTP_HOST`
- **Valor:** `c2810482.ferozo.com`
- **Descripción:** Servidor SMTP saliente

### Variable 2: `SMTP_PORT`

- **Nombre:** `SMTP_PORT`
- **Valor:** `465`
- **Descripción:** Puerto SMTP con SSL (el código detecta automáticamente que 465 usa SSL)

### Variable 3: `SMTP_USER`

- **Nombre:** `SMTP_USER`
- **Valor:** `ralborta@nivel41.site`
- **Descripción:** Usuario de autenticación SMTP

### Variable 4: `SMTP_PASS`

- **Nombre:** `SMTP_PASS`
- **Valor:** `*8AjcOxK`
- **Descripción:** Contraseña de autenticación SMTP

### Variable 5: `SMTP_FROM_EMAIL` (Opcional)

- **Nombre:** `SMTP_FROM_EMAIL`
- **Valor:** `ralborta@nivel41.site`
- **Descripción:** Email que aparecerá como remitente (si no se configura, usa `SMTP_USER`)

### Variable 6: `SMTP_FROM_NAME` (Opcional)

- **Nombre:** `SMTP_FROM_NAME`
- **Valor:** `Constanza`
- **Descripción:** Nombre que aparecerá como remitente

---

## ✅ Verificación Post-Configuración

### Paso 1: Redeploy del Notifier

Después de configurar las variables:

1. Railway debería hacer redeploy automáticamente
2. Si no, ve a **Deployments** → **Redeploy**

### Paso 2: Verificar Logs

1. Ve a **Railway Dashboard** → `@constanza/notifier` → **Logs**
2. Busca mensajes como:
   - ✅ `✅ SMTP conectado correctamente` (si hay logs de debug)
   - ❌ `ERROR_SMTP_CONNECTION_FAILED` (si hay problemas de conexión)
   - ❌ `ERROR_SMTP_AUTH_FAILED` (si hay problemas de autenticación)

### Paso 3: Probar Envío

1. Ve a la aplicación web
2. Intenta enviar una notificación por email
3. Verifica que el email llegue correctamente

---

## 🔍 Solución de Problemas

### Error: `ERROR_SMTP_CONNECTION_FAILED`

**Posibles causas:**
- El servidor SMTP está bloqueado por firewall
- El puerto 465 está bloqueado
- El hostname es incorrecto

**Soluciones:**
1. Verifica que `SMTP_HOST` sea exactamente `c2810482.ferozo.com` (sin espacios)
2. Verifica que `SMTP_PORT` sea `465` (número, no string)
3. Contacta al administrador si el servidor requiere IPs permitidas

### Error: `ERROR_SMTP_AUTH_FAILED`

**Posibles causas:**
- Usuario o contraseña incorrectos
- La contraseña tiene caracteres especiales mal escapados

**Soluciones:**
1. Verifica que `SMTP_USER` sea exactamente `ralborta@nivel41.site`
2. Verifica que `SMTP_PASS` sea exactamente `*8AjcOxK` (incluyendo el asterisco)
3. Asegúrate de que no haya espacios al inicio o final de las variables

### Error: `ERROR_SMTP_CONFIG_MISSING`

**Causa:** Faltan variables requeridas

**Solución:**
- Verifica que todas las variables requeridas estén configuradas:
  - ✅ `SMTP_HOST`
  - ✅ `SMTP_PORT`
  - ✅ `SMTP_USER`
  - ✅ `SMTP_PASS`

---

## 📋 Checklist de Configuración

- [ ] `SMTP_HOST` configurado como `c2810482.ferozo.com`
- [ ] `SMTP_PORT` configurado como `465`
- [ ] `SMTP_USER` configurado como `ralborta@nivel41.site`
- [ ] `SMTP_PASS` configurado como `*8AjcOxK`
- [ ] `SMTP_FROM_EMAIL` configurado (opcional)
- [ ] `SMTP_FROM_NAME` configurado (opcional)
- [ ] Redeploy del servicio `notifier` completado
- [ ] Logs verificados sin errores SMTP
- [ ] Prueba de envío de email exitosa

---

## ⚠️ ADVERTENCIA IMPORTANTE: Railway Puede Bloquear Puertos SMTP

**Railway puede tener restricciones de firewall que bloquean conexiones SMTP salientes a puertos 587 y 465.**

Esto es un problema conocido en Railway y otras plataformas cloud. Si después de configurar todo ves el error `ERROR_SMTP_CONNECTION_FAILED` con mensajes como `Connection timeout` o `ETIMEDOUT`, es muy probable que Railway esté bloqueando el puerto.

---

## 🔄 Plan de Acción Recomendado

### Opción 1: Probar Primero con tu Servidor SMTP (Recomendado)

**Ventajas:**
- Usas tu propio dominio (`nivel41.site`)
- No dependes de servicios externos
- Control total sobre los emails

**Pasos:**
1. Configura las variables como se indica arriba
2. Haz redeploy del `notifier`
3. Prueba enviar un email
4. **Si funciona:** ¡Perfecto! Ya está todo listo.
5. **Si NO funciona:** Ve a la Opción 2

---

### Opción 2: Usar SendGrid como Relay SMTP (Si Railway Bloquea)

Si Railway bloquea el puerto 465, puedes usar SendGrid como intermediario. SendGrid está optimizado para cloud y funciona perfectamente con Railway.

#### Paso 1: Crear Cuenta en SendGrid

1. Ve a: https://signup.sendgrid.com/
2. Crea una cuenta gratuita (100 emails/día gratis)
3. Verifica tu email

#### Paso 2: Generar API Key

1. SendGrid Dashboard → **Settings** → **API Keys**
2. Click en **"Create API Key"**
3. Nombre: `Constanza Notifier`
4. Permisos: **"Mail Send"**
5. Click en **"Create & View"**
6. **Copia la API Key** (solo se muestra una vez, empieza con `SG.`)

#### Paso 3: Verificar Dominio en SendGrid (Opcional pero Recomendado)

Para usar tu dominio `nivel41.site` como remitente:

1. SendGrid Dashboard → **Settings** → **Sender Authentication**
2. Click en **"Authenticate Your Domain"**
3. Selecciona tu proveedor DNS (donde está configurado `nivel41.site`)
4. SendGrid te dará registros DNS para agregar (SPF, DKIM, etc.)
5. Agrega esos registros en tu proveedor DNS
6. Espera a que SendGrid verifique (puede tardar hasta 24 horas)

**Si no verificas el dominio:** Puedes usar `onboarding@resend.dev` temporalmente para pruebas.

#### Paso 4: Configurar en Railway

**Railway Dashboard** → `@constanza/notifier` → **Variables**

Cambia estas variables:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMTP_FROM_EMAIL=ralborta@nivel41.site  # O onboarding@resend.dev si no verificaste dominio
SMTP_FROM_NAME=Constanza
```

**Notas importantes:**
- `SMTP_USER` debe ser literalmente `apikey` (no tu email)
- `SMTP_PASS` es la API Key que copiaste (empieza con `SG.`)
- `SMTP_PORT` es `587` (SendGrid usa STARTTLS, no SSL directo)

---

### Opción 3: Usar Resend (Alternativa Moderna)

Resend es otro servicio moderno optimizado para desarrolladores.

1. Ve a: https://resend.com/
2. Crea cuenta gratuita (100 emails/día gratis)
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

### Opción 4: Contactar Soporte de Railway

Si prefieres usar tu servidor SMTP directamente:

1. Contacta soporte de Railway: https://railway.app/contact
2. Pregunta si hay restricciones de firewall para SMTP
3. Solicita que habiliten conexiones salientes a `c2810482.ferozo.com:465`

**Nota:** Railway puede no poder habilitar esto por políticas de seguridad.

---

## 🎯 Notas Importantes

1. **Puerto 465 con SSL:** El código detecta automáticamente que el puerto 465 requiere SSL, así que no necesitas configurar nada adicional.

2. **Caracteres especiales:** La contraseña contiene un asterisco (`*`), asegúrate de copiarla exactamente como está.

3. **Redeploy automático:** Railway hace redeploy automáticamente cuando cambias variables, pero puede tardar 1-2 minutos.

4. **Timeouts:** El código tiene timeouts de 30 segundos configurados, lo cual debería ser suficiente para la mayoría de conexiones.

5. **Restricciones de IP:** Tu servidor SMTP (`c2810482.ferozo.com`) podría requerir que Railway esté en una lista blanca de IPs. Si Railway bloquea el puerto, esto no aplicará, pero si el puerto funciona pero falla la autenticación, podría ser esto.

---

## ✅ Recomendación Final

**Mi recomendación:**

1. **Primero:** Prueba con tu servidor SMTP (`c2810482.ferozo.com:465`) - es lo más directo
2. **Si Railway bloquea:** Usa SendGrid o Resend - son servicios confiables y optimizados para cloud
3. **Para producción:** Si necesitas usar tu dominio, verifica `nivel41.site` en SendGrid/Resend para mejor entregabilidad

---

## ✅ Listo para Probar

Una vez configuradas todas las variables, el sistema debería poder enviar emails.

**Si encuentras `ERROR_SMTP_CONNECTION_FAILED` con timeout:** Railway está bloqueando el puerto. Usa SendGrid o Resend como alternativa.

Si encuentras algún otro problema, revisa los logs en Railway y consulta la sección de "Solución de Problemas" arriba.

