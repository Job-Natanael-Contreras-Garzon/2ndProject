// @ts-check
import { test, expect } from '@playwright/test';

test('ana publica un objeto', async ({ page }) => {
  // =========================================================================
  // 1. DATOS DE LA PRUEBA (Arrange / Preparación)
  // =========================================================================
  // Usamos el usuario de prueba preconfigurado en la base de datos (seed)
  const credenciales = {
    email: 'martita@truequeu.com',
    password: 'Password123!',
  };

  // Generamos un título con marca de tiempo para que la prueba siempre sea única e independiente
  const nuevoObjeto = {
    titulo: `Libro Cálculo Stewart - Edición ${Date.now().toString().slice(-4)}`,
    categoria: 'libros', // Opciones del select: 'libros', 'electronica', 'ropa', 'otros'
    condicion: 'usado',  // Opciones del select: 'nuevo', 'usado'
  };

  // =========================================================================
  // 2. INICIO DE SESIÓN (Ana ingresa a Trueque U)
  // =========================================================================
  // Paso 1: Ana navega a la pantalla de login
  await page.goto('http://localhost:5173/login');

  // Paso 2: Llena sus credenciales y presiona "Ingresar"
  await page.locator('#email').fill(credenciales.email);
  await page.locator('#password').fill(credenciales.password);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  // Paso 3: Confirmamos que el sistema la redirige al Dashboard principal
  await expect(page).toHaveURL(/.*dashboard/);

  // =========================================================================
  // 3. NAVEGACIÓN Y PUBLICACIÓN (Ana registra su artículo)
  // =========================================================================
  // Paso 4: Ana da clic en "Mis publicaciones" en la barra de navegación superior
  await page.getByRole('link', { name: 'Mis publicaciones' }).click();
  await expect(page).toHaveURL(/.*posts/);

  // Paso 5: Ana presiona el botón para abrir la ventana de nueva publicación
  await page.getByRole('button', { name: 'Nueva publicación' }).click();

  // Paso 6: Llena los campos del formulario modal
  await page.getByPlaceholder('Ej. Calculadora científica Casio').fill(nuevoObjeto.titulo);

  // Selecciona la categoría en el menú desplegable
  await page.locator('select').filter({ hasText: 'Elige una categoría' }).selectOption(nuevoObjeto.categoria);

  // Selecciona la condición en el menú desplegable
  await page.locator('select').filter({ hasText: 'Elige la condición' }).selectOption(nuevoObjeto.condicion);

  // Paso 7: Presiona el botón "Publicar"
  await page.getByRole('button', { name: 'Publicar' }).click();

  // =========================================================================
  // 4. VERIFICACIÓN (Assert / Resultado esperado)
  // =========================================================================
  // Comprobamos que el título del objeto que Ana acaba de publicar ya aparece en su tabla
  await expect(page.getByText(nuevoObjeto.titulo)).toBeVisible();
});
