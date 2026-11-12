// @ts-check
import { test, expect } from '@playwright/test';

const API = 'http://localhost:3000/api';

const dueno = { email: 'admin@truequeu.com', password: 'Password123!' };
const receptor = { email: 'martita@truequeu.com', password: 'Password123!' };

async function tokenDe(request, usuario) {
  const res = await request.post(`${API}/login`, { data: { email: usuario.email, password: usuario.password } });
  expect(res.ok()).toBeTruthy();
  const { token } = await res.json();
  return { Authorization: `Bearer ${token}` };
}

async function perfilDe(request, headers) {
  const res = await request.get(`${API}/profile`, { headers });
  return (await res.json()).user.calificaciones;
}

// Deja un intercambio acordado: el dueño publica, el receptor oferta y el dueño acepta.
async function prepararIntercambio(request, headersDueno, headersReceptor, titulo) {
  const { post } = await (
    await request.post(`${API}/posts`, {
      headers: headersDueno,
      data: { title: titulo, category: 'libros', condition: 'usado' },
    })
  ).json();
  const { offer } = await (
    await request.post(`${API}/posts/${post.id}/offers`, { headers: headersReceptor, data: { message: 'Te cambio mis apuntes' } })
  ).json();
  await request.patch(`${API}/offers/${offer.id}/accept`, { headers: headersDueno });
  return post;
}

test.describe('Calificar un intercambio', () => {
  test('ambas partes califican; se rechaza una segunda calificación', async ({ request }) => {
    const headersDueno = await tokenDe(request, dueno);
    const headersReceptor = await tokenDe(request, receptor);
    const antesDueno = await perfilDe(request, headersDueno);
    const antesReceptor = await perfilDe(request, headersReceptor);

    const post = await prepararIntercambio(request, headersDueno, headersReceptor, `Apuntes ${Date.now().toString().slice(-6)}`);
    const url = `${API}/posts/${post.id}/calificacion`;

    // Antes de completarse no se puede calificar
    const antes = await request.post(url, { headers: headersReceptor, data: { puntaje: 5 } });
    expect(antes.status()).toBe(400);

    // Las dos partes confirman la entrega: el intercambio queda completado
    await request.patch(`${API}/posts/${post.id}/confirm`, { headers: headersDueno });
    await request.patch(`${API}/posts/${post.id}/confirm`, { headers: headersReceptor });

    // Ambas partes califican
    const delDueno = await request.post(url, { headers: headersDueno, data: { puntaje: 5, comentario: 'Muy puntual' } });
    const delReceptor = await request.post(url, { headers: headersReceptor, data: { puntaje: 4 } });
    expect(delDueno.status()).toBe(201);
    expect(delReceptor.status()).toBe(201);

    // Una segunda calificación se rechaza
    const segunda = await request.post(url, { headers: headersDueno, data: { puntaje: 1 } });
    expect(segunda.status()).toBe(400);
    expect((await segunda.json()).error).toBe('Ya calificaste este intercambio.');

    // El perfil de cada uno suma 1 calificación recibida
    const despuesDueno = await perfilDe(request, headersDueno);
    const despuesReceptor = await perfilDe(request, headersReceptor);
    expect(despuesDueno.cantidad).toBe(antesDueno.cantidad + 1);
    expect(despuesReceptor.cantidad).toBe(antesReceptor.cantidad + 1);
  });

  test('se rechaza calificar un intercambio cancelado', async ({ request }) => {
    const headersDueno = await tokenDe(request, dueno);
    const headersReceptor = await tokenDe(request, receptor);
    const post = await prepararIntercambio(request, headersDueno, headersReceptor, `Libro ${Date.now().toString().slice(-6)}`);

    const cancelado = await request.patch(`${API}/posts/${post.id}/cancel`, {
      headers: headersDueno,
      data: { reason: 'No pudimos encontrarnos para la entrega' },
    });
    expect(cancelado.ok()).toBeTruthy();

    const res = await request.post(`${API}/posts/${post.id}/calificacion`, { headers: headersReceptor, data: { puntaje: 5 } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('Solo se puede calificar un intercambio completado.');
  });
});
