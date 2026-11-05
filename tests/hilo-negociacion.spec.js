// @ts-check
import { test, expect } from '@playwright/test';

const API = 'http://localhost:3000/api';
const WEB = 'http://localhost:5173';
const EVIDENCIAS = 'docs/evidencias/tarea-7';

const dueno = { nombre: 'Admin Demo', email: 'admin@truequeu.com', password: 'Password123!' };
const ofertante = { nombre: 'Martita Becerra', email: 'martita@truequeu.com', password: 'Password123!' };

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

test('el ofertante ve su oferta y la contraoferta en un hilo y puede responder', async ({ page, request }) => {
  // =========================================================================
  // 1. PREPARACION (por API, para que la prueba sea repetible)
  // =========================================================================
  const sufijo = Date.now().toString().slice(-6);
  const titulo = `Calculadora científica ${sufijo}`;
  const mensajeOferta = `Te ofrezco mis apuntes ${sufijo}`;
  const mensajeContraoferta = `Acepto si agregas un cuaderno ${sufijo}`;
  const mensajeRespuesta = `Trato hecho, llevo el cuaderno ${sufijo}`;

  const headersDueno = await tokenDe(request, dueno);
  const headersOfertante = await tokenDe(request, ofertante);

  const resPost = await request.post(`${API}/posts`, {
    headers: headersDueno,
    data: { title: titulo, category: 'electronica', condition: 'usado' },
  });
  expect(resPost.ok()).toBeTruthy();
  const { post } = await resPost.json();

  const resOferta = await request.post(`${API}/posts/${post.id}/offers`, {
    headers: headersOfertante,
    data: { message: mensajeOferta },
  });
  expect(resOferta.ok()).toBeTruthy();

  // =========================================================================
  // 2. EL DUEÑO CONTRAOFERTA DESDE "MIS PUBLICACIONES"
  // =========================================================================
  await iniciarSesion(page, dueno);
  await page.getByRole('link', { name: 'Mis publicaciones' }).click();
  await expect(page).toHaveURL(/.*posts/);

  const fila = page.locator('tr', { hasText: titulo });
  await fila.getByRole('button', { name: 'Ver ofertas recibidas' }).click();
  await page.getByRole('button', { name: 'Contraofertar' }).first().click();
  await page.getByPlaceholder('Ej. Te acepto si agregas unos apuntes').fill(mensajeContraoferta);
  await page.getByRole('button', { name: 'Enviar contraoferta' }).click();
  await cerrarSesion(page);

  // =========================================================================
  // 3. EL OFERTANTE VE LA NEGOCIACION EN LA CARD DE LA PUBLICACION
  // =========================================================================
  await iniciarSesion(page, ofertante);
  await page.goto(`${WEB}/dashboard?q=${encodeURIComponent(titulo)}`);

  const card = page.locator('div.card', { hasText: titulo });
  await expect(card.getByText('Nueva contraoferta')).toBeVisible();
  await page.screenshot({ path: `${EVIDENCIAS}/hilo_card_ofertante.png` });

  await card.getByRole('button', { name: 'Ver negociación' }).click();
  const hilo = page.getByTestId('offer-thread');
  await expect(hilo.getByText(mensajeOferta)).toBeVisible();
  await expect(hilo.getByText(mensajeContraoferta)).toBeVisible();
  await expect(hilo.getByTestId('thread-status')).toContainText('esperando respuesta de quien ofertó');
  await page.waitForTimeout(600); // espera la animación del modal
  await page.screenshot({ path: `${EVIDENCIAS}/hilo_ofertante_contraoferta.png` });

  // =========================================================================
  // 4. EL OFERTANTE RESPONDE Y EL DUEÑO LO VE EN EL MISMO HILO
  // =========================================================================
  await hilo.getByLabel('Tu respuesta').fill(mensajeRespuesta);
  await hilo.getByRole('button', { name: 'Responder' }).click();
  await expect(hilo.getByText(mensajeRespuesta)).toBeVisible();
  await expect(hilo.getByTestId('thread-status')).toContainText('Esperando respuesta del dueño');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${EVIDENCIAS}/hilo_ofertante_respuesta.png` });
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await cerrarSesion(page);

  await iniciarSesion(page, dueno);
  await page.getByRole('link', { name: 'Mis publicaciones' }).click();
  await page.locator('tr', { hasText: titulo }).getByRole('button', { name: 'Ver ofertas recibidas' }).click();
  await page.getByRole('button', { name: 'Ver negociación' }).first().click();
  const hiloDueno = page.getByTestId('offer-thread');
  await expect(hiloDueno.getByText(mensajeOferta)).toBeVisible();
  await expect(hiloDueno.getByText(mensajeContraoferta)).toBeVisible();
  await expect(hiloDueno.getByText(mensajeRespuesta)).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${EVIDENCIAS}/hilo_dueno.png` });
});
