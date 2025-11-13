# 🌱 Instrucciones para Ejecutar el Seed

## Opción 1: GitHub Actions (Más Seguro) ✅

1. Ve a: https://github.com/ralborta/constanza/actions
2. Selecciona el workflow **"Seed Database"**
3. Click en **"Run workflow"** (botón verde a la derecha)
4. En el campo **"database_url"**, pega tu `DATABASE_URL` de Supabase
5. Click en **"Run workflow"**
6. Espera a que termine (1-2 minutos)

## Opción 2: Ejecutar Localmente

```bash
# 1. Configurar DATABASE_URL
export DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

# 2. Ejecutar seed
cd /Users/ralborta/Constanza
pnpm seed
```

O usar el script:
```bash
export DATABASE_URL="tu-url-aqui"
./scripts/seed-db.sh
```

## Opción 3: Desde Railway

1. Ve a Railway Dashboard → `api-gateway` service
2. Click en "Deploy Logs" o "Shell"
3. Ejecuta:
```bash
cd /app
pnpm seed
```

## 📝 Credenciales Creadas

Después de ejecutar el seed, podrás usar:

### Empleados/Operadores:
- **Admin:** `admin@constanza.com` / `admin123`
- **Operador 1:** `operador1@constanza.com` / `operador123`

### Clientes (marcar "Soy cliente"):
- **Cliente:** `cliente@acme.com` / `cliente123`

## ⚠️ Importante

- El seed es **idempotente**: puedes ejecutarlo múltiples veces sin problemas
- Si los usuarios ya existen, solo actualizará las contraseñas
- Crea un tenant "demo", usuarios, cliente y una factura de prueba

