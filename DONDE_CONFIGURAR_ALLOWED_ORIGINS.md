# 📍 Dónde Configurar ALLOWED_ORIGINS

## ✅ Ubicación Exacta

**Railway Dashboard → `@constanza/api-gateway` → Variables**

## 🔧 Pasos Detallados

### Paso 1: Ir a Railway

1. Abre: https://railway.app
2. Inicia sesión
3. Selecciona tu proyecto

### Paso 2: Abrir el Servicio api-gateway

1. Click en el servicio **`@constanza/api-gateway`**
2. Deberías ver las pestañas: Deployments, Variables, Metrics, Logs, Settings

### Paso 3: Ir a Variables

1. Click en la pestaña **"Variables"**
2. Verás una lista de variables de entorno

### Paso 4: Buscar o Crear ALLOWED_ORIGINS

1. Busca la variable `ALLOWED_ORIGINS` en la lista
2. Si existe, haz click en ella para editarla
3. Si NO existe, haz click en **"+ New Variable"** o **"Add Variable"**

### Paso 5: Configurar el Valor

**Opción A: Permitir Todos (Más Fácil)**

1. **Name:** `ALLOWED_ORIGINS`
2. **Value:** `*`
3. Click en **"Save"** o **"Add"**

**Opción B: URLs Específicas**

1. **Name:** `ALLOWED_ORIGINS`
2. **Value:** 
   ```
   https://constanza-web.vercel.app,https://constanza-md9dafwl6-nivel-41.vercel.app,https://constanza-web-git-main-nivel-41.vercel.app,https://constanza-mxviqgdsy-nivel-41.vercel.app
   ```
   (Todas las URLs separadas por comas, sin espacios)
3. Click en **"Save"** o **"Add"**

### Paso 6: Verificar

Después de guardar, deberías ver `ALLOWED_ORIGINS` en la lista de variables con el valor que configuraste.

## 📋 Resumen Visual

```
Railway Dashboard
  └── Tu Proyecto
      └── @constanza/api-gateway (servicio)
          └── Variables (pestaña) ← AQUÍ
              └── ALLOWED_ORIGINS (variable)
                  └── Value: * (o las URLs)
```

## ⚠️ Importante

- **NO** en Vercel (eso es para `NEXT_PUBLIC_API_URL`)
- **SÍ** en Railway → `api-gateway` → Variables
- Railway hará **redeploy automáticamente** después de agregar/cambiar la variable

## 🎯 Recomendación

Para probar rápido, usa `*` en `ALLOWED_ORIGINS`. Una vez que funcione, puedes cambiarlo a URLs específicas para mayor seguridad.





