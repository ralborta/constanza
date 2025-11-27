# 🔍 Verificar Logs de Railway - Paso Crítico

## ⚠️ Necesito que Revises los Logs

Para identificar el problema exacto, necesito que revises los logs de Railway.

## 📋 Pasos para Obtener los Logs

### Paso 1: Abrir Logs

1. Railway Dashboard → `@constanza/api-gateway`
2. Click en la pestaña **"Logs"**
3. Busca los mensajes más recientes (los últimos 50-100 líneas)

### Paso 2: Buscar Estos Mensajes Específicos

**Busca estos mensajes (copiar y pegar aquí):**

1. **Al iniciar el servicio:**
   - `🚀 API Gateway running on...`
   - `Registering customer routes including /customers/upload`
   - Cualquier mensaje de error en rojo

2. **Errores de conexión:**
   - `Error connecting to database`
   - `Cannot connect to database`
   - `DATABASE_URL not found`
   - `P1000` o `P1001` (errores de Prisma)

3. **Errores de módulos:**
   - `Cannot find module`
   - `Module not found`
   - `Error loading`

4. **Errores de rutas:**
   - `Route not found`
   - `404`
   - `405`

### Paso 3: Verificar Estado del Servicio

1. En la parte superior del servicio, verifica el estado:
   - **"Running"** ✅
   - **"Stopped"** ❌
   - **"Error"** ❌

### Paso 4: Verificar Variables

1. Railway Dashboard → `@constanza/api-gateway` → **Variables**
2. Verifica que exista `DATABASE_URL`
3. Copia el valor (enmascarando la contraseña):
   ```
   DATABASE_URL=postgresql://postgres:***@postgres.railway.internal:5432/railway
   ```

## 🎯 Información que Necesito

Por favor, comparte:

1. **Estado del servicio**: Running / Stopped / Error
2. **Últimos 20-30 líneas de los logs** (especialmente errores)
3. **¿Existe DATABASE_URL en Variables?** Sí / No
4. **¿Qué commit está deployado?** (ve a Deployments y mira el commit SHA)

## 🚨 Posibles Problemas y Soluciones

### Problema 1: Servicio No Inicia

**Síntomas**: Logs muestran errores al iniciar, servicio en estado "Error"

**Solución**: 
- Verificar `DATABASE_URL` está configurada
- Verificar que no haya errores de sintaxis en el código
- Revisar logs completos para el error específico

### Problema 2: DATABASE_URL No Configurada

**Síntomas**: Logs muestran "DATABASE_URL not found" o errores P1000/P1001

**Solución**:
1. Railway → `@constanza/api-gateway` → Variables
2. Agregar `DATABASE_URL` con valor:
   ```
   postgresql://postgres:CIcAzTslXvtZkhMeumvOFPOPHzLNYpXf@postgres.railway.internal:5432/railway
   ```
3. Railway hará redeploy automáticamente

### Problema 3: Código No Se Deployó

**Síntomas**: El commit deployado es viejo (no `f956ae9`)

**Solución**:
1. Deployments → Seleccionar commit `f956ae9` o `Latest`
2. Click en "Redeploy"

### Problema 4: Rutas No Se Registran

**Síntomas**: No aparece "Registering customer routes" en los logs

**Solución**: 
- Verificar que el código se deployó correctamente
- Revisar que no haya errores de importación
- Verificar que el servicio esté corriendo

## 📞 Comparte los Logs

Una vez que tengas los logs, compártelos aquí para identificar el problema exacto.





