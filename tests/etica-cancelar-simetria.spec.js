// @ts-check
import { test, expect } from '@playwright/test';

const API = 'http://localhost:3000/api';
const WEB = 'http://localhost:5173';

const dueno = { email: 'admin@truequeu.com', password: 'Password123!' };
const receptor = { email: 'martita@truequeu.com', password: 'Password123!' };

async function tokenDe(request, usuario) {
  const res = await request.post(`${API}/login`, {
    data: { email: usuario.email, password: usuario.password },
  });
  expect(res.ok()).toBeTruthy();
  const { token } = await res.json();
  return { Authorization: `Bearer ${token}` };
}

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

  const aceptada = await request.patch(`${API}/offers/${offer.id}/accept`, {
    headers: headersDueno,
  });
  expect(aceptada.ok()).toBeTruthy();
  return { post, offer };
}

test.describe('Clase 22 - Simetría visual al cancelar intercambio', () => {
  test('Volver y Cancelar intercambio tienen el mismo peso visual en el modal', async ({ page, request }) => {
    const titulo = `Libro Simetría ${Date.now()}`;
    await prepararIntercambioAcordado(request, titulo);

    await page.goto(`${WEB}/login`);
    await page.locator('#email').fill(receptor.email);
    await page.locator('#password').fill(receptor.password);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(/.*dashboard/);

    const card = page.locator('.card', { hasText: titulo });
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Cancelar intercambio' }).click();

    const modal = page.locator('.modal.modal-open');
    await expect(modal).toBeVisible();

    const volverBtn = modal.getByRole('button', { name: 'Volver' });
    const cancelarBtn = modal.getByRole('button', { name: 'Cancelar intercambio' });

    await expect(volverBtn).toHaveClass(/btn-outline/);
    await expect(cancelarBtn).toHaveClass(/btn-outline/);
    await expect(volverBtn).not.toHaveClass(/btn-ghost/);
    await expect(cancelarBtn).not.toHaveClass(/btn-error/);
  });
});
