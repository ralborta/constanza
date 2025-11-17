# 🖥️ Cómo Acceder al Railway Shell

## 📍 Ubicación del Shell en Railway

El Railway Shell es una terminal que te permite ejecutar comandos directamente en el contenedor de tu servicio en Railway.

## 🚀 Pasos para Acceder

### Opción 1: Desde el Dashboard de Railway (Recomendado)

1. **Ve a Railway Dashboard:**
   - Abre tu navegador y ve a: https://railway.app
   - Inicia sesión con tu cuenta

2. **Selecciona tu proyecto:**
   - En la lista de proyectos, haz click en tu proyecto (probablemente se llama "Constanza" o similar)

3. **Selecciona el servicio `api-gateway`:**
   - Verás una lista de servicios (api-gateway, web, etc.)
   - Haz click en el servicio **`api-gateway`**

4. **Abre el Shell:**
   - En la parte superior de la página del servicio, busca la pestaña **"Shell"** o **"Console"**
   - Haz click en ella
   - Se abrirá una terminal en el navegador

5. **¡Listo!** Ahora puedes ejecutar comandos directamente en el contenedor

### Opción 2: Desde el Menú del Servicio

1. En la página del servicio `api-gateway`
2. Busca en el menú lateral o superior:
   - **"Shell"**
   - **"Console"** 
   - **"Terminal"**
   - O un ícono de terminal (🖥️)

### Opción 3: Si No Encuentras el Shell

Algunas veces el shell puede estar en:
- **Settings** → **Shell**
- **Deployments** → **Shell** (en el deployment activo)
- Un botón con tres puntos (⋯) → **Open Shell**

## 📸 Ubicación Visual

```
Railway Dashboard
└── Tu Proyecto
    └── api-gateway (servicio)
        ├── Deployments (pestaña)
        ├── Metrics (pestaña)
        ├── Logs (pestaña)
        ├── Shell (pestaña) ← AQUÍ ESTÁ
        ├── Settings (pestaña)
        └── Variables (pestaña)
```

## ✅ Verificar que Estás en el Lugar Correcto

Una vez que abras el Shell, deberías ver algo como:

```bash
/app #
```

O:

```bash
root@container-id:/app#
```

## 🎯 Comandos que Deberías Ejecutar

Una vez en el Shell, ejecuta:

```bash
# 1. Verificar que estás en el lugar correcto
pwd
# Debería mostrar: /app o similar

# 2. Ir a la carpeta de Prisma
cd infra/prisma

# 3. Verificar que DATABASE_URL esté configurada
echo $DATABASE_URL

# 4. Ejecutar el seed
pnpm seed
```

## ⚠️ Si No Puedes Encontrar el Shell

### Alternativa: Usar Railway CLI

Si no encuentras el shell en el dashboard, puedes usar Railway CLI:

1. **Instalar Railway CLI:**
   ```bash
   npm i -g @railway/cli
   ```

2. **Iniciar sesión:**
   ```bash
   railway login
   ```

3. **Conectarte al servicio:**
   ```bash
   railway link
   railway shell
   ```

### O Ejecutar Comandos desde Local

Si tienes acceso a la base de datos desde tu máquina local:

```bash
# En tu terminal local (no Railway)
cd /Users/ralborta/Constanza

# Configurar DATABASE_URL (obtenerla de Railway → Variables)
export DATABASE_URL="postgresql://..."

# Ejecutar seed localmente
cd infra/prisma
pnpm seed
```

## 🔍 Buscar en Railway Dashboard

Si aún no encuentras el Shell:

1. **Busca un ícono de terminal** (🖥️ o similar) en la interfaz
2. **Revisa todas las pestañas** del servicio api-gateway
3. **Busca "Console", "Terminal", "Shell"** en el menú
4. **Revisa la documentación de Railway** si cambió la interfaz

## 📞 Si Nada Funciona

Puedes ejecutar los comandos desde tu máquina local si tienes la `DATABASE_URL`:

1. **Obtén DATABASE_URL de Railway:**
   - Railway → `api-gateway` → **Variables**
   - Copia el valor de `DATABASE_URL`

2. **Ejecuta localmente:**
   ```bash
   cd /Users/ralborta/Constanza
   export DATABASE_URL="tu-url-aqui"
   cd infra/prisma
   pnpm seed
   ```

## 💡 Tip

El Shell de Railway es básicamente una terminal dentro del contenedor donde corre tu aplicación. Es como tener acceso SSH al servidor, pero a través de la interfaz web de Railway.

