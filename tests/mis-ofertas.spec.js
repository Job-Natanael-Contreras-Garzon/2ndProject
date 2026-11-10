// @ts-check
import { test, expect } from '@playwright/test';

const API = 'http://localhost:3000/api';
const WEB = 'http://localhost:5173';
const EVIDENCIAS = 'evidencias';

const dueno = { nombre: 'Admin Demo', email: 'admin@truequeu.com', password: 'Password123!' };

/** @param {import('@playwright/test').Page} page */
async function iniciarSesion(page, usuario) {
  await page.goto(`${WEB}/login`);
  await page.locator('#email').fill(usuario.email);
  await page.locator('#password').fill(usuario.password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/.*dashboard/);
}

/** @param {import('@playwright/test').Page} page */
async function cerrarSesion(page) {
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/.*login/);
}

/** Inicia sesión por API y devuelve las cabeceras con el token. */
async function tokenDe(request, usuario) {
  const res = await request.post(`${API}/login`, { data: { email: usuario.email, password: usuario.password } });
  expect(res.ok()).toBeTruthy();
  const { token } = await res.json();
  return { Authorization: `Bearer ${token}` };
}

test.describe('Explorar publicaciones y gestión de Mis ofertas', () => {
  test('recorrido completo de la nueva funcionalidad: catálogo, estado vacío, envío de oferta, seguimiento de estados en Mis ofertas y persistencia', async ({ page, request }) => {
    // =========================================================================
    // 1. PREPARACIÓN DE DATOS REPRODUCIBLES MEDIANTE API (Arrange)
    // =========================================================================
    const sufijo = Date.now().toString().slice(-6);
    const tituloA = `Libro Álgebra ${sufijo}`;
    const tituloB = `Calculadora Científica ${sufijo}`;
    const mensajeOferta = `Te ofrezco intercambio por ${tituloA}`;
    const mensajeContraoferta = `Acepto si agregas apuntes ${sufijo}`;

    const ofertante = {
      nombre: 'Martita Becerra',
      email: `martita_${sufijo}@truequeu.com`,
      password: 'Password123!',
    };

    // Registrar nuevo usuario ofertante para garantizar estado limpio sin ofertas previas
    const resReg = await request.post(`${API}/register`, {
      data: { name: ofertante.nombre, email: ofertante.email, password: ofertante.password },
    });
    expect(resReg.ok()).toBeTruthy();

    const headersDueno = await tokenDe(request, dueno);

    // El dueño crea dos publicaciones distintas
    const resPostA = await request.post(`${API}/posts`, {
      headers: headersDueno,
      data: { title: tituloA, category: 'libros', condition: 'usado' },
    });
    expect(resPostA.ok()).toBeTruthy();
    const { post: postA } = await resPostA.json();

    const resPostB = await request.post(`${API}/posts`, {
      headers: headersDueno,
      data: { title: tituloB, category: 'electronica', condition: 'nuevo' },
    });
    expect(resPostB.ok()).toBeTruthy();

    // =========================================================================
    // 2. INICIO DE SESIÓN, INSPECCIÓN DEL CATÁLOGO Y EMPTY STATE EN MIS OFERTAS
    // =========================================================================
    await iniciarSesion(page, ofertante);

    // Validar pestaña "Todas las publicaciones" activa por defecto y presencia de ambas publicaciones
    const tabTodas = page.getByRole('tab', { name: 'Todas las publicaciones' });
    await expect(tabTodas).toHaveClass(/tab-active/);
    await expect(page.locator('div.card', { hasText: tituloA })).toBeVisible();
    await expect(page.locator('div.card', { hasText: tituloB })).toBeVisible();

    // Navegar a "Mis ofertas" cuando aún no se ha enviado ninguna oferta
    await page.getByRole('tab', { name: 'Mis ofertas' }).click();
    await expect(page).toHaveURL(/.*dashboard\?vista=mis-ofertas/);

    // Verificar el empty state informativo y el botón para volver
    await expect(page.getByText('Todavía no enviaste ofertas')).toBeVisible();
    await expect(page.getByText('Cuando hagas una oferta, podrás ver aquí su estado.')).toBeVisible();
    const btnVolverTodas = page.getByRole('button', { name: 'Ver todas las publicaciones' });
    await expect(btnVolverTodas).toBeVisible();

    // Captura 1: Estado vacío de Mis ofertas
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${EVIDENCIAS}/01-mis-ofertas-vacio.png` });

    // Regresar al catálogo mediante el botón del empty state
    await btnVolverTodas.click();
    await expect(page).toHaveURL(`${WEB}/dashboard`);
    await expect(tabTodas).toHaveClass(/tab-active/);

    // =========================================================================
    // 3. ENVÍO DE OFERTA SOBRE LA PUBLICACIÓN A Y VISUALIZACIÓN EN MIS OFERTAS
    // =========================================================================
    const cardA = page.locator('div.card', { hasText: tituloA });
    await cardA.getByRole('button', { name: 'Hacer oferta' }).click();

    // Completar el modal de oferta
    await page.getByPlaceholder('Ej. Te cambio mi libro, está casi nuevo').fill(mensajeOferta);
    await page.getByRole('button', { name: 'Enviar oferta' }).click();

    // Confirmación de oferta enviada en banner
    await expect(page.getByText(`Oferta enviada: ${tituloA}`)).toBeVisible();

    // Navegar a "Mis ofertas": ahora solo debe aparecer la publicación A con estado pendiente
    await page.getByRole('tab', { name: 'Mis ofertas' }).click();
    await expect(page).toHaveURL(/.*dashboard\?vista=mis-ofertas/);

    const cardMisOfertasA = page.locator('div.card', { hasText: tituloA });
    await expect(cardMisOfertasA).toBeVisible();
    await expect(page.locator('div.card', { hasText: tituloB })).toHaveCount(0);
    await expect(cardMisOfertasA.getByText('Tu oferta: Pendiente de respuesta')).toBeVisible();
    await expect(cardMisOfertasA.getByRole('button', { name: 'Ver negociación' })).toBeVisible();

    // Captura 2: Oferta pendiente en Mis ofertas
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${EVIDENCIAS}/02-mis-ofertas-pendiente.png` });

    // =========================================================================
    // 4. COMPROBACIÓN DE PERSISTENCIA ANTE RECARGA DE PÁGINA (F5)
    // =========================================================================
    await page.reload();
    await expect(page).toHaveURL(/.*dashboard\?vista=mis-ofertas/);

    const tabMisOfertas = page.getByRole('tab', { name: 'Mis ofertas' });
    await expect(tabMisOfertas).toHaveClass(/tab-active/);

    const cardPersistida = page.locator('div.card', { hasText: tituloA });
    await expect(cardPersistida).toBeVisible();
    await expect(cardPersistida.getByText('Tu oferta: Pendiente de respuesta')).toBeVisible();
    await expect(cardPersistida.getByRole('button', { name: 'Ver negociación' })).toBeVisible();
    await expect(page.locator('div.card', { hasText: tituloB })).toHaveCount(0);

    // Captura 3: Persistencia de vista y datos al recargar
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${EVIDENCIAS}/03-mis-ofertas-persistencia-recarga.png` });

    // =========================================================================
    // 5. TRANSICIÓN A CONTRAOFERTA POR EL DUEÑO Y REFLEJO EN MIS OFERTAS
    // =========================================================================
    // Obtener la oferta generada para contraofertar mediante API
    const resOffers = await request.get(`${API}/posts/${postA.id}/offers`, { headers: headersDueno });
    expect(resOffers.ok()).toBeTruthy();
    const { offers } = await resOffers.json();
    const offerId = offers[0].id;

    const resCounter = await request.patch(`${API}/offers/${offerId}/counter`, {
      headers: headersDueno,
      data: { message: mensajeContraoferta },
    });
    expect(resCounter.ok()).toBeTruthy();

    // El ofertante recarga la página y observa el nuevo estado
    await page.reload();
    await expect(page).toHaveURL(/.*dashboard\?vista=mis-ofertas/);

    const cardContraoferta = page.locator('div.card', { hasText: tituloA });
    await expect(cardContraoferta).toBeVisible();
    await expect(cardContraoferta.getByText('Tu oferta: Te enviaron una contraoferta')).toBeVisible();
    await expect(cardContraoferta.getByText('Nueva contraoferta')).toBeVisible();

    // Captura 4: Estado con contraoferta y badge de advertencia
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${EVIDENCIAS}/04-mis-ofertas-contraoferta.png` });

    // =========================================================================
    // 6. TRANSICIÓN A ACEPTADA Y RESERVA DE LA PUBLICACIÓN
    // =========================================================================
    const resAccept = await request.patch(`${API}/offers/${offerId}/accept`, { headers: headersDueno });
    expect(resAccept.ok()).toBeTruthy();

    // El ofertante recarga la página y constata la aceptación y reserva
    await page.reload();
    await expect(page).toHaveURL(/.*dashboard\?vista=mis-ofertas/);

    const cardAceptada = page.locator('div.card', { hasText: tituloA });
    await expect(cardAceptada).toBeVisible();
    await expect(cardAceptada.getByText('Tu oferta: Aceptada')).toBeVisible();
    await expect(cardAceptada.getByText('Reservado por ti')).toBeVisible();
    await expect(cardAceptada.getByRole('button', { name: 'Confirmar entrega' })).toBeVisible();

    // Captura 5: Estado de oferta aceptada y publicación reservada
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${EVIDENCIAS}/05-mis-ofertas-aceptada.png` });

    await cerrarSesion(page);
  });

  test('restricciones clave de Mis ofertas: prevención de duplicados, aislamiento estricto entre usuarios y preservación de vista en filtros', async ({ page, request }) => {
    // =========================================================================
    // 1. PREPARACIÓN DE DATOS (Arrange)
    // =========================================================================
    const sufijo = Date.now().toString().slice(-6);
    const titulo = `Libro Restricciones ${sufijo}`;

    const ofertante = {
      nombre: 'Martita Becerra',
      email: `martita_restriccion_${sufijo}@truequeu.com`,
      password: 'Password123!',
    };

    // Registrar ofertante único
    const resReg = await request.post(`${API}/register`, {
      data: { name: ofertante.nombre, email: ofertante.email, password: ofertante.password },
    });
    expect(resReg.ok()).toBeTruthy();

    const headersDueno = await tokenDe(request, dueno);
    const headersOfertante = await tokenDe(request, ofertante);

    // Dueño crea la publicación
    const resPost = await request.post(`${API}/posts`, {
      headers: headersDueno,
      data: { title: titulo, category: 'libros', condition: 'usado' },
    });
    expect(resPost.ok()).toBeTruthy();
    const { post } = await resPost.json();

    // Ofertante envía una primera oferta activa por API
    const resOffer = await request.post(`${API}/posts/${post.id}/offers`, {
      headers: headersOfertante,
      data: { message: `Oferta inicial activa ${sufijo}` },
    });
    expect(resOffer.ok()).toBeTruthy();

    // =========================================================================
    // 2. RESTRICCIÓN DE DUPLICADOS: BOTÓN "HACER OFERTA" OCULTO ANTE OFERTA ACTIVA
    // =========================================================================
    await iniciarSesion(page, ofertante);

    // En "Todas las publicaciones", para la publicación con oferta activa:
    const cardCatalogo = page.locator('div.card', { hasText: titulo });
    await expect(cardCatalogo).toBeVisible();
    await expect(cardCatalogo.getByRole('button', { name: 'Hacer oferta' })).toHaveCount(0);
    await expect(cardCatalogo.getByRole('button', { name: 'Ver negociación' })).toBeVisible();

    // En "Mis ofertas", igualmente solo se permite ver negociación
    await page.getByRole('tab', { name: 'Mis ofertas' }).click();
    await expect(page).toHaveURL(/.*dashboard\?vista=mis-ofertas/);

    const cardMisOfertas = page.locator('div.card', { hasText: titulo });
    await expect(cardMisOfertas).toBeVisible();
    await expect(cardMisOfertas.getByText('Tu oferta: Pendiente de respuesta')).toBeVisible();
    await expect(cardMisOfertas.getByRole('button', { name: 'Hacer oferta' })).toHaveCount(0);
    await expect(cardMisOfertas.getByRole('button', { name: 'Ver negociación' })).toBeVisible();

    // Captura 6: Restricción de duplicados (botón de oferta bloqueado, solo ver negociación)
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${EVIDENCIAS}/06-restriccion-sin-duplicados.png` });

    await cerrarSesion(page);

    // =========================================================================
    // 3. RESTRICCIÓN DE AISLAMIENTO ENTRE USUARIOS
    // =========================================================================
    // El dueño de la publicación inicia sesión
    await iniciarSesion(page, dueno);

    // En "Todas las publicaciones", el dueño no ve su propio objeto
    await expect(page.locator('div.card', { hasText: titulo })).toHaveCount(0);

    // El dueño accede a "Mis ofertas": NO debe ver la oferta que Martita le envió
    await page.getByRole('tab', { name: 'Mis ofertas' }).click();
    await expect(page).toHaveURL(/.*dashboard\?vista=mis-ofertas/);

    // La publicación del dueño con oferta de Martita no aparece en su lista de Mis ofertas
    await expect(page.locator('div.card', { hasText: titulo })).toHaveCount(0);

    // Captura 7: Aislamiento de ofertas entre usuarios
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${EVIDENCIAS}/07-restriccion-aislamiento-usuarios.png` });

    await cerrarSesion(page);

    // =========================================================================
    // 4. RESTRICCIÓN DE PRESERVACIÓN DE VISTA EN BÚSQUEDA Y FILTROS
    // =========================================================================
    await iniciarSesion(page, ofertante);
    await page.getByRole('tab', { name: 'Mis ofertas' }).click();
    await expect(page).toHaveURL(/.*dashboard\?vista=mis-ofertas/);

    // Filtrar por término existente en la publicación
    const searchInput = page.getByPlaceholder('Buscar por título');
    await searchInput.fill(titulo);
    await searchInput.press('Enter');

    // Comprobar que la URL conserva tanto el parámetro de búsqueda como la vista activa
    await expect(page).toHaveURL(/.*dashboard\?.*q=.*vista=mis-ofertas/);
    await expect(page.locator('div.card', { hasText: titulo })).toBeVisible();

    // Buscar término inexistente dentro de Mis ofertas
    const busquedaInexistente = `Inexistente ${sufijo}`;
    await searchInput.fill(busquedaInexistente);
    await searchInput.press('Enter');

    // Verificar que la URL sigue preservando vista=mis-ofertas
    await expect(page).toHaveURL(/.*dashboard\?.*vista=mis-ofertas/);

    // Verificar empty state específico para filtro sin coincidencias (no confundiéndose con sin ofertas)
    await expect(page.getByText('No hay publicaciones que coincidan con los filtros')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Limpiar filtros' }).first()).toBeVisible();

    // Captura 8: Preservación de vista=mis-ofertas al aplicar filtros y búsqueda
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${EVIDENCIAS}/08-restriccion-preservacion-filtros.png` });

    // Restablecer filtros con el botón y comprobar que permanece en Mis ofertas
    await page.getByRole('button', { name: 'Limpiar filtros' }).first().click();
    await expect(page).toHaveURL(/.*dashboard\?vista=mis-ofertas/);
    await expect(page.locator('div.card', { hasText: titulo })).toBeVisible();

    await cerrarSesion(page);
  });
});
