# Plantilla Excel para Cargar Clientes

## Formato del Archivo

El archivo Excel debe tener las siguientes columnas (en la primera fila):

| Código Único | Razón Social | Email | Teléfono | CUIT | Código Venta |
|--------------|--------------|-------|----------|------|---------------|
| CLI-001 | Acme Inc | acme@example.com | +5491123456789 | 20123456789 | 000 |
| CLI-002 | Tech Solutions LLC | tech@example.com | +5491198765432 | 20987654321 | 000 |
| CLI-003 | Global Exports | global@example.com | +5491155555555 | 20555555555 | 000 |

## Columnas

- **Código Único** (requerido): Código único interno del cliente
- **Razón Social** (requerido): Nombre de la empresa
- **Email** (requerido): Email del cliente (debe ser único)
- **Teléfono** (opcional): Número de teléfono con código de país
- **CUIT** (opcional): CUIT del cliente
- **Código Venta** (opcional): Código de venta, por defecto "000"

## Notas

- La primera fila debe contener los encabezados
- Los campos requeridos no pueden estar vacíos
- El email debe tener formato válido
- Si un cliente ya existe (por código único o email), se omite

