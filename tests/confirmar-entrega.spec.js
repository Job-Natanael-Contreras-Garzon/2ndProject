// @ts-check
import { test, expect } from '@playwright/test';

const API = 'http://localhost:3000/api';
const WEB = 'http://localhost:5173';
const EVIDENCIAS = 'docs/evidencias/tarea-7';

const dueno = { nombre: 'Admin Demo', email: 'admin@truequeu.com', password: 'Password123!' };
const receptor = { nombre: 'Martita Becerra', email: 'martita@truequeu.com', password: 'Password123!' };

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

async function tokenDe(request, usuario) {
  const res = await request.post(`${API}/login`, { data: { email: usuario.email, password: usuario.password } });
  expect(res.ok()).toBeTruthy();
  const { token } = await res.json();
  return { Authorization: `Bearer ${token}` };
}

/**
 * Deja un intercambio acordado por API: el dueño publica, el receptor oferta y el dueño acepta.
 * La publicación queda reservada para el receptor.
 */
async function prepararIntercambioAcordado(request, titulo) {
  const headersDueno = await tokenDe(request, dueno);
  const headersReceptor = await tokenDe(request, receptor);

  const { post } = await (
    await request.post(`${API}/posts`, {
      headers: headersDueno,
      data: { title: titulo, category: 'libros', condition: 'usado' },
    })
  ).json();

  const { offer } = await (
    await request.post(`${API}/posts/${post.id}/offers`, {
      headers: headersReceptor,
      data: { message: 'Te cambio mis apuntes' },
    })
  ).json();

  const aceptada = await request.patch(`${API}/offers/${offer.id}/accept`, { headers: headersDueno });
  expect(aceptada.ok()).toBeTruthy();
  return { post, offer };
}

