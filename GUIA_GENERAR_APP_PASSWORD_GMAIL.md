# 🔐 Guía: Generar App Password de Gmail

## ✅ Paso a Paso

### Paso 1: Activar Verificación en 2 Pasos (Si No Está Activada)

1. Ve a: **https://myaccount.google.com/**
2. En el menú lateral izquierdo, click en **"Seguridad"**
3. Busca la sección **"Cómo iniciar sesión en Google"**
4. Busca **"Verificación en 2 pasos"**
5. Si dice **"Desactivada"**:
   - Click en **"Verificación en 2 pasos"**
   - Sigue los pasos para activarla (necesitarás tu teléfono)
   - Confirma con código SMS o llamada
6. Si ya está **"Activada"**, continúa al Paso 2

**⚠️ IMPORTANTE:** Sin verificación en 2 pasos activada, NO podrás generar App Passwords.

---

### Paso 2: Generar App Password

1. En la misma página de **Seguridad** (https://myaccount.google.com/security)
2. Busca la sección **"Cómo iniciar sesión en Google"**
3. Busca **"Contraseñas de aplicaciones"**
4. Click en **"Contraseñas de aplicaciones"**

**Si NO ves "Contraseñas de aplicaciones":**
- Asegúrate de que la verificación en 2 pasos esté activada
- Puede tardar unos minutos en aparecer después de activarla

---

### Paso 3: Crear Nueva App Password

1. En la página de **"Contraseñas de aplicaciones"**
2. En el dropdown **"Seleccionar app"**, elige **"Correo"**
3. En el dropdown **"Seleccionar dispositivo"**, elige **"Otro (nombre personalizado)"**
4. Escribe: **"Constanza"** o **"Notifier"**
5. Click en **"Generar"**

---

### Paso 4: Copiar la App Password

1. Google mostrará una contraseña de **16 caracteres**
2. Se verá algo así: `abcd efgh ijkl mnop` (con espacios)
   - O sin espacios: `abcdefghijklmnop`
3. **Copia esta contraseña completa** (los 16 caracteres)
4. **Guárdala en un lugar seguro** (la necesitarás para Railway)

**⚠️ IMPORTANTE:** 
- Esta contraseña solo se muestra UNA VEZ
- Si la pierdes, tendrás que generar una nueva
- NO es tu contraseña normal de Gmail

---

### Paso 5: Usar la App Password en Railway

1. **Railway Dashboard** → `@constanza/notifier` → **Variables**
2. Busca `SMTP_PASS`
3. **Edita** el valor
4. **Pega la App Password** que copiaste (puedes pegar con o sin espacios, ambos funcionan)
5. **Guarda**

---

## 🎯 Resumen Visual

```
Google Account → Seguridad → Verificación en 2 pasos (activar)
                          ↓
                    Contraseñas de aplicaciones
                          ↓
                    Seleccionar app: "Correo"
                    Seleccionar dispositivo: "Otro (Constanza)"
                          ↓
                    Generar → Copiar 16 caracteres
                          ↓
                    Railway → Variables → SMTP_PASS → Pegar → Guardar
```

---

## ⚠️ Problemas Comunes

### "No veo 'Contraseñas de aplicaciones'"

**Causa:** Verificación en 2 pasos no está activada o acabas de activarla.

**Solución:**
1. Verifica que la verificación en 2 pasos esté activada
2. Espera 5-10 minutos
3. Refresca la página
4. Si sigue sin aparecer, desactiva y vuelve a activar la verificación en 2 pasos

---

### "La App Password no funciona"

**Causa:** Copiaste mal o hay espacios extra.

**Solución:**
1. Genera una nueva App Password
2. Copia exactamente los 16 caracteres
3. Pégala en Railway sin modificar
4. Si tiene espacios, puedes dejarlos o quitarlos (ambos funcionan)

---

### "Gmail sigue rechazando la conexión"

**Causa:** Puede ser el puerto o la configuración.

**Solución:**
1. Verifica que `SMTP_PORT` sea `587` (no 465)
2. Verifica que `SMTP_HOST` sea `smtp.gmail.com`
3. Verifica que `SMTP_USER` sea tu email completo
4. Genera una nueva App Password y vuelve a intentar

---

## 📋 Checklist Final

- [ ] Verificación en 2 pasos activada
- [ ] App Password generada (16 caracteres)
- [ ] App Password copiada
- [ ] `SMTP_PASS` actualizada en Railway
- [ ] `SMTP_PORT` = `587`
- [ ] Redeploy del `notifier`
- [ ] Probar envío de email

---

**Con la App Password correcta, Gmail aceptará las conexiones SMTP y los emails se enviarán correctamente.**




