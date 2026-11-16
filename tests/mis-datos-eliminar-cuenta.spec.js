// @ts-check
import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const API = 'http://localhost:3000/api';
const WEB = 'http://localhost:5173';

const admin = { email: 'admin@truequeu.com', password: 'Password123!' };

async function tokenDe(request, usuario) {
  const res = await request.post(`${API}/login`, { data: { email: usuario.email, password: usuario.password } });
  expect(res.ok()).toBeTruthy();
  const { token } = await res.json();
  return { Authorization: `Bearer ${token}` };
}

// Cuenta nueva para cada prueba: así no se toca ninguna cuenta del seed
async function crearUsuario(request) {
  const usuario = { name: 'Persona de Prueba', email: `prueba${Date.now()}@truequeu.com`, password: 'Password123!' };
  const res = await request.post(`${API}/register`, { data: usuario });
  expect(res.status()).toBe(201);
  return usuario;
}

async function entrar(page, usuario) {
  await page.goto(`${WEB}/login`);
  await page.locator('#email').fill(usuario.email);
  await page.locator('#password').fill(usuario.password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/.*dashboard/);
}

async function conteoDe(request, evento) {
  const res = await request.get(`${API}/eventos/resumen`);
  const { resumen } = await res.json();
  return resumen.conteoPorEvento[evento] || 0;
}

// Último evento registrado con ese nombre (el resumen trae los 20 más recientes)
async function ultimoEvento(request, evento) {
  const { ultimosEventos } = await (await request.get(`${API}/eventos/resumen`)).json();
  return ultimosEventos.find((e) => e.evento === evento);
}

test.describe('Tarea 10 - Mis datos y eliminar la cuenta', () => {
  test('ver y descargar los datos, intento bloqueado y eliminación completa', async ({ page, request }) => {
    const usuario = await crearUsuario(request);
    const headers = await tokenDe(request, usuario);
    const headersAdmin = await tokenDe(request, admin);
    const titulo = `Libro de prueba ${Date.now()}`;

    // La persona publica un objeto, el admin le ofrece algo y ella acepta: queda un intercambio en curso
    const { post } = await (
      await request.post(`${API}/posts`, { headers, data: { title: titulo, category: 'libros', condition: 'usado' } })
    ).json();
    const { offer } = await (
      await request.post(`${API}/posts/${post.id}/offers`, { headers: headersAdmin, data: { message: 'Te cambio mis apuntes' } })
    ).json();
    expect((await request.patch(`${API}/offers/${offer.id}/accept`, { headers })).ok()).toBeTruthy();

    // 1. Mis datos: se ven en pantalla
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Mis datos' }).click();
    await expect(page).toHaveURL(/.*mis-datos/);
    await expect(page.getByRole('heading', { name: 'Mis datos' })).toBeVisible();
    await expect(page.getByText(usuario.email, { exact: true })).toBeVisible();
    await expect(page.getByTestId('cantidad-publicaciones')).toHaveText('1');

    // 2. Mis datos: se descargan en JSON, con lo mismo que se ve y sin la contraseña
    const [descarga] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Descargar mis datos (JSON)' }).click(),
    ]);
    expect(descarga.suggestedFilename()).toBe('mis-datos-trueque-u.json');
    const texto = fs.readFileSync(await descarga.path(), 'utf-8');
    const archivo = JSON.parse(texto);
    expect(archivo.usuario.correo).toBe(usuario.email);
    expect(archivo.publicaciones.map((p) => p.titulo)).toContain(titulo);
    expect(texto).not.toContain(usuario.password);

    // 3. Eliminar: el modal explica las consecuencias y los dos botones pesan igual
    const iniciadasAntes = await conteoDe(request, 'cuenta_eliminacion_iniciada');
    const bloqueadasAntes = await conteoDe(request, 'cuenta_eliminacion_bloqueada');
    await page.getByRole('button', { name: 'Eliminar mi cuenta' }).click();
    const modal = page.locator('.modal.modal-open');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('No se puede deshacer')).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Volver' })).toHaveClass(/btn-outline/);
    await expect(modal.getByRole('button', { name: 'Eliminar mi cuenta' })).toHaveClass(/btn-outline/);

    // 4. Intento bloqueado por la regla de la app: hay un intercambio en curso
    await modal.getByRole('button', { name: 'Eliminar mi cuenta' }).click();
    await expect(modal.getByRole('alert')).toContainText('intercambio en curso');
    await expect(page).toHaveURL(/.*mis-datos/);
    expect((await request.post(`${API}/login`, { data: usuario })).ok()).toBeTruthy(); // la cuenta sigue existiendo

    // Eventos de inicio y bloqueo, sin datos personales
    await expect.poll(() => conteoDe(request, 'cuenta_eliminacion_iniciada')).toBeGreaterThan(iniciadasAntes);
    await expect.poll(() => conteoDe(request, 'cuenta_eliminacion_bloqueada')).toBeGreaterThan(bloqueadasAntes);
    const bloqueada = await ultimoEvento(request, 'cuenta_eliminacion_bloqueada');
    expect(bloqueada.props).toEqual({ motivo: 'intercambio_en_curso' });

    // 5. Se cancela el intercambio y ahora sí se puede eliminar
    const cancelado = await request.patch(`${API}/posts/${post.id}/cancel`, {
      headers,
      data: { reason: 'Ya no necesito el intercambio' },
    });
    expect(cancelado.ok()).toBeTruthy();

    const eliminadasAntes = await conteoDe(request, 'cuenta_eliminada');
    await modal.getByRole('button', { name: 'Eliminar mi cuenta' }).click();
    await expect(page).toHaveURL(/.*login/);

    // Evento de éxito, sin datos personales
    await expect.poll(() => conteoDe(request, 'cuenta_eliminada')).toBeGreaterThan(eliminadasAntes);
    const eliminada = await ultimoEvento(request, 'cuenta_eliminada');
    expect(JSON.stringify(eliminada.props)).not.toContain(usuario.email);
    expect(JSON.stringify(eliminada.props)).not.toContain(usuario.name);

    // 6. Eliminación completa: la cuenta ya no inicia sesión, su sesión vieja no sirve y sus datos no quedan
    const login = await request.post(`${API}/login`, { data: usuario });
    expect(login.status()).toBe(401);
    const perfilViejo = await request.get(`${API}/profile`, { headers });
    expect(perfilViejo.status()).toBe(401);
    const { posts } = await (await request.get(`${API}/posts/explore`, { headers: headersAdmin })).json();
    expect(posts.map((p) => p.title)).not.toContain(titulo);
  });
});
