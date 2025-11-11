# 📝 Crear Repositorio en GitHub - Pasos Manuales

## Opción 1: Con GitHub CLI (si lo tienes instalado)

```bash
# Instalar GitHub CLI (si no lo tienes)
brew install gh

# Autenticarte
gh auth login

# Crear y subir (ejecuta este script)
./crear-y-subir.sh
```

## Opción 2: Manual (Recomendado - 2 minutos)

### Paso 1: Crear Repositorio

1. Ve a: **https://github.com/new**
2. **Repository name**: `constanza`
3. **Description**: `Sistema de Cobranzas B2B Omnicanal`
4. **Público** ✅ (marca Public)
5. **NO marques** ninguna de estas opciones:
   - ❌ Add a README file
   - ❌ Add .gitignore
   - ❌ Choose a license
6. Click en **"Create repository"**

### Paso 2: Subir Código

Abre tu terminal y ejecuta:

```bash
cd /Users/ralborta/Constanza

# El remote ya está configurado, solo haz push
git push -u origin main
```

### Paso 3: Verificar

Ve a: **https://github.com/ralborta/constanza**

Deberías ver todos tus archivos ahí.

---

## ✅ Listo!

Una vez creado, puedes:
- Ver el código en GitHub
- Configurar Secrets para CI/CD
- Conectar Railway y Vercel

