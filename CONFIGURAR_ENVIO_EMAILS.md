# 📧 Configuración de Envío de Emails

## ✅ Implementación Completada

Se ha implementado la funcionalidad completa de envío de emails con:

- ✅ Separación de responsabilidades (`renderTemplate()` vs `sendEmail()`)
- ✅ Template HTML profesional y responsive
- ✅ Resolución automática de variables desde la DB
- ✅ Manejo de errores semántico con códigos específicos
- ✅ Validaciones de configuración SMTP
- ✅ Soporte para Gmail y otros proveedores SMTP

---

## 🔧 Variables de Entorno Requeridas

En **Railway**, para el servicio `@constanza/notifier`, configura estas variables:

### Variables Obligatorias

```env
# Configuración SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password_de_gmail

# Remitente (opcional, usa SMTP_USER si no se especifica)
SMTP_FROM_EMAIL=noreply@constanza.com
SMTP_FROM_NAME=Constanza

# Redis (ya debería estar configurado)
REDIS_URL=redis://...

# Database (ya debería estar configurado)
DATABASE_URL=postgresql://...
```

### Para Gmail Específicamente

1. **Habilitar autenticación de 2 factores** en tu cuenta de Gmail
2. **Generar una App Password**:
   - Ve a: https://myaccount.google.com/apppasswords
   - Genera una contraseña de aplicación
   - Úsala como `SMTP_PASS`

**Ejemplo de configuración Gmail:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop  # App Password de 16 caracteres
SMTP_FROM_NAME=Constanza
```

---

## 🎨 Variables Disponibles en Templates

Cuando escribes un mensaje en el frontend, puedes usar estas variables:

### Variables Básicas (siempre disponibles)
- `{nombre_cliente}` - Nombre del cliente (razón social)
- `{fecha_actual}` - Fecha actual formateada

### Variables de Factura (si hay `invoiceId`)
- `{monto}` - Monto de la factura formateado (ej: "$1,234.56")
- `{numero_factura}` - Número de factura
- `{fecha_vencimiento}` - Fecha de vencimiento formateada

### Variables Personalizadas
Puedes pasar variables adicionales desde el frontend en el objeto `variables`:

```typescript
{
  customerIds: ['...'],
  channel: 'EMAIL',
  message: { text: 'Hola {nombre_cliente}, tu factura {numero_factura} vence el {fecha_vencimiento}' },
  variables: {
    link_pago: 'https://...',
    mensaje_personalizado: '...'
  },
  invoiceId: '...' // Opcional, pero recomendado para obtener datos automáticos
}
```

---

## 📋 Ejemplo de Uso desde Frontend

```typescript
// En apps/web/src/app/notify/page.tsx
const response = await api.post('/v1/notify/batch', {
  customerIds: ['uuid-cliente-1', 'uuid-cliente-2'],
  channel: 'EMAIL',
  message: {
    subject: 'Recordatorio de pago - Factura {numero_factura}',
    text: `Estimado/a {nombre_cliente},

Le recordamos que tiene una factura pendiente de pago.

Detalles:
- Factura: {numero_factura}
- Monto: {monto}
- Vencimiento: {fecha_vencimiento}

Por favor, realice el pago a la brevedad.

Saludos cordiales,
Equipo Constanza`
  },
  invoiceId: 'uuid-factura', // Opcional pero recomendado
  variables: {
    link_pago: 'https://pagar.constanza.com/...' // Opcional
  }
});
```

---

## 🏗️ Arquitectura

```
Frontend (apps/web)
    ↓ POST /v1/notify/batch
API Gateway (apps/api-gateway)
    ↓ POST /notify/send (a cada cliente)
Notifier Service (apps/notifier)
    ↓ BullMQ Queue (Redis)
Worker (procesa uno por uno)
    ↓ renderEmailTemplate() → resuelve variables desde DB
    ↓ sendEmail() → envía por SMTP
SMTP Server (Gmail/SendGrid/etc)
    ↓ Email enviado
```

---

## 🎯 Template HTML

El sistema genera automáticamente un email HTML profesional con:

- ✅ Header con logo/nombre de empresa
- ✅ Cuerpo del mensaje con formato preservado
- ✅ Footer con información de contacto
- ✅ Diseño responsive (funciona en móviles)
- ✅ Compatible con clientes de email (Gmail, Outlook, etc.)
- ✅ Preheader text (texto que se ve antes de abrir)

---

## ⚠️ Manejo de Errores

El sistema detecta y reporta errores específicos:

- `ERROR_SMTP_CONFIG_MISSING` - Faltan variables de entorno
- `ERROR_SMTP_AUTH_FAILED` - Error de autenticación
- `ERROR_INVALID_RECIPIENT` - Email inválido
- `ERROR_SMTP_CONNECTION_FAILED` - Error de conexión
- `ERROR_SMTP_SEND_FAILED` - Error al enviar
- `ERROR_RATE_LIMIT` - Límite de envío alcanzado (Gmail tiene límites)

Todos los errores se registran en `contact.events` con `status: 'FAILED'` y `errorReason`.

---

## 🚀 Próximos Pasos (Roadmap)

Para llevar esto a nivel "plataforma seria", se pueden agregar:

1. **Capas de prioridad** - Separar colas para emails críticos vs masivos
2. **Dead-letter Queue** - Para emails que fallan después de X reintentos
3. **Tabla de logs de email** - `email_logs` con métricas detalladas
4. **Lista de supresión** - `email_suppression_list` para bajas/bounces
5. **Interfaz de proveedor genérica** - Para migrar de SMTP a SendGrid/Resend sin romper nada
6. **Templates multi-tenant** - Branding por cliente
7. **Métricas de apertura/clicks** - Con webhooks de proveedores
8. **Modo test** - Enviar prueba antes del batch

---

## 📝 Notas Importantes

- **Gmail tiene límites**: ~500 emails/día para cuentas gratuitas, ~2000 para Workspace
- **Para producción**, considera usar SendGrid, Mailgun, o Resend
- **SPF/DKIM/DMARC**: Configura estos registros DNS para mejor entregabilidad
- **Rate limiting**: El sistema procesa emails uno por uno para no saturar SMTP

---

## ✅ Checklist de Configuración

- [ ] Variables SMTP configuradas en Railway (`notifier` service)
- [ ] App Password de Gmail generada (si usas Gmail)
- [ ] `REDIS_URL` configurada
- [ ] `DATABASE_URL` configurada
- [ ] Probar envío de un email de prueba desde el frontend
- [ ] Verificar logs en Railway para confirmar envío exitoso

---

## 🐛 Troubleshooting

### Error: "ERROR_SMTP_AUTH_FAILED"
- Verifica que `SMTP_PASS` sea una App Password (no tu contraseña normal)
- Asegúrate de que la autenticación de 2 factores esté habilitada

### Error: "ERROR_RATE_LIMIT"
- Gmail limita el número de emails por día
- Considera usar un proveedor profesional para producción

### Emails no llegan
- Revisa la carpeta de spam
- Verifica que el email del destinatario sea válido
- Revisa los logs en Railway para ver el error específico

---

**Última actualización**: Implementación v1 completa y funcional ✅

