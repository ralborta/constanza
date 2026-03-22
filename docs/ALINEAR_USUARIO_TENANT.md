# Alinear tu usuario con la empresa que cobra (Revolucia, etc.)

## No hace falta crear “cliente Revolucia”

- **Empresa que cobra** (Revolucia) = **tenant** en Constanza (`core.tenants`). Ahí viven facturas y pagos de **esa** empresa.
- **Clientes** en `core.customers` = quienes **deben** o a quienes se les factura. No es lo mismo que la empresa que usa la app.

Para **ver transferencias / ingresos Cresium**, tu usuario (`core.users`) tiene que tener el mismo **`tenant_id`** que los registros en `pay.payments` (y que `CRESIUM_TENANT_ID` en rail-cucuru para los depósitos nuevos).

## Si no podés crear usuarios desde la app

Alguien con acceso a **Postgres** (consola Railway, Supabase SQL, etc.) puede ejecutar el script paso a paso:

[`../scripts/alinear-usuario-misma-empresa-que-pagos.sql`](../scripts/alinear-usuario-misma-empresa-que-pagos.sql)

Resumen:

1. Ver el UUID del tenant de Revolucia (o el que corresponda) en `core.tenants`.
2. Confirmar en qué `tenant_id` están los pagos Cresium (`pay.payments`).
3. Hacer **un** `UPDATE` en `core.users` poniendo tu `email` y ese `tenant_id`.
4. **Cerrar sesión y volver a entrar** en la web (el JWT se renueva con el tenant nuevo).

## Alternativa sin tocar el usuario

En **Railway → rail-cucuru**, definir `CRESIUM_TENANT_ID` = el mismo UUID que tu sesión (`GET /auth/me` o `core.users.tenant_id` de tu mail). Así los **nuevos** webhooks entran al tenant correcto; los pagos **viejos** con otro tenant pueden requerir `UPDATE` en `pay.payments` o dejarlos.

---

*Desarrollo local: no podemos ejecutar SQL en tu base de producción desde el repo; esto es la guía para quien tenga credenciales.*
