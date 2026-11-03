// @ts-check
import { test, expect } from '@playwright/test';

test('revisar ofertas recibidas, contraofertar y verificar en el historial de ambos', async ({ page }) => {
  // =========================================================================
  // 1. DATOS DE LA PRUEBA (Arrange / Preparación)
  // =========================================================================
  // Usamos los usuarios preconfigurados en la base de datos (seed)
  const dueno = {
    nombre: 'Admin Demo',
    email: 'admin@truequeu.com',
    password: 'Password123!',
  };

  const ofertante = {
    nombre: 'Martita Becerra',
    email: 'martita@truequeu.com',
    password: 'Password123!',
  };

  // Publicación del dueño que tiene una oferta recibida de Martita Becerra
  const publicacionConOferta = 'Álgebra lineal – Grossman';

  // Mensaje único de contraoferta con marca de tiempo
  const mensajeContraoferta = `Te acepto el trueque si agregas unos apuntes - ${Date.now().toString().slice(-4)}`;

  // =========================================================================
  // 2. INICIO DE SESIÓN (Admin Demo ingresa a Trueque U)
  // =========================================================================
  // Paso 1: El dueño navega a la pantalla de login
  await page.goto('http://localhost:5173/login');

  // Paso 2: Llena sus credenciales y presiona "Ingresar"
  await page.locator('#email').fill(dueno.email);
  await page.locator('#password').fill(dueno.password);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  // Paso 3: Confirmamos que el sistema lo redirige al Dashboard principal
  await expect(page).toHaveURL(/.*dashboard/);

  // =========================================================================
  // 3. REVISIÓN DE OFERTAS Y CONTRAOFERTA (En Mis publicaciones)
  // =========================================================================
  // Paso 4: Da clic en "Mis publicaciones" en la barra de navegación superior
  await page.getByRole('link', { name: 'Mis publicaciones' }).click();
  await expect(page).toHaveURL(/.*posts/);

  // Paso 5: Ubica su publicación y presiona "Ver ofertas recibidas"
  const filaPublicacion = page.locator('tr', { hasText: publicacionConOferta });
  await filaPublicacion.getByRole('button', { name: 'Ver ofertas recibidas' }).click();

  // Paso 6: Verifica que aparece la oferta de Martita Becerra y presiona "Contraofertar"
  await expect(page.getByText(ofertante.nombre)).toBeVisible();
  await page.getByRole('button', { name: 'Contraofertar' }).first().click();

  // Paso 7: Escribe el mensaje de la contraoferta y presiona "Enviar contraoferta"
  await page.getByPlaceholder('Ej. Te acepto si agregas unos apuntes').fill(mensajeContraoferta);
  await page.getByRole('button', { name: 'Enviar contraoferta' }).click();

  // =========================================================================
  // 4. VERIFICACIÓN EN EL HISTORIAL DE AMBOS (Assert / Resultado esperado)
  // =========================================================================
  // Paso 8: El dueño va a la sección "Historial" y comprueba que se registró su contraoferta enviada
  await page.getByRole('link', { name: 'Historial' }).click();
  await expect(page).toHaveURL(/.*history/);
  await expect(
    page.getByText(`Enviaste una contraoferta por «${publicacionConOferta}» a ${ofertante.nombre}`).first()
  ).toBeVisible();

  // Paso 9: Cierra sesión e ingresa con la cuenta de Martita Becerra (quien hizo la oferta inicial)
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/.*login/);

  await page.locator('#email').fill(ofertante.email);
  await page.locator('#password').fill(ofertante.password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/.*dashboard/);

  // Paso 10: Martita navega a su "Historial" y comprueba que también se registró la contraoferta recibida
  await page.getByRole('link', { name: 'Historial' }).click();
  await expect(page).toHaveURL(/.*history/);
  await expect(
    page.getByText(`Recibiste una contraoferta por «${publicacionConOferta}» de ${dueno.nombre}`).first()
  ).toBeVisible();
});
