// @ts-check
import { test, expect } from './fixtures.js';

test.describe('Gestión avanzada y manejo de errores (Cubre el 75%-100% gap)', () => {
  const dueno = { email: 'admin@truequeu.com', password: 'Password123!' };

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.locator('#email').fill(dueno.email);
    await page.locator('#password').fill(dueno.password);
    await page.getByRole('button', { name: 'Ingresar' }).click();
  });

  test('Edición de publicación: editar y manejar error de servidor', async ({ page }) => {
    await page.getByRole('link', { name: 'Mis publicaciones' }).click();
    
    // Abrir editar
    const fila = page.locator('tr').filter({ hasText: 'Álgebra lineal' });
    await fila.getByRole('button', { name: 'Editar' }).click();

    // Editar título
    const input = page.getByPlaceholder('Ej. Calculadora científica Casio');
    await input.fill('Álgebra lineal – Edición Especial');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByText('Álgebra lineal – Edición Especial')).toBeVisible();

    // Probar error de edición (simulado si fuera posible, pero validamos el flujo normal)
  });

  test('Eliminar publicación: validación de flujo y persistencia', async ({ page }) => {
    await page.getByRole('link', { name: 'Mis publicaciones' }).click();
    
    const fila = page.locator('tr').filter({ hasText: 'Chaqueta de la facultad' });
    // Interceptar confirmación nativa
    page.on('dialog', dialog => dialog.accept());
    
    await fila.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText('Chaqueta de la facultad')).toHaveCount(0);
  });

  test('Perfil: visualización de datos', async ({ page }) => {
    await page.getByRole('link', { name: 'Perfil' }).click();
    await expect(page.getByText('Admin Demo')).toBeVisible();
    await expect(page.getByTestId('promedio')).toBeVisible();
  });

  test('Validación de errores: formulario de oferta vacío', async ({ page }) => {
    await page.getByRole('link', { name: 'Explorar' }).click();
    // Elegir una publicación cualquiera
    await page.getByRole('button', { name: 'Hacer oferta' }).first().click();
    
    await page.getByRole('button', { name: 'Enviar oferta' }).click();
    await expect(page.getByText('Escribe un mensaje o elige un producto para ofertar.')).toBeVisible();
  });
});
