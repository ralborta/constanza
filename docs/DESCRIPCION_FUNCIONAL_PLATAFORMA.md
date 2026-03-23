# Constanza — Descripción funcional de la plataforma

## Qué es

**Constanza** es una plataforma de **gestión de cobranzas** orientada a equipos que administran facturación, seguimiento de deudores y cobro de facturas. Centraliza operación diaria, comunicación con clientes y visibilidad financiera en un solo entorno, con **separación por empresa** (cada organización ve solo sus propios datos).

---

## Operaciones

- **Panel de control** — Resumen de indicadores clave (facturas abiertas, métricas de interacción, etc.).
- **Facturas** — Alta, consulta y seguimiento de comprobantes; carga manual o por archivos según la configuración del entorno.
- **Clientes** — Cartera de deudores: datos de contacto, identificadores de negocio y vínculo con facturas.
- **Ingresos por transferencias bancarias** — Visualización de **pagos recibidos por transferencia**, con referencias, montos y estado (aplicado, pendiente de liquidación, etc.). La plataforma puede integrarse con **interconexión bancaria** (notificaciones automáticas de depósitos entrantes) para reflejar esos movimientos sin carga manual repetitiva.
- **Eventos y trabajos programados** — Soporte para tareas de fondo y procesos batch según la implementación desplegada.

---

## Finanzas y conciliación

- **Transferencias bancarias** — Listado de ingresos por transferencia, con posibilidad de vincularlos a facturas cuando corresponda.
- **Conciliación de pagos** — Herramientas para **imputar** pagos a facturas cuando el movimiento llegó sin asignación automática, manteniendo trazabilidad entre cobro y documento.

---

## Comunicaciones

- **Envío de mensajes** — Notificaciones masivas o puntuales a clientes (por lotes, con seguimiento de progreso).
- **Llamadas** — Carga de lotes, ejecución de campañas y listados de contactos según el flujo configurado.

---

## Administración (según perfil)

- **Usuarios internos** — Alta y edición de cuentas del equipo, **perfiles** (administrador u operadores con distintos niveles de acceso) y **empresa** asociada a cada usuario, de modo que cada persona vea solo la información de su organización.
- **Ajustes de empresa** — Parámetros propios del tenant (por ejemplo, datos usados para validar ingresos contra la cuenta de cobro configurada en la **interconexión bancaria**).

---

## Enfoque de seguridad y multi-empresa

- Los datos se **aislan por empresa**: usuarios, clientes, facturas y pagos pertenecen a un único contexto organizacional.
- El acceso se controla con **autenticación** y **roles**, de forma que no todas las funciones estén disponibles para todos los perfiles.

---

## Resumen en una frase

Constanza permite **operar cobranzas de punta a punta**: desde la factura y el cliente hasta el **reconocimiento del pago vía banco** y la **conciliación** con la factura correspondiente, con comunicación al deudor y administración centralizada del equipo.
