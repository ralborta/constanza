# ⚡ Resumen Rápido - Variables de Entorno

## 🚂 RAILWAY

### Servicio: `api-gateway`

```
DATABASE_URL          → Desde Postgres (automático)
JWT_SECRET            → Generar nueva (32+ caracteres)
ALLOWED_ORIGINS       → https://tu-app.vercel.app
NOTIFIER_URL          → https://notifier-production.up.railway.app
NODE_ENV              → production
```

### Servicio: `notifier`

```
DATABASE_URL          → Misma que api-gateway
REDIS_URL             → Desde Redis (automático)
SMTP_HOST             → smtp.gmail.com
SMTP_PORT             → 587
SMTP_USER             → tu_email@gmail.com
SMTP_PASS             → abcdefghijklmnop (App Password SIN espacios)
SMTP_FROM_EMAIL       → noreply@constanza.com (opcional)
SMTP_FROM_NAME        → Constanza (opcional)
NODE_ENV              → production
```

## ▲ VERCEL

### Proyecto: `constanza-web`

```
NEXT_PUBLIC_API_URL   → https://api-gateway-production.up.railway.app
```

**⚠️ IMPORTANTE**: Después de agregar/modificar variables en Vercel, haz **Redeploy**.

---

## 🔐 Generar App Password de Gmail

1. Ve a: https://myaccount.google.com/apppasswords
2. Selecciona: **Correo** → **Otro** → Escribe "Constanza"
3. Copia la contraseña de 16 caracteres **SIN espacios**
4. Úsala en `SMTP_PASS` en Railway

---

## ✅ Verificación Rápida

```bash
# 1. Verificar api-gateway
curl https://api-gateway-production.up.railway.app/health

# 2. Verificar notifier
curl https://notifier-production.up.railway.app/health

# 3. Verificar frontend (consola del navegador)
# Debería mostrar: 🔍 API_URL configurada: https://...
```

---

## 📚 Documentación Completa

- **Guía completa**: `CONFIGURAR_VARIABLES_RAILWAY_VERCEL.md`
- **Configuración de emails**: `CONFIGURAR_ENVIO_EMAILS.md`



