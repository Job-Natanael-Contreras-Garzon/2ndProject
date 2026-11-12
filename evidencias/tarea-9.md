# Tarea 9 – Analítica y calificar un intercambio

Grupo: Job Natanael Contreras Garzon y Eudenia Flores Gandira

## Parte 1: Analítica

**Eventos del flujo principal (publicar un objeto)**

| Evento | Cuándo se dispara |
|---|---|
| `publicacion_iniciada` | Al tocar «Nueva publicación» en Mis publicaciones |
| `publicacion_guardada` | Solo después de que la publicación se guardó bien |

- `track()` guarda cada evento en la tabla `eventos` (con nombre, datos mínimos y fecha) y también lo manda a Google Analytics 4 (`gtag`).
- El panel `/analitica` cuenta los eventos y muestra el % de publicaciones que terminan.
- Prueba: `frontend/src/__tests__/analitica.spec.js` (una por evento y una para Google Analytics).
- Capturas: `evidencias/sitio_web.png` (panel) y `evidencias/google_analitics.png` (Google Analytics en tiempo real).

**Datos que decidimos NO recopilar**
- Email, nombre del usuario, título y descripción de la publicación: identifican a la persona o son texto escrito por ella. `track()` los borra antes de guardar o enviar.
- Solo guardamos categoría y condición, que salen de listas fijas y bastan para responder la pregunta.

## Parte 2: Calificar un intercambio

**Reglas**
- Solo se califica un intercambio **completado**.
- Cada parte califica a la otra **una vez**, de 1 a 5, con comentario opcional.
- El perfil (`GET /api/profile`) muestra el promedio y la cantidad de calificaciones recibidas.

**Cómo se hizo**
- Backend: `POST /api/posts/:id/calificacion`, tabla `calificaciones`, reglas en `rules/calificacionRules.js`.
- Front: en **Historial**, al abrir un «intercambio completado» aparece el formulario (puntaje 1–5 y comentario opcional). El **Perfil** (menú «Perfil») muestra el promedio y la cantidad.
- Eventos nuevos: `calificacion_iniciada` (se abre el formulario) y `calificacion_enviada` (se guardó la calificación).
- Se rechaza: intercambio no completado o cancelado, segunda calificación, puntaje fuera de 1–5 y personas ajenas al intercambio.

**Pruebas**
- Backend (Jest): `backend/tests/calificacion.test.js`.
- E2E (Playwright): `tests/calificar-intercambio.spec.js`
  1. Ambas partes califican y se rechaza la segunda calificación.
  2. Se rechaza calificar un intercambio cancelado.
