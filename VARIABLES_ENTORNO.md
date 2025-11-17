# 🔐 Variables de Entorno - Guía Completa

## 📋 Resumen

Este documento lista todas las variables de entorno necesarias para el proyecto Constanza.

---

## 🗄️ Variables de Base de Datos

### `DATABASE_URL` (REQUERIDA)

**Descripción:** URL de conexión a la base de datos PostgreSQL.

**Formato:**
```
postgresql://usuario:password@host:puerto/nombre_db
```

**Ejemplos:**

**Railway:**
```
postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
```

**Supabase:**
```
postgresql://postgres:[TU_PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

**Local (Docker):**
```
postgresql://postgres:postgres@localhost:5432/constanza
```

**Cómo obtenerla:**
- **Railway:** Se crea automáticamente al agregar Postgres. Ve a tu servicio → Variables → "Variables added by Railway"
- **Supabase:** Settings → Database → Connection string → URI
- **Local:** Configúrala manualmente en tu `.env`

**Verificación:**
```bash
# Verificar que está configurada
echo $DATABASE_URL

# Probar conexión
cd infra/prisma
pnpm prisma db pull
```

---

## 🔒 Variables de Autenticación

### `JWT_SECRET` (REQUERIDA para producción)

**Descripción:** Clave secreta para firmar tokens JWT.

**Formato:** String aleatorio (mínimo 32 caracteres recomendado)

**Ejemplo:**
```
JWT_SECRET=WYDq2Nd9WeoMH5CseQAaDxNsnea9YkWS8DhoBZZKn74=
```

**Generar una nueva:**
```bash
# Opción 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Opción 2: OpenSSL
openssl rand -base64 32
```

**⚠️ Importante:** 
- NO compartas esta clave
- Usa diferentes valores para desarrollo y producción
- Si cambias esta clave, todos los tokens existentes se invalidan

---

## 🌐 Variables de CORS

### `ALLOWED_ORIGINS` (Recomendada)

**Descripción:** Orígenes permitidos para CORS (separados por comas).

**Formato:** URLs separadas por comas (sin espacios)

**Ejemplo:**
```
ALLOWED_ORIGINS=https://constanza-web.vercel.app,http://localhost:3001,http://localhost:3000
```

**Para desarrollo local:**
```
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
```

**Para producción:**
```
ALLOWED_ORIGINS=https://constanza-web.vercel.app,https://app.constanza.com
```

---

## 🚀 Variables del Servidor

### `PORT` (Opcional)

**Descripción:** Puerto donde corre el servidor.

**Valor por defecto:** `3000`

**Ejemplo:**
```
PORT=3000
```

**Nota:** Railway y otros servicios cloud suelen inyectar esta variable automáticamente.

---

### `NODE_ENV` (Recomendada)

**Descripción:** Entorno de ejecución.

**Valores posibles:**
- `development` - Desarrollo local
- `production` - Producción
- `test` - Testing

**Ejemplo:**
```
NODE_ENV=production
```

---

## 🔔 Variables del Notifier (apps/notifier)

### `REDIS_URL` (Requerida para notifier)

**Descripción:** URL de conexión a Redis.

**Formato:**
```
redis://usuario:password@host:puerto
```

**Ejemplos:**

**Railway:**
```
redis://default:password@containers-us-west-xxx.railway.app:6379
```

**Local:**
```
redis://localhost:6379
```

---

### `BUILDERBOT_API_KEY` (Requerida para WhatsApp)

**Descripción:** API Key de BuilderBot para WhatsApp.

**Ejemplo:**
```
BUILDERBOT_API_KEY=tu_api_key_aqui
```

---

### `SMTP_URL` (Requerida para Email)

**Descripción:** URL de conexión SMTP para envío de emails.

**Formato:**
```
smtp://usuario:password@host:puerto
```

**Ejemplo (Gmail):**
```
smtps://usuario@gmail.com:app_password@smtp.gmail.com:465
```

**Ejemplo (SendGrid):**
```
smtp://apikey:TU_API_KEY@smtp.sendgrid.net:587
```

---

### `TTS_URL` (Requerida para Voice)

**Descripción:** URL del servicio de Text-to-Speech.

**Ejemplo:**
```
TTS_URL=https://api.elevenlabs.io/v1/text-to-speech
```

---

## 🔗 Variables de Integración

### `CUCURU_WEBHOOK_SECRET` (apps/rail-cucuru)

**Descripción:** Secreto para validar webhooks de Cucuru.

**Ejemplo:**
```
CUCURU_WEBHOOK_SECRET=tu_secreto_aqui
```

---

## 🌱 Variables de Seed

### `SEED_SECRET` (Opcional)

**Descripción:** Secreto para proteger el endpoint de seed en producción.

**Ejemplo:**
```
SEED_SECRET=mi_secreto_super_seguro
```

**⚠️ Importante:** Solo usar en desarrollo o con protección adecuada.

---

## 📝 Archivos .env por Servicio

### Raíz del proyecto (`.env`)

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=...
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
NODE_ENV=development
```

