import { expect, test } from '@playwright/test';

// @ts-ignore
const USER = process.env.TEST_USER || 'oleal';
// @ts-ignore
const PASS = process.env.TEST_PASS || 'papus';

test('CRUD de colaboradores', async ({ page }) => {
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
  await page.getByLabel('Nombre').fill('Nuevo Colaborador');
  await page.getByLabel('Puesto').fill('Tester');
  await page.getByLabel('NSS').fill(nssUnico);
  await page.getByLabel('Fecha Alta IMSS').fill('2025-09-08');
  await page.getByLabel('Razón Social').selectOption({ index: 1 });
  await page.getByLabel('Fotografía').setInputFiles('test.jpg');
  await page.getByRole('button', { name: /Guardar/i }).click();

  // Verifica que el colaborador fue creado
  await expect(page.getByRole('cell', { name: 'Nuevo Colaborador', exact: true }))
    .toBeVisible();

  // Edita el colaborador
  await page.getByRole('button', { name: /^Editar/ }).first().click();
  await page.getByLabel('Nombre').fill('Colaborador Editado');
  await page.getByRole('button', { name: /Guardar/i }).click();

  // Verifica que la tabla se actualizó
  await expect(page.getByRole('cell', { name: 'Colaborador Editado', exact: true }))
    .toBeVisible({ timeout: 10000 });

  // Elimina el colaborador (un solo click + aceptar confirmación)
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: /^Eliminar/ }).first().click();

  // Espera a que desaparezca de la tabla
  await expect(page.getByRole('cell', { name: 'Colaborador Editado', exact: true }))
    .toHaveCount(0);
});