test.describe('Completar o cancelar un intercambio acordado', () => {
  test.beforeEach(async ({ page }) => {
    // El flujo usa confirm() del navegador para pedir la confirmación de la entrega
    page.on('dialog', (dialog) => dialog.accept());
  });

  test('el intercambio solo se completa cuando confirman las dos partes', async ({ page, request }) => {
    const titulo = `Cálculo Stewart ${Date.now().toString().slice(-6)}`;
    await prepararIntercambioAcordado(request, titulo);

    // =======================================================================
    // 1. PRIMERA CONFIRMACION (dueño): NO completa el intercambio
    // =======================================================================
    await iniciarSesion(page, dueno);
    await page.getByRole('link', { name: 'Mis publicaciones' }).click();
    await expect(page).toHaveURL(/.*posts/);

    const fila = page.locator('tr', { hasText: titulo });
    await expect(fila.getByText(`Reservado por ${receptor.nombre}`)).toBeVisible();
    await fila.getByRole('button', { name: 'Confirmar entrega' }).click();

    await expect(fila.getByText(`Esperando confirmación de ${receptor.nombre}`)).toBeVisible();
    await expect(fila.getByRole('button', { name: 'Confirmar entrega' })).toHaveCount(0);
    await expect(fila.getByText('reservado', { exact: true })).toBeVisible(); // sigue reservada
    await page.screenshot({ path: `${EVIDENCIAS}/confirmacion_1_dueno.png` });
    await cerrarSesion(page);

    // =======================================================================
    // 2. SEGUNDA CONFIRMACION (receptor): ahora sí se completa
    // =======================================================================
    await iniciarSesion(page, receptor);
    await page.goto(`${WEB}/dashboard?q=${encodeURIComponent(titulo)}`);

    const card = page.locator('div.card', { hasText: titulo });
    await expect(card.getByText(`${dueno.nombre} ya confirmó la entrega.`)).toBeVisible();
    await card.getByRole('button', { name: 'Confirmar entrega' }).click();

    await expect(page.getByText(`Intercambio completado: ${titulo}`)).toBeVisible();
    await page.screenshot({ path: `${EVIDENCIAS}/confirmacion_2_completado.png` });

    // =======================================================================
    // 3. HISTORIAL: quedan las confirmaciones y el intercambio completado
    // =======================================================================
    await page.getByRole('link', { name: 'Historial' }).click();
    await expect(page).toHaveURL(/.*history/);
    await expect(page.getByText(`Confirmaste la entrega de «${titulo}» con ${dueno.nombre}`)).toBeVisible();
    await expect(page.getByText(`${dueno.nombre} confirmó la entrega de «${titulo}»`)).toBeVisible();
    await page.getByRole('tab', { name: 'Intercambios' }).click();
    await expect(page.getByText(`Recibiste «${titulo}» de ${dueno.nombre}`)).toBeVisible();
    await page.screenshot({ path: `${EVIDENCIAS}/confirmacion_3_historial.png` });
  });

  test('cancelar exige un motivo, devuelve la publicación a disponible y queda en el historial', async ({
    page,
    request,
  }) => {
    const titulo = `Química Chang ${Date.now().toString().slice(-6)}`;
    await prepararIntercambioAcordado(request, titulo);

    // =======================================================================
    // 1. EL RECEPTOR ABRE "CANCELAR INTERCAMBIO"
    // =======================================================================
    await iniciarSesion(page, receptor);
    await page.goto(`${WEB}/dashboard?q=${encodeURIComponent(titulo)}`);

    const card = page.locator('div.card', { hasText: titulo });
    await card.getByRole('button', { name: 'Cancelar intercambio' }).click();

    // El motivo sugerido rellena la descripción con una respuesta por defecto (editable)
    const motivoSugerido = 'No pudimos coincidir en horario o lugar de entrega.';
    const descripcion = page.getByLabel('Descripción del motivo');
    await page.getByLabel('Motivo sugerido').selectOption('horario');
    await expect(descripcion).toHaveValue(motivoSugerido);
    await page.waitForTimeout(600); // espera la animación del modal
    await page.screenshot({ path: `${EVIDENCIAS}/cancelar_1_motivo_guia.png` });

    // =======================================================================
    // 2. SIN MOTIVO NO SE PUEDE CANCELAR
    // =======================================================================
    await descripcion.fill('');
    await page.getByRole('button', { name: 'Cancelar intercambio' }).last().click();
    await expect(page.getByText('Escribe el motivo de la cancelación.')).toBeVisible();
    await page.screenshot({ path: `${EVIDENCIAS}/cancelar_2_sin_motivo.png` });

    // =======================================================================
    // 3. CANCELA CON MOTIVO: LA PUBLICACION VUELVE A "DISPONIBLE"
    // =======================================================================
    await page.getByLabel('Motivo sugerido').selectOption('horario');
    await descripcion.fill(`${motivoSugerido} Reprogramamos otro día.`);
    await page.getByRole('button', { name: 'Cancelar intercambio' }).last().click();

    await expect(page.getByText(`Intercambio cancelado: ${titulo}`)).toBeVisible();
    await expect(card.getByText('disponible', { exact: true })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Confirmar entrega' })).toHaveCount(0);
    await page.screenshot({ path: `${EVIDENCIAS}/cancelar_3_disponible.png` });

    // =======================================================================
    // 4. EL MOTIVO QUEDA EN EL HISTORIAL DE QUIEN CANCELA...
    // =======================================================================
    await page.getByRole('link', { name: 'Historial' }).click();
    await page.getByRole('tab', { name: 'Cancelaciones' }).click();
    await expect(page.getByText(`Cancelaste el intercambio de «${titulo}» con ${dueno.nombre}`)).toBeVisible();
    await expect(page.getByText('Reprogramamos otro día.').first()).toBeVisible();
    await cerrarSesion(page);

    // =======================================================================
    // 5. ...Y EN EL DE LA OTRA PARTE, SIN OFERTAS PENDIENTES REACTIVADAS
    // =======================================================================
    await iniciarSesion(page, dueno);
    await page.getByRole('link', { name: 'Historial' }).click();
    await page.getByRole('tab', { name: 'Cancelaciones' }).click();
    await expect(page.getByText(`${receptor.nombre} canceló el intercambio de «${titulo}»`)).toBeVisible();
    await expect(page.getByText('Reprogramamos otro día.').first()).toBeVisible();
    await page.screenshot({ path: `${EVIDENCIAS}/cancelar_4_historial_dueno.png` });

    await page.getByRole('link', { name: 'Mis publicaciones' }).click();
    const fila = page.locator('tr', { hasText: titulo });
    await fila.getByRole('button', { name: 'Ver ofertas recibidas' }).click();
    await expect(page.getByText('Todavía no hay ofertas pendientes para esta publicación.')).toBeVisible();
  });
});
