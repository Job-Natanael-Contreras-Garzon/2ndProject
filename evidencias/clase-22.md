# Clase 22 · Patrones oscuros

Integrantes: Job Natanael Contreras Garzon y Eudenia Flores Gandira
Modalidad: con IA

## 1. Patrón encontrado
- **Tipo (de los seis):** Confirmaciones engañosas / Asimetría visual (peso visual desigual entre salir y quedarse).
- **Dónde:** Modal «Cancelar intercambio» (`frontend/src/components/CancelExchangeForm.vue:101-104`), abierto desde Explorar (`DashboardView.vue`) y Mis publicaciones (`UserPostsView.vue`).
- **Por qué es un patrón oscuro:** En el formulario de confirmación, la acción segura (`Volver`) tenía `btn btn-ghost` (texto plano de bajo contraste sin borde), mientras que la acción destructiva e irreversible (`Cancelar intercambio`) tenía `btn btn-error text-white` (botón sólido de alto contraste). Esto rompe la prueba de simetría visual y destaca la acción peligrosa frente a la salida segura.

## 2. Antes
```html
<!-- frontend/src/components/CancelExchangeForm.vue:101-104 -->
<div class="modal-action mt-2">
    <button type="button" @click="emit('cancel')" :disabled="submitting" class="btn btn-ghost">Volver</button>
    <button type="submit" :disabled="submitting" class="btn btn-error text-white">Cancelar intercambio</button>
</div>
```

## 3. Después
```html
<!-- frontend/src/components/CancelExchangeForm.vue:101-104 -->
<div class="modal-action mt-2">
    <button type="button" @click="emit('cancel')" :disabled="submitting" class="btn btn-outline">Volver</button>
    <button type="submit" :disabled="submitting" class="btn btn-outline">Cancelar intercambio</button>
</div>
```
- **Commit:** `bb2f145` (`fix(etica): igualar peso visual al cancelar intercambio`)

## 4. Principio aplicado
- **Nielsen #5 – Prevención de errores** y **Prueba de simetría visual**: los botones dicen claramente lo que hacen (`Volver` / `Cancelar intercambio`), la acción irreversible no se destaca visualmente sobre la opción segura y ambas opciones tienen exactamente el mismo peso visual (`btn btn-outline`), sin agregar pasos o confirmaciones extra («¿Seguro?»).

## 5. Prueba
- **Prueba unitaria (Vitest):** `los botones Volver y Cancelar intercambio tienen el mismo peso visual sin destacar la acción destructiva` en `frontend/src/__tests__/CancelExchangeForm.spec.js`.
  - **Antes:** FALLA (`AssertionError: expected [ 'btn', 'btn-ghost' ] to include 'btn-outline'`).
  - **Después:** PASA (14/14 tests en 3 archivos con `npm --prefix frontend run test:unit -- --run`).
- **Prueba E2E (Playwright):** `Volver y Cancelar intercambio tienen el mismo peso visual en el modal` en `tests/etica-cancelar-simetria.spec.js`.
  - **Antes:** FALLA (`Expected pattern: /btn-outline/, Received string: "btn btn-ghost"`).
  - **Después:** PASA (1/1 en `etica-cancelar-simetria.spec.js` y 2/2 en `confirmar-entrega.spec.js`, además de 95/95 tests en `npm --prefix backend test`).

## 6. Otros que encontramos
- En `DashboardView.vue:453-454` y `UserPostsView.vue:179-180`, dentro de las tarjetas/tablas de intercambios reservados, `Confirmar entrega` usa `btn-success` (sólido) mientras `Cancelar intercambio` usa `btn-ghost` (bajo contraste), lo cual queda anotado para la revisión completa de la app en la Tarea 10.
