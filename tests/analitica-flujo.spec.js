// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Flujo de Analítica de Producto E2E', () => {
    test('1. Permite acceso público sin autenticación a /analitics y sus alias', async ({ page }) => {
        // Acceso directo sin sesión
        await page.goto('http://localhost:5173/analitics');
        await expect(page).toHaveURL(/.*analitics/);
        await expect(page.getByRole('heading', { name: 'Panel de Analítica' })).toBeVisible();

        // Enlace para iniciar sesión visible para visitantes anónimos
        await expect(page.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();

        // Probar alias /analitica
        await page.goto('http://localhost:5173/analitica');
        await expect(page).toHaveURL(/.*analitica/);
        await expect(page.getByRole('heading', { name: 'Panel de Analítica' })).toBeVisible();
    });

    test('2. Registra publicacion_iniciada y publicacion_guardada al completar el flujo y se reflejan en /analitics', async ({ page }) => {
        const credenciales = {
            email: 'martita@truequeu.com',
            password: 'Password123!',
        };

        const tituloUnico = `Manual de Física - ${Date.now()}`;

        // Iniciar sesión
        await page.goto('http://localhost:5173/login');
        await page.locator('#email').fill(credenciales.email);
        await page.locator('#password').fill(credenciales.password);
        await page.getByRole('button', { name: 'Ingresar' }).click();
        await expect(page).toHaveURL(/.*dashboard/);

        // Ir a Mis publicaciones
        await page.getByRole('link', { name: 'Mis publicaciones' }).click();
        await expect(page).toHaveURL(/.*posts/);

        // Paso A: Abrir modal (+ Nueva publicación) -> Dispara publicacion_iniciada
        await page.getByRole('button', { name: 'Nueva publicación' }).click();

        // Paso B: Llenar formulario con título, categoría y condición
        await page.getByPlaceholder('Ej. Calculadora científica Casio').fill(tituloUnico);
        await page.locator('select').filter({ hasText: 'Elige una categoría' }).selectOption('libros');
        await page.locator('select').filter({ hasText: 'Elige la condición' }).selectOption('usado');

        // Paso C: Presionar "Publicar" -> Dispara publicacion_guardada al tener éxito
        await page.getByRole('button', { name: 'Publicar' }).click();

        // Esperar a que la publicación aparezca en la lista
        await expect(page.getByText(tituloUnico)).toBeVisible();

        // Paso D: Navegar al Panel de Analítica desde el Navbar
        await page.getByRole('link', { name: 'Analítica' }).click();
        await expect(page).toHaveURL(/.*analitics/);

        // Verificar que el panel carga y muestra los eventos
        await expect(page.getByRole('heading', { name: 'Panel de Analítica' })).toBeVisible();

        // Verificar que en la tabla de últimos eventos aparecen publicacion_guardada y publicacion_iniciada
        const tabla = page.locator('table');
        await expect(tabla).toBeVisible();
        await expect(page.getByText('publicacion_guardada').first()).toBeVisible();
        await expect(page.getByText('publicacion_iniciada').first()).toBeVisible();

        // Verificar que en los props de publicacion_guardada se ven solo categoria y condicion
        await expect(page.getByText('categoria: libros').first()).toBeVisible();

        // Verificar que el título personal NO aparece en los props de la tabla
        await expect(page.locator('tbody').getByText(tituloUnico)).toHaveCount(0);
    });
});