### `apps/api-gateway/.env`

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=...
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
PORT=3000
NODE_ENV=development
SEED_SECRET=dev_secret
```

### `apps/notifier/.env`

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
BUILDERBOT_API_KEY=...
SMTP_URL=smtp://...
TTS_URL=https://...
NODE_ENV=development
```

### `apps/rail-cucuru/.env`

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
CUCURU_WEBHOOK_SECRET=...
NODE_ENV=development
```

### `infra/prisma/.env`

```bash
DATABASE_URL=postgresql://...
```

---

## ✅ Checklist de Verificación

### Para desarrollo local:

- [ ] `DATABASE_URL` configurada y accesible
- [ ] `JWT_SECRET` generada (mínimo 32 caracteres)
- [ ] `ALLOWED_ORIGINS` incluye `http://localhost:3000` y `http://localhost:3001`
- [ ] `NODE_ENV=development`

### Para producción (Railway):

- [ ] `DATABASE_URL` configurada (Railway la crea automáticamente)
- [ ] `JWT_SECRET` configurada (diferente a desarrollo)
- [ ] `ALLOWED_ORIGINS` incluye tu dominio de producción
- [ ] `NODE_ENV=production`
- [ ] `SEED_SECRET` configurada (si usas seed en producción)

### Para notifier:

- [ ] `REDIS_URL` configurada
- [ ] `BUILDERBOT_API_KEY` configurada (si usas WhatsApp)
- [ ] `SMTP_URL` configurada (si usas Email)
- [ ] `TTS_URL` configurada (si usas Voice)

---

## 🔍 Cómo Verificar Variables

### 1. Verificar que Prisma está instalado y conectado:

```bash
# Ejecutar script de verificación
./verificar-prisma-db.sh

# O manualmente:
cd infra/prisma
pnpm prisma generate
pnpm prisma studio  # Abre Prisma Studio en el navegador
```

### 2. Verificar variables en Railway:

1. Ve a tu servicio en Railway
2. Pestaña **"Variables"**
3. Verifica que todas las variables requeridas estén configuradas

### 3. Verificar variables localmente:

```bash
# Ver todas las variables
cat .env

# Ver una variable específica
echo $DATABASE_URL

# Verificar que Prisma puede conectarse
cd infra/prisma
pnpm prisma db pull
```

---

## 🚨 Problemas Comunes

### "Can't reach database server"

**Causa:** `DATABASE_URL` incorrecta o base de datos no accesible.

**Solución:**
1. Verifica que `DATABASE_URL` esté correcta
2. Verifica que la base de datos esté corriendo
3. Verifica firewall/red si es remota

### "Prisma Client not generated"

**Causa:** No se ha ejecutado `prisma generate`.

**Solución:**
```bash
cd infra/prisma
pnpm prisma generate
```

### "JWT_SECRET is required"

**Causa:** Variable `JWT_SECRET` no configurada.

**Solución:**
```bash
# Generar una nueva
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Agregar a .env
echo "JWT_SECRET=tu_secreto_generado" >> .env
```

---

## 📚 Referencias

- [Documentación de Prisma](https://www.prisma.io/docs)
- [Railway Variables](https://docs.railway.app/develop/variables)
- [Supabase Connection Strings](https://supabase.com/docs/guides/database/connecting-to-postgres)

