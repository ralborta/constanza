# 🌱 Ejecutar Seed desde Railway

## Paso 1: Configurar Variable de Entorno en Railway

1. Ve a Railway Dashboard → Servicio `api-gateway`
2. Settings → Variables
3. Agregar nueva variable:
   - **Key:** `SEED_SECRET`
   - **Value:** `constanza-seed-2025` (o cualquier string secreto que quieras)
4. Guardar

## Paso 2: Esperar a que el servicio se redeploye

Railway debería detectar el nuevo commit automáticamente y hacer redeploy. Si no, haz "Redeploy" manualmente.

## Paso 3: Ejecutar el Seed

Una vez que el servicio esté corriendo, ejecuta este comando desde tu terminal:

```bash
curl -X POST https://api-gateway-production.up.railway.app/seed \
  -H "Content-Type: application/json" \
  -H "x-seed-secret: constanza-seed-2025"
```

**Reemplaza:**
- `https://api-gateway-production.up.railway.app` con la URL real de tu API Gateway en Railway
- `constanza-seed-2025` con el valor que pusiste en `SEED_SECRET`

## Respuesta Esperada

Si todo funciona, deberías recibir:

```json
{
  "success": true,
  "message": "Seed ejecutado exitosamente",
  "credentials": {
    "admin": {
      "email": "admin@constanza.com",
      "password": "admin123"
    },
    "operador": {
      "email": "operador1@constanza.com",
      "password": "operador123"
    },
    "cliente": {
      "email": "cliente@acme.com",
      "password": "cliente123"
    }
  }
}
```

## Obtener la URL del API Gateway

1. Ve a Railway Dashboard → Servicio `api-gateway`
2. Settings → Domains
3. Copia la URL (ej: `api-gateway-production.up.railway.app`)
4. Úsala en el comando curl

## Seguridad

- El endpoint está protegido con `SEED_SECRET`
- Solo funciona si el header `x-seed-secret` coincide con la variable de entorno
- **Recomendación:** Después de ejecutar el seed, puedes eliminar o cambiar el `SEED_SECRET` para deshabilitar el endpoint

## Alternativa: Desde el navegador (Postman/Insomnia)

Si prefieres usar una herramienta GUI:

1. **URL:** `https://tu-api-gateway.railway.app/seed`
2. **Method:** POST
3. **Headers:**
   - `Content-Type: application/json`
   - `x-seed-secret: constanza-seed-2025` (o el valor que configuraste)
4. Click en "Send"

