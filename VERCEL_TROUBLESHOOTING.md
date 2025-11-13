# 🔧 Troubleshooting Vercel Build

## Error Actual

```
ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL @constanza/web@1.0.0 build: `next build`
Error: Command "cd ../.. && pnpm install && pnpm --filter @constanza/web build" exited with 1
```

## Configuración Recomendada en Vercel

### Settings → Build & Development Settings

1. **Root Directory:** `apps/web` ✅

2. **Install Command (Override: OFF):**
   - Dejar vacío (Vercel detectará automáticamente)
   - O si necesitas custom:
     ```
     cd ../.. && pnpm install --frozen-lockfile
     ```

3. **Build Command (Override: ON):**
   ```
   pnpm run vercel-build
   ```
   
   **O directamente:**
   ```
   cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @constanza/web build
   ```

4. **Output Directory:** `.next` (o dejar default)

5. **"Include files outside root directory":** Enabled ON ✅

## Verificar Logs Completos

Para diagnosticar el problema, necesitamos ver:

1. **Los logs completos del build** (no solo el error final)
2. **Especialmente:**
   - ¿Se ejecuta `pnpm install` correctamente?
   - ¿Qué error específico muestra Next.js?
   - ¿Hay errores de TypeScript o de dependencias?

## Posibles Causas

1. **Dependencias no instaladas correctamente:**
   - Verificar que `pnpm-lock.yaml` esté commiteado
   - Verificar que `packageManager: "pnpm@9.12.0"` esté en root `package.json`

2. **Problema con el filtro de pnpm:**
   - El workspace puede no estar configurado correctamente
   - Verificar `pnpm-workspace.yaml`

3. **Problema con Next.js build:**
   - Puede haber un error en el código que no aparece en los logs cortos
   - Verificar que el build funcione localmente

## Próximos Pasos

1. **En Vercel, expandir los logs completos del build**
2. **Buscar el primer error** (no solo el último)
3. **Compartir las primeras 50-100 líneas de los logs** para diagnóstico

## Build Local (Para Comparar)

```bash
cd /Users/ralborta/Constanza
pnpm install --frozen-lockfile
pnpm --filter @constanza/web build
```

Si esto funciona localmente pero falla en Vercel, el problema es de configuración de Vercel, no del código.

