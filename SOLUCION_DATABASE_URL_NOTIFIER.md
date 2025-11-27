# 🔧 Solución: Falta `DATABASE_URL` en `notifier`

## ⚠️ Problema Detectado

Los logs muestran:
```
Environment variable not found: DATABASE_URL.
Failed to send notification
```

**El `notifier` NO puede conectarse a la base de datos porque falta `DATABASE_URL`.**

---

## ✅ Solución Paso a Paso

### Paso 1: Obtener `DATABASE_URL` del Servicio Postgres

**Railway Dashboard** → Servicio `Postgres` → **Variables**

**Busca:**
- `DATABASE_URL` (nombre más común)
- O `POSTGRES_URL` (si Railway usa ese nombre)

**Copia el valor completo.** Debe verse algo así:
```
postgresql://postgres:PASSWORD@postgres-production-cf3ac.up.railway.app:5432/railway
```

---

### Paso 2: Configurar `DATABASE_URL` en el `notifier`

**Railway Dashboard** → `@constanza/notifier` → **Variables**

1. Busca si existe `DATABASE_URL`
2. **Si NO existe:**
   - Click en **"+ New Variable"** o **"Add Variable"**
   - Name: `DATABASE_URL`
   - Value: (pega el valor que copiaste del servicio Postgres)
   - Click en **"Add"** o **"Save"**

3. **Si SÍ existe pero está vacía o incorrecta:**
   - Click en `DATABASE_URL`
   - Edita el valor
   - Pega el valor correcto del servicio Postgres
   - Guarda

---

### Paso 3: Redeploy el `notifier`

**Railway Dashboard** → `@constanza/notifier` → **Deployments**

1. Click en **"Redeploy"** o **"New Deployment"**
2. Selecciona el commit más reciente
3. Click en **"Deploy"**
4. **Espera 2-3 minutos**

---

### Paso 4: Verificar que Funcionó

**Railway Dashboard** → `@constanza/notifier` → **Logs**

**Al inicio del servicio deberías ver:**
```
🚀 Notifier running on http://0.0.0.0:3001
✅ Redis connected
✅ Database connected  ← ESTO DEBE APARECER (sin errores)
📬 Worker started, processing notifications...
```

**Cuando intentes enviar un mensaje, deberías ver:**
```
Processing notification
Notification sent successfully  ← Sin errores de DATABASE_URL
```

---

## 🎯 Formato Correcto de `DATABASE_URL`

**✅ Correcto:**
```
postgresql://postgres:PASSWORD@postgres-production-cf3ac.up.railway.app:5432/railway
```

**❌ Incorrecto:**
```
postgres://...  (debe ser postgresql://)
DATABASE_URL=postgresql://...  (no incluyas el nombre de la variable)
```

---

## 📋 Checklist

- [ ] Obtener `DATABASE_URL` del servicio Postgres en Railway
- [ ] Configurar `DATABASE_URL` en `@constanza/notifier` → Variables
- [ ] Guardar la variable
- [ ] Redeploy el `notifier`
- [ ] Verificar logs (debe decir "Database connected" sin errores)
- [ ] Probar envío de email de nuevo

---

## 🚀 Acción Inmediata

1. **Railway** → Servicio `Postgres` → Variables → Copiar `DATABASE_URL`
2. **Railway** → `@constanza/notifier` → Variables → Agregar/Editar `DATABASE_URL`
3. **Railway** → `@constanza/notifier` → Deployments → Redeploy
4. **Espera 2-3 minutos**
5. **Verifica logs** (debe decir "Database connected")

---

**Con `DATABASE_URL` configurada correctamente, el error desaparecerá y los mensajes se enviarán correctamente.**




