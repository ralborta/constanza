# Formatos Excel para Carga de Datos

## 1. Carga de Clientes

### Endpoint
`POST /v1/customers/upload`

### Formato del Archivo Excel

| Código Único | Razón Social | Email | Teléfono | CUIT | Código Venta |
|--------------|--------------|-------|----------|------|---------------|
| CLI-001 | Acme Inc | acme@example.com | +5491123456789 | 20123456789 | 000 |
| CLI-002 | Tech Solutions LLC | tech@example.com | +5491198765432 | 20987654321 | 000 |

### Columnas

- **Código Único** (requerido): Código único interno del cliente
- **Razón Social** (requerido): Nombre de la empresa
- **Email** (requerido): Email del cliente (debe ser único)
- **Teléfono** (opcional): Número de teléfono con código de país
- **CUIT** (opcional): CUIT del cliente
- **Código Venta** (opcional): Código de venta, por defecto "000"

### Notas

- La primera fila debe contener los encabezados
- Los campos requeridos no pueden estar vacíos
- El email debe tener formato válido
- Si un cliente ya existe (por código único o email), se omite

---

## 2. Carga de Facturas

### Endpoint
`POST /v1/invoices/upload`

### Formato del Archivo Excel

| Código Cliente | Número Factura | Monto | Fecha Vencimiento | Estado |
|----------------|----------------|-------|-------------------|--------|
| CLI-001 | FAC-001 | 120000 | 31/12/2025 | ABIERTA |
| CLI-002 | FAC-002 | 50000 | 15/01/2026 | ABIERTA |

**Alternativas para identificar cliente:**
- Puedes usar **CUIT Cliente** o **Email Cliente** en lugar de Código Cliente

### Columnas

- **Código Cliente** (requerido*): Código único del cliente
  - *Alternativas: CUIT Cliente o Email Cliente
- **Número Factura** (requerido): Número único de la factura
- **Monto** (requerido): Monto en pesos (ej: 1200.50 = $1,200.50)
- **Fecha Vencimiento** (requerido): Fecha en formato DD/MM/YYYY o YYYY-MM-DD
- **Estado** (opcional): ABIERTA, PARCIAL o SALDADA (por defecto: ABIERTA)

### Notas

- La primera fila debe contener los encabezados
- El monto se puede escribir con punto o coma decimal (1200.50 o 1200,50)
- La fecha puede venir en formato DD/MM/YYYY, YYYY-MM-DD o como número de Excel
- Si una factura ya existe (por número), se omite
- El cliente debe existir previamente en el sistema

### Ejemplo Completo

| Código Cliente | Número Factura | Monto | Fecha Vencimiento | Estado |
|----------------|----------------|-------|-------------------|--------|
| CLI-001 | FAC-2025-001 | 125000.50 | 31/12/2025 | ABIERTA |
| CLI-001 | FAC-2025-002 | 87500 | 15/01/2026 | ABIERTA |
| CLI-002 | FAC-2025-003 | 50000.75 | 20/01/2026 | ABIERTA |

---

## Flujo Recomendado

1. **Primero**: Cargar clientes desde Excel (`/customers`)
2. **Segundo**: Cargar facturas desde Excel (`/invoices`)

Esto asegura que todos los clientes existan antes de crear las facturas.

