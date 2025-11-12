# 🚀 Solución Simple para Railway - Dockerfiles Individuales

## ✅ Cambio Realizado

**Creamos Dockerfiles individuales por servicio** en lugar de un Dockerfile único con Build Args. Esto simplifica todo.

## 📁 Estructura

```
apps/
├── api-gateway/
│   └── Dockerfile          ← NUEVO: Dockerfile específico
├── notifier/
│   └── Dockerfile          ← NUEVO: Dockerfile específico
└── rail-cucuru/
    └── Dockerfile          ← NUEVO: Dockerfile específico
```

## ⚙️ Configuración en Railway (MUY SIMPLE)

### Para cada servicio:

1. **Settings → Build**
   - **Builder**: `Dockerfile`
   - **Dockerfile Path**: `apps/api-gateway/Dockerfile` (o `apps/notifier/Dockerfile`, etc.)
   - **Root Directory**: `/` (root del repo)
   - **Build Args**: (DEJAR VACÍO - ya no se necesita)
   - **Build Command**: (DEJAR VACÍO)

2. **Settings → Deploy**
   - **Start Command**: (DEJAR VACÍO - el Dockerfile ya tiene el CMD)

3. **Settings → Variables**
   - Configurar variables de entorno según el servicio

## 🎯 Ventajas de Esta Solución

✅ **Más simple**: No necesitas Build Args
✅ **Más claro**: Cada servicio tiene su Dockerfile
✅ **Menos errores**: Railway no tiene que interpretar variables
✅ **Más rápido**: Railway puede cachear mejor por servicio
✅ **Más fácil de debuggear**: Logs más claros

## 📋 Configuración Exacta por Servicio

### api-gateway
- **Dockerfile Path**: `apps/api-gateway/Dockerfile`
- **Root Directory**: `/`

### notifier
- **Dockerfile Path**: `apps/notifier/Dockerfile`
- **Root Directory**: `/`

### rail-cucuru
- **Dockerfile Path**: `apps/rail-cucuru/Dockerfile`
- **Root Directory**: `/`

## 🔄 Pasos para Aplicar

1. **Hacer commit y push de los nuevos Dockerfiles**
2. **En Railway, para cada servicio:**
   - Settings → Build → Dockerfile Path = `apps/<servicio>/Dockerfile`
   - Settings → Build → Build Args = (vacío)
   - Clear cache
   - Redeploy

## 🚨 Si Sigue Fallando

Verificar en los logs:
- ¿Encuentra el Dockerfile? → Verificar que el path sea correcto
- ¿Encuentra pnpm-lock.yaml? → Verificar que Root Directory = `/`
- ¿Error de Prisma? → Verificar que `infra/prisma/schema.prisma` existe

