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

// Validate environment variables are loaded
if (!USER || !PASS) {
  throw new Error('TEST_USER and TEST_PASS environment variables must be set');
}

test('CRUD de inventario', async ({ page }) => {
  // Login antes de acceder a inventario
  await page.goto('http://localhost/login');
  await page.getByPlaceholder('Usuario').fill(USER);
  await page.getByPlaceholder('Contraseña').fill(PASS);
  await page.getByRole('button', { name: /Entrar/i }).click();
  // Espera a que desaparezca el formulario de login
  await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});

  // Ahora navega a inventario
  await page.goto('http://localhost/inventario');
  await page.waitForLoadState('networkidle');

  // Espera explícita por el botón para mayor robustez
  const addButton = page.getByRole('button', { name: /Agregar Artículo/i });
  await expect(addButton).toBeVisible({ timeout: 10000 });
  await addButton.click();

  // Llenar campos por label (no por placeholder)
  await page.getByLabel('Descripción').fill('Artículo de prueba');
  await page.getByLabel('Marca').fill('MarcaTest');
  await page.getByLabel('Modelo').fill('ModeloTest');
  await page.getByLabel('Proveedor').fill('ProveedorTest');
  await page.getByLabel('Precio Unitario').fill('123.45');
  await page.getByLabel('Cantidad').fill('10');
  await page.getByRole('button', { name: /Guardar/i }).click();

  // Espera a que desaparezca el modal antes de buscar en la tabla
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

  // Usa la barra de búsqueda para filtrar por el nombre del artículo
  const searchBar = page.getByPlaceholder('Buscar por descripción, marca, modelo o categoría...');
  await searchBar.fill('MarcaTest');

  // Busca la fila por la celda de marca
  const row = page.locator('tbody tr').filter({ has: page.getByText('MarcaTest') });
  await expect(row).toBeVisible({ timeout: 10000 });
  // Valida que la fila tenga las celdas correctas
  await expect(row.locator('td')).toContainText(['MarcaTest', 'ModeloTest', 'Artículo de prueba']);

  // Editar artículo
  await row.getByRole('button', { name: /Editar/i }).click();
  await page.getByLabel('Marca').fill('MarcaTestEditada');
  await page.getByRole('button', { name: /Guardar/i }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

  // Filtra por la marca editada
  await searchBar.fill('MarcaTestEditada');

  // Validar cambio
  const rowEdit = page.locator('tbody tr').filter({ has: page.getByText('MarcaTestEditada') });
  await expect(rowEdit).toBeVisible({ timeout: 10000 });
  await expect(rowEdit.locator('td')).toContainText(['MarcaTestEditada', 'ModeloTest', 'Artículo de prueba']);

  // Eliminar artículo
  // Intercepta el diálogo de confirmación y acepta
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toMatch(/¿Estás seguro de que deseas eliminar este artículo?/);
    await dialog.accept();
  });
  await rowEdit.getByRole('button', { name: /Eliminar/i }).click();

  // Espera a que desaparezca la fila
  await expect(rowEdit).not.toBeVisible({ timeout: 10000 });
});
