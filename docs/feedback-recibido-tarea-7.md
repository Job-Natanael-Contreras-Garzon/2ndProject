# Feedback recibido - Tarea 7

- Enlace al feedback: https://github.com/ihc-team/Pre_estudiantil/commit/aa219cd3721ed0cd81ddfb1bd6f49654b89ab55c
- Proyecto evaluado: Trueque U

## Resumen de la evaluación

| Funcionalidad | Resultado | Hallazgo principal |
|---|---|---|
| Filtrar publicaciones | Completada sin ayuda | Faltan filtros iniciales y las cards no cumplen con Fitts |
| Hacer oferta y contraofertar | Completada sin ayuda | La contraoferta solo se ve en el historial |

## Hallazgos y estado

| # | Hallazgo | Estado |
|---|---|---|
| 1 | La contraoferta solo se ve en el historial; no aparece en «Mis publicaciones» ni en las publicaciones. | **Corregido en este commit** (hilo de negociación) |
| 2 | No hay filtro inicial: aparecen publicaciones reservadas y se esperaba ver primero las disponibles. | Pendiente |
| 3 | El botón «Hacer oferta» es muy pequeño (ley de Fitts); propone que toda la card sea el área de acción. | Pendiente |
| 4 | Muchas publicaciones sin imágenes. | Pendiente (el modelo `Post` aún no tiene imágenes) |

## Hallazgo corregido: la contraoferta no se veía fuera del historial

**Problema real.** Quien ofertaba recibía una contraoferta y no tenía dónde verla ni responderla:

- `GET /posts/:id/offers` solo estaba disponible para el dueño de la publicación.
- `Offer.message` era un único campo: al contraofertar se **sobrescribía** el mensaje original, por lo que no existía un hilo.
- Solo el dueño podía contraofertar; quien ofertó no podía contestar.

**Mejora.**

- Nuevo modelo `OfferMessage`: cada oferta, contraoferta y respuesta queda guardada en un hilo.
- Nuevos endpoints: `GET /api/offers/mine`, `GET /api/offers/:id/thread` y `POST /api/offers/:id/reply`.
- En la card de cada publicación, quien ofertó ve el aviso **«Nueva contraoferta»** y el botón **«Ver negociación»**, que abre un modal tipo chat con todos los mensajes y un campo para responder.
- El dueño ve el mismo hilo desde «Mis publicaciones → Ver ofertas recibidas → Ver negociación». Al responder el ofertante, la oferta vuelve a quedar pendiente para el dueño.

**Pruebas.**

- Jest (`backend/tests/offer.test.js`): pruebas 11 a 15 (hilo conservado, acceso de terceros, respuesta, reglas de respuesta y listado de ofertas propias).
- Playwright (`tests/hilo-negociacion.spec.js`): oferta, contraoferta, el ofertante ve el hilo y responde, y el dueño lo ve completo.
- Capturas en `docs/evidencias/tarea-7/`.
