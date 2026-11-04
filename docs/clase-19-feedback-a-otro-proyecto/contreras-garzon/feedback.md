# Feedback a otro proyecto – Clase 19
- Nombre completo del evaluador: Job Natanael Contreras Garzon
- Mi grupo y caso de estudio: Trueque U - Encontrar una publicación y enviar una oferta desde una cuenta de prueba
- Grupo y caso de estudio evaluado: Presupuesto Estudiantil - Registrar un gasto con categoría y buscarlo con un filtro
- Integrantes del proyecto evaluado: Equipo IHC (Pre_estudiantil)
- URL de la app y repositorio evaluado: https://github.com/ihc-team/Pre_estudiantil (Proyecto Flutter)
- Fecha y versión/commit probado (si está disponible): 03/11/2026 - Commit: [bcbb9ee7b7aa071651cd0658a838da25bffd1e97](https://github.com/ihc-team/Pre_estudiantil/commit/bcbb9ee7b7aa071651cd0658a838da25bffd1e97)

## Primera impresión
¿Qué entendí al entrar? ¿Qué me confundió?
- **Qué entendí al entrar:** El botón principal para registrar movimientos es fácil de encontrar y muy claro, lo que permite rellenar con facilidad los gastos y conceptos iniciales.
- **Qué me confundió:** No me gusta el contraste de los colores actuales; visualmente se siente agresivo o poco armónico (por ejemplo, usaría un tono naranja en lugar de rojo para las alertas o distinciones de gastos).

## Funcionalidad asignada y resultado
Describir la tarea indicada por el docente.
Se evaluaron dos flujos de trabajo principales:
- **Flujo 1:** Registrar un gasto con categoría y buscarlo con un filtro.
  - *Resultado esperado:* El gasto aparece registrado, el balance total cambia correspondientemente y el filtro de búsqueda/categoría permite encontrarlo con éxito.
- **Flujo 2:** Registrar un ingreso y luego editar cambios.
  - *Resultado esperado:* El ingreso aparece registrado, se visualiza una confirmación en pantalla, el total cambia y el botón de edición permite modificar los detalles con éxito.

Marcar solo una opción:
- [ ] La completé sin ayuda.
- [X] La completé con ayuda. ¿Cuál?
  *Se pudo lograr pero no de la manera esperada: en el registro de un ingreso no fue posible asociar una categoría clara ni adecuada (las categorías mostradas se mantienen enfocadas en gastos) y se requirió explorar alternativas para completar el flujo.*
- [ ] No pude completarla. ¿Dónde me detuve?

## Qué no funcionó
Pasos, resultado esperado y resultado observado.
Si todo funcionó, indicarlo. Adjuntar captura si ayuda.
- **Flujo 1 (Gasto y Filtro):** Funcionó bien. El gasto se registró, se aplicó el filtro por categoría/concepto (p. ej., "Estudio") y se visualizó correctamente.
- **Flujo 2 (Ingreso y Categorización/Edición):** 
  - *Pasos:* Ingresar al flujo de registrar movimiento, seleccionar tipo "Ingreso" e intentar elegir una categoría representativa.
  - *Resultado esperado:* Que al cambiar a ingreso se presenten categorías acordes o se permita agregar una nueva categoría personalizada si la óptima no se encuentra.
  - *Resultado observado:* Al registrar un ingreso no se cambian ni adaptan las categorías de gasto, quedando limitada la clasificación (por ejemplo, quedando en "Otros"). Debería permitir agregar nuevas categorías al no mostrarse la adecuada.

### Capturas de pantalla de la prueba
![Registro y filtro de gasto](captura2.png)
*Figura 1: Gasto filtrado por categoría.*

![Detalle de movimientos registrados](captura3.png)
*Figura 2: Vista del gasto con opción de estado y edición.*

![Registro de ingreso y edición](captura1.png)
*Figura 3: Registro de ingreso ("pago de sueldo"), total actualizado y opciones de edición.*

## Qué mejoraría y por qué
Una propuesta concreta relacionada con la experiencia.
1. **Resumen visual y gráfico interactivo:** Al confirmarse los registros no queda del todo claro un resumen conciso. A medida que se acumulan movimientos se satura la vista con información que no es inmediatamente relevante; lo cambiaría o complementaría con un gráfico/dashboard visual de distribución financiera.
2. **Estructura Flexbox / tarjetas diferenciadas:** Implementar un layout más ordenado (estilo flexbox) para separar visualmente y de forma limpia los ingresos y los gastos.

## Qué quitaría y por qué
Si no quitaría nada, explicar por qué.
1. **Diseño de lista saturado en el Home:** Quitaría el diseño de lista tan plano y denso en la pantalla principal; genera exceso de información que aturde al usuario a primera vista.
2. **Sobrecarga de filtros:** Los filtros deberían separarse o clasificarse claramente en "Ingresos" y "Egresos", y deberían ser escalables/colapsables para no saturar con todos los filtros disponibles a la vez ("menos es más, y lo más útil va primero").
