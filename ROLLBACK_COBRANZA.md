# Plan de rollback – Contexto dinámico cobranza

**Si algo sale mal antes o durante la presentación al cliente**, seguí estos pasos para volver al estado estable.

---

## Opción 1: No tocaste nada / no hiciste merge

- **Deploy:** Seguí usando la rama **`main`** en Railway/Vercel.
- No hagas merge de `feature/cobranza-contexto-dinamico` a `main` hasta después de la presentación y de haber probado en staging.

---

## Opción 2: Implementaste en una rama (recomendado)

Si trabajaste en la rama **`feature/cobranza-contexto-dinamico`**:

### Volver a deployar solo `main` (estado estable)

```bash
# En Railway/Vercel: cambiar el branch de deploy a `main` (o volver a hacer deploy desde main)
# No hace falta tocar código.
```

- **Railway:** Proyecto → servicio → Settings → Source → Branch: `main` → Redeploy.
- **Vercel:** Proyecto → Settings → Git → Production Branch: `main` → redeploy desde main.

Así el cliente ve solo lo que está en `main` (sin el flujo nuevo de contexto dinámico).

### Descartar la rama y volver a main en tu repo

```bash
cd /Users/ralborta/Constanza
git checkout main
# Opcional: borrar la rama local si ya no la querés
# git branch -D feature/cobranza-contexto-dinamico
```

---

## Opción 3: Ya hiciste merge a main y deploy

Si ya mergeaste a `main` y desplegaste, para revertir:

```bash
cd /Users/ralborta/Constanza
git log --oneline -5   # Anotá el hash del ÚLTIMO commit ANTES del merge (ej. be23ab2)
git revert --no-commit <hash_del_merge>..HEAD   # Revierte hasta ese punto
# Revisá los archivos que cambiaron
git status
git commit -m "Rollback: revertir cobranza contexto dinámico para presentación"
git push origin main
```

Luego en Railway/Vercel: **Redeploy** desde `main`. Quedás de nuevo en el estado anterior al merge.

---

## Opción 4: Solo “apagar” la respuesta automática por BuilderBot

Si el backend nuevo ya está desplegado pero **no querés** que el notifier responda con IA por BuilderBot:

- En BuilderBot: **quitá o desactivá** la URL del webhook que apunta a `POST .../wh/wa/incoming`, **o**
- En el notifier (Railway): variable de entorno tipo `COBRANZA_IA_RESPONDER=false` (si la implementamos) para no llamar a OpenAI ni enviar por BuilderBot.

Así el webhook puede seguir registrando mensajes en Constanza pero sin respuesta automática.

---

## Commit “ancla” para rollback

Antes de implementar, el estado estable actual es:

- **Rama:** `main`
- **Último commit estable:** `be23ab2` — *feat: callbacks desde mensajes WA/Email + API contexto para agentes*

Para volver a ese estado exacto:

```bash
git checkout main
git reset --hard be23ab2   # Solo si no te importa perder commits locales después de ese
git push origin main --force   # Cuidado: reescribe historial en main
```

Mejor: usar **revert** (Opción 3) en lugar de `reset --force` si ya hay otros trabajando en el repo.

---

## Resumen rápido

| Situación | Qué hacer |
|-----------|-----------|
| Trabajás en rama, no mergeaste | Deploy desde `main`; no mergear la feature. |
| Mergeaste y desplegaste | `git revert` de los commits del feature + push + redeploy. |
| Solo querés apagar la IA en WhatsApp | Desactivar webhook en BuilderBot o variable `COBRANZA_IA_RESPONDER=false`. |

**Para la presentación de mañana:** lo más seguro es **deployar solo `main`** y dejar la feature en una rama hasta que la pruebes bien.

---

## Variables usadas por la feature (solo si deployás la rama)

- **api-gateway:** ninguna nueva (usa `AGENT_API_KEY` si ya la tenés para agent/context).
- **notifier:** `API_GATEWAY_URL` (URL del api-gateway), `AGENT_API_KEY` (misma que api-gateway, para GET /v1/cobranza/politicas), `OPENAI_API_KEY`, `BUILDERBOT_API_KEY`, `BUILDERBOT_BOT_ID`. Si faltan `API_GATEWAY_URL` o `AGENT_API_KEY`, el notifier **no** ejecuta el flujo de respuesta con IA (solo registra el mensaje como hasta ahora).
