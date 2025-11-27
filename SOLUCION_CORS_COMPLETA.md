# ✅ Solución Completa: Error CORS y 404/405

## 🔍 Problemas Identificados

1. **CORS bloqueado**: El servidor no está enviando `Access-Control-Allow-Origin`
2. **URL incorrecta**: Aparece `/app/v1/` en algunos errores

## ✅ Cambios en el Código (Ya Aplicados)

He corregido el código para:
- Configurar `helmet` con `crossOriginResourcePolicy: 'cross-origin'`
- Agregar `credentials: true` a CORS

**Commit:** `7bbc5f4` - "fix: configurar CORS correctamente para permitir requests desde Vercel"

## 🔧 Configuración Necesaria en Railway

### Paso 1: Configurar ALLOWED_ORIGINS

1. Railway Dashboard → `@constanza/api-gateway` → **Variables**
2. Busca o crea `ALLOWED_ORIGINS`
3. El valor debe ser la URL de tu app en Vercel, por ejemplo:
   ```
   https://constanza-web.vercel.app,https://constanza-c81eet8oh-nivel-41.vercel.app
   ```
   (Agrega todas las URLs de Vercel que uses, separadas por comas)

**O si quieres permitir todos los orígenes temporalmente:**
```
*
```

### Paso 2: Verificar DATABASE_URL

1. Railway → `@constanza/api-gateway` → **Variables**
2. Verifica que exista `DATABASE_URL`:
   ```
   DATABASE_URL=postgresql://postgres:CIcAzTslXvtZkhMeumvOFPOPHzLNYpXf@postgres.railway.internal:5432/railway
   ```

### Paso 3: Redeploy

Después de agregar `ALLOWED_ORIGINS`:
1. Railway hará redeploy automáticamente
2. O haz redeploy manual: Deployments → Redeploy

## 🔍 Sobre la URL `/app/v1/`

Si ves `/app/v1/` en los errores, puede ser:
1. Un problema de caché del navegador
2. Una configuración incorrecta en Vercel

**Solución:**
1. Limpia la caché del navegador (Ctrl+Shift+R o Cmd+Shift+R)
2. Verifica que `NEXT_PUBLIC_API_URL` en Vercel sea:
   ```
   https://constanzaapi-gateway-production.up.railway.app
   ```
   (Sin `/app` ni `/v1` al final)

## 📋 Checklist Completo

- [ ] Código corregido (commit `7bbc5f4` subido a GitHub)
- [ ] `ALLOWED_ORIGINS` configurada en Railway api-gateway
- [ ] `DATABASE_URL` configurada en Railway api-gateway
- [ ] `NEXT_PUBLIC_API_URL` configurada en Vercel (sin `/app` ni `/v1`)
- [ ] Railway hizo redeploy después de agregar `ALLOWED_ORIGINS`
- [ ] Vercel hizo redeploy después de configurar `NEXT_PUBLIC_API_URL`
- [ ] Caché del navegador limpiada

## 🎯 Próximos Pasos

1. **Agregar `ALLOWED_ORIGINS` en Railway** con la URL de Vercel
2. **Esperar el redeploy** (2-3 minutos)
3. **Probar de nuevo** cargar el archivo
4. Si sigue fallando, **limpiar caché del navegador**

## 💡 Nota sobre ALLOWED_ORIGINS

Si no configuras `ALLOWED_ORIGINS`, el código usa `'*'` por defecto, pero `helmet` puede estar bloqueando. Con la corrección que hice, debería funcionar incluso con `'*'`, pero es mejor configurar los orígenes específicos para mayor seguridad.





