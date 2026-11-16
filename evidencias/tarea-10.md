# Tarea 10 – Mis datos y salida honesta

Grupo: Job Natanael Contreras Garzon y Eudenia Flores Gandira
Modalidad: con IA

## 1. Mis datos
- Pantalla **Mis datos** (menú «Mis datos», `/mis-datos`): muestra la cuenta, cuántos datos hay de cada tipo y todo el JSON. Botón «Descargar mis datos (JSON)».
- API: `GET /api/mis-datos`. Trae cuenta, publicaciones, ofertas enviadas, historial y calificaciones dadas y recibidas. Nunca la contraseña ni tokens. No trae las ofertas que otras personas hicieron por sus publicaciones, porque son datos de ellas.
- Captura: `tarea-10-mis-datos.png`.

## 2. Eliminar la cuenta
- **Regla de la app:** no se puede eliminar con un intercambio en curso (publicación reservada, como dueño o como quien reservó). Responde 409 con el motivo y qué hacer: «Complétalo o cancélalo y vuelve a intentarlo.» Captura: `tarea-10-bloqueo.png`.
- **Eliminación completa** (`DELETE /api/cuenta`): en una transacción borra la cuenta, sus publicaciones, las ofertas que envió y las que recibió (con sus mensajes), su historial y sus calificaciones.
- **Después:** esa cuenta no puede iniciar sesión (401) y la sesión que quedó guardada tampoco sirve (`verifyToken` revisa que la cuenta exista).
- **Confirmación honesta** (captura `tarea-10-confirmacion.png`): un solo aviso que dice qué se borra y que no se deshace. «Volver» y «Eliminar mi cuenta» son botones iguales (`btn-outline`), sin culpa y sin pasos de más (no pide contraseña ni escribir «ELIMINAR»). Eliminar son 3 toques (Mis datos → Eliminar → Confirmar); crear cuenta es 1 toque desde el login más el formulario.

## 3. Revisión de los seis patrones

| # | Patrón | Lo que encontramos | Lo que corregimos | Pendiente |
|---|---|---|---|---|
| 1 | Opciones preseleccionadas | Nada: no hay casillas ni opciones marcadas por defecto. | – | – |
| 2 | Confirmaciones engañosas | En otras pantallas, «Confirmar entrega», «Aceptar» y «Contraofertar» tienen más peso visual que «Cancelar intercambio» y «Rechazar». | El aviso de eliminar cuenta usa botones iguales (`btn-outline`). | Igualar los botones de esas pantallas. |
| 3 | Urgencia, culpa o escasez falsas | Nada: no hay contadores, «quedan pocos» ni textos con culpa. | – | – |
| 4 | Datos expuestos sin necesidad | Nada: la app no guarda teléfono, el correo solo lo ve la propia persona y los demás ven solo el nombre. | – | – |
| 5 | Salir más difícil que entrar | No había forma de eliminar la cuenta. No se puede retirar una oferta enviada. Cancelar un intercambio pide motivo (hacer una oferta o aceptar no pide nada). | Se agregó eliminar la cuenta (3 toques). | Retirar una oferta. El motivo al cancelar se queda porque queda en el historial de las dos partes. |
| 6 | Permisos sin explicar | Google Analytics se carga al abrir la app sin avisar. | – | Avisar antes de medir y poder desactivarla. |

Otro pendiente: al eliminar una cuenta, su nombre puede seguir apareciendo en el historial de las otras personas del intercambio. El aviso de eliminar ya lo dice.

## 4. Eventos (Tarea 9)

| Evento | Cuándo se dispara |
|---|---|
| `cuenta_eliminacion_iniciada` | Al abrir el aviso «Eliminar mi cuenta» (inicio) |
| `cuenta_eliminada` | Solo después de que el servidor borró la cuenta (éxito) |
| `cuenta_eliminacion_bloqueada` | Cuando la regla de la app la bloquea; guarda solo `motivo: intercambio_en_curso` (bloqueo) |

Sin datos personales: no se guarda correo, nombre ni títulos.

## 5. Pruebas
- Backend (Jest): `backend/tests/cuenta.test.js` (4 pruebas: datos sin contraseña, bloqueo, eliminación completa y token de una cuenta eliminada).
- E2E (Playwright): `tests/mis-datos-eliminar-cuenta.spec.js` recorre todo: ver y descargar los datos, intento bloqueado, eliminación completa y los tres eventos.
- Resultado: backend 99/99, frontend 14/14 y E2E 13/13.
