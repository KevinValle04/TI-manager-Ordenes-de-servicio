import { expect, test } from '@playwright/test';
import * as dotenv from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env file from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: `${__dirname}/../../.env` });

const USER = process.env.TEST_USER;

const PASS = process.env.TEST_PASS;

if (!USER || !PASS) {
  throw new Error('TEST_USER and TEST_PASS environment variables must be set');
}

test('CRUD de clientes', async ({ page }) => {
  // Login antes de acceder a clientes
  await page.goto('http://localhost/login');
  await page.getByPlaceholder('Usuario').fill(USER);
  await page.getByPlaceholder('Contraseña').fill(PASS);
  await page.getByRole('button', { name: /Entrar/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});

  // Navega a clientes
  await page.goto('http://localhost/clientes');
  await page.waitForLoadState('networkidle');

  // Espera explícita por el botón para mayor robustez
  const addButton = page.getByRole('button', { name: /Agregar Cliente/i });
  await expect(addButton).toBeVisible({ timeout: 10000 });
  await addButton.click();

  // Espera el modal
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible({ timeout: 10000 });

  // Llenar campos del cliente
  await modal.getByLabel('Empresa').fill('Empresa Test');
  await modal.getByLabel('Dirección').fill('Dirección Test');
  await modal.getByLabel('Teléfono', { exact: true }).first().fill('5551234567'); // Teléfono empresa

  // Contacto principal
  await modal.getByLabel('Nombre').fill('Contacto Test');
  await modal.getByLabel('Puesto').fill('Gerente');
  await modal.getByLabel('Correo').fill('contacto@test.com');
  await modal.getByLabel('Teléfono').nth(1).fill('5559876543'); // Teléfono contacto
  await modal.getByLabel('Ext').fill('101');

  await modal.getByRole('button', { name: /Guardar/i }).click();

  // Espera a que desaparezca el modal antes de buscar en la lista
  await expect(modal).not.toBeVisible({ timeout: 10000 });

  // Usa la barra de búsqueda para filtrar por la empresa
  const searchBar = page.getByPlaceholder('Buscar por empresa, dirección o contacto...');
  await searchBar.fill('Empresa Test');

  // Busca la fila por la celda de empresa
  const row = page.locator('tbody tr').filter({ has: page.getByText('Empresa Test') });
  await expect(row).toBeVisible({ timeout: 10000 });
  await expect(row.locator('td')).toContainText(['Empresa Test', 'Dirección Test', '5551234567']);

  // Editar cliente
  await row.getByRole('button', { name: /Editar/i }).click();
  await expect(modal).toBeVisible({ timeout: 10000 });

  await modal.getByLabel('Empresa').fill('Empresa Editada');
  await modal.getByLabel('Dirección').fill('Dirección Editada');
  await modal.getByLabel('Teléfono', { exact: true }).first().fill('5557654321'); // Teléfono empresa editado

  await modal.getByLabel('Nombre').fill('Contacto Editado');
  await modal.getByLabel('Puesto').fill('Director');
  await modal.getByLabel('Correo').fill('editado@test.com');
  await modal.getByLabel('Teléfono').nth(1).fill('5551112222'); // Teléfono contacto editado
  await modal.getByLabel('Ext').fill('202');

  await modal.getByRole('button', { name: /Guardar/i }).click();
  await expect(modal).not.toBeVisible({ timeout: 10000 });

  // Filtra por la empresa editada
  await searchBar.fill('Empresa Editada');

  // Validar cambio
  const rowEdit = page.locator('tbody tr').filter({ has: page.getByText('Empresa Editada') });
  await expect(rowEdit).toBeVisible({ timeout: 10000 });
  await expect(rowEdit.locator('td')).toContainText(['Empresa Editada', 'Dirección Editada', '5557654321']);

  // Eliminar cliente
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toMatch(/¿Eliminar cliente?/);
    await dialog.accept();
  });
  await rowEdit.getByRole('button', { name: /Eliminar/i }).click();

  // Espera a que desaparezca la fila
  await expect(rowEdit).not.toBeVisible({ timeout: 10000 });
});
