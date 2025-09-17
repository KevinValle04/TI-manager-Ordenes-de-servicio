import { expect, test } from '@playwright/test';

// @ts-ignore
const USER = process.env.TEST_USER || 'oleal';
// @ts-ignore
const PASS = process.env.TEST_PASS || 'papus';

test('Prueba Herramientas', async ({ page }) => {
	// Login
	await page.goto('http://localhost/login');
	await page.getByPlaceholder('Usuario').fill(USER);
	await page.getByPlaceholder('Contraseña').fill(PASS);
	await page.getByRole('button', { name: /Entrar/i }).click();
	await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});

	// Navega a colaboradores
	await page.goto('http://localhost/colaboradores');
	await page.waitForLoadState('networkidle');

	const nssUnico = String(Math.floor(10000000000 + Math.random() * 89999999999));

	// Crea un nuevo colaborador
	await page.getByRole('button', { name: /Agregar Colaborador/i }).click();
	await page.getByLabel('Nombre').fill('ColaboradorHerramientas');
	await page.getByLabel('Puesto').fill('Tester');
	await page.getByLabel('NSS').fill(nssUnico);
	await page.getByLabel('Fecha Alta IMSS').fill('2025-09-08');
	await page.getByLabel('Razón Social').selectOption({ index: 1 });
	await page.getByRole('button', { name: /Guardar/i }).click();

	// Verifica que el colaborador fue creado
	await expect(page.getByRole('cell', { name: 'ColaboradorHerramientas', exact: true }))
		.toBeVisible();

    // Navega a herramientas
    await page.goto('http://localhost/herramientas');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /ColaboradorHerramientas/i }).click();

	for (let i = 1; i <= 3; i++) {
		await page.getByRole('button', { name: /Agregar Herramienta/i }).click();
		await page.getByLabel('Nombre').fill(`Herramienta ${i}`);
		await page.getByLabel('Marca').fill(`Marca ${i}`);
		await page.getByLabel('Modelo').fill(`Modelo ${i}`);
		await page.getByLabel('Valor').fill(String(1000 * i));
		await page.getByLabel('Número de Serie (S/N)').fill(`SN-${i}`);
		await page.getByRole('button', { name: /Guardar/i }).click();
		// Espera a que aparezca la herramienta en la lista
		await expect(page.getByText(`Herramienta ${i}`)).toBeVisible({ timeout: 30000 });
	}

	

});