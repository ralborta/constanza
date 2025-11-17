# 🔗 Instrucciones para Linkear Railway y Configurar DB

## Paso 1: Linkear Proyecto Railway (Solo una vez)

Ejecuta en tu terminal:

```bash
railway link
```

Railway te mostrará una lista de proyectos. **Selecciona el proyecto que tiene tus servicios** (api-gateway, notifier, etc.).

**Si no ves tu proyecto:**
- Verifica que estés autenticado: `railway whoami`
- Verifica que el proyecto exista en Railway Dashboard

---

## Paso 2: Verificar que el Link Funcionó

```bash
railway status
```

Deberías ver información de tu proyecto.

---

## Paso 3: Crear PostgreSQL en Railway (Si aún no lo tienes)

1. **Ve a Railway Dashboard:** https://railway.app
2. **Abre tu proyecto**
3. **Click en "+ New"** → **"Database"** → **"Postgres"**
4. **Espera 1-2 minutos** a que se cree

Railway automáticamente agregará `DATABASE_URL` a todos tus servicios.

---

## Paso 4: Ejecutar Script de Configuración

Una vez que:
- ✅ Proyecto linkeado (`railway link` ejecutado)
- ✅ PostgreSQL creado en Railway

Ejecuta:

```bash
./setup-db-completo.sh
```

Este script:
- ✅ Verifica que todo esté configurado
- ✅ Obtiene `DATABASE_URL` automáticamente
- ✅ Crea los esquemas en la DB
- ✅ Genera Prisma Client
- ✅ Aplica todas las migraciones

---

## Alternativa: Si Prefieres Hacerlo Manual

Si prefieres hacerlo paso a paso:

### 1. Obtener DATABASE_URL

```bash
railway variables | grep DATABASE_URL
```

### 2. Configurar localmente

```bash
cd infra/prisma
echo "DATABASE_URL=tu_url_aqui" > .env
```

### 3. Crear esquemas

```bash
# Si tienes psql instalado
psql "$DATABASE_URL" < ../../infra/supabase/migrations/001_initial_schemas.sql

# O desde Railway Dashboard → Postgres → Data → Query
# Ejecuta el contenido de: infra/supabase/migrations/001_initial_schemas.sql
```

### 4. Generar Prisma Client

```bash
cd infra/prisma
pnpm prisma generate
```

### 5. Aplicar migraciones

```bash
pnpm prisma migrate deploy
```

---

## ✅ Verificación Final

```bash
cd infra/prisma
pnpm prisma studio
```

Esto abrirá Prisma Studio en tu navegador donde podrás ver todas las tablas.

---

## 🚨 Problemas Comunes

### "No linked project found"

**Solución:** Ejecuta `railway link` y selecciona tu proyecto.

### "DATABASE_URL no encontrada"

**Solución:** 
1. Verifica que PostgreSQL esté creado en Railway
2. Espera 1-2 minutos después de crearlo
3. Verifica en Railway Dashboard → api-gateway → Variables

### "Can't reach database server"

**Solución:**
1. Verifica que `DATABASE_URL` sea correcta
2. Verifica que Postgres esté corriendo en Railway

---

## 📝 Resumen Rápido

```bash
# 1. Linkear (solo una vez)
railway link

# 2. Crear PostgreSQL en Railway Dashboard
# (desde la web, 2 minutos)

# 3. Configurar todo
./setup-db-completo.sh

# 4. Verificar
cd infra/prisma && pnpm prisma studio
```

---

¿Listo? Ejecuta `railway link` y luego me avisas para continuar! 🚀

