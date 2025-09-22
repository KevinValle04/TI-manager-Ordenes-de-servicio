import { expect, test } from '@playwright/test';
import { login, navigateTo } from '../utils/test-utils';

test('Crear y eliminar artículo vacío en inventario', async ({ page }) => {
  // Login y navegación
  await login(page);
  await navigateTo(page, 'inventario');

  // Esperar y hacer clic en botón agregar
  const addButton = page.getByRole('button', { name: /Agregar Artículo/i });
  await expect(addButton).toBeVisible({ timeout: 10000 });
  await addButton.click();

  // Verificar que el modal está visible
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();

  // Hacer clic en guardar sin llenar campos
  await page.getByRole('button', { name: /Guardar/i }).click();

  // Esperar que el modal se cierre
  await expect(modal).not.toBeVisible({ timeout: 10000 });

  // Buscar el artículo vacío iterando por las filas
  const rows = page.locator('tbody tr');
  const rowCount = await rows.count();
  let emptyRow = null;

  for (let i = 0; i < rowCount; i++) {
    const currentRow = rows.nth(i);
    const cells = currentRow.locator('td');
    const descripcion = await cells.nth(0).textContent();
    const marca = await cells.nth(1).textContent();
    const modelo = await cells.nth(2).textContent();
    
    // Verificar si los campos principales están vacíos
    if (!descripcion?.trim() && !marca?.trim() && !modelo?.trim()) {
      emptyRow = currentRow;
      break;
    }
  }

  // Verificar que encontramos una fila vacía
  expect(emptyRow).not.toBeNull();
  await expect(emptyRow!).toBeVisible();

  // Verificar solo los campos que deberían estar vacíos
  const cells = emptyRow!.locator('td');
  await expect(cells.nth(0)).toHaveText(''); // descripción
  await expect(cells.nth(1)).toHaveText(''); // marca
  await expect(cells.nth(2)).toHaveText(''); // modelo
  await expect(cells.nth(4)).toHaveText('0'); // cantidad
  
  // Verificar que el precio sea 0 en cualquier formato
  const precioText = await cells.nth(5).textContent();
  expect(['0', '$0.00', '0.00'].includes(precioText?.trim() || '')).toBeTruthy();

  // Eliminar el artículo
  const deleteButton = emptyRow!.getByRole('button', { name: /Eliminar/i });
  
  // Configurar el manejador del diálogo
  page.once('dialog', async dialog => {
    await dialog.accept();
  });

  await deleteButton.click();
  await page.waitForTimeout(1000);

  // Verificar que la fila ya no existe
  const rowStillExists = await emptyRow!.isVisible().catch(() => false);
  expect(rowStillExists).toBe(false);
});

test('CRUD de inventario exterior', async ({ page }) => {
  // Login y navegación usando las utilidades
  await login(page);
  await navigateTo(page, 'inventarioExterior');

  // Espera explícita por el botón para mayor robustez
  const addButton = page.getByRole('button', { name: /Agregar Artículo/i });
  await expect(addButton).toBeVisible({ timeout: 10000 });
  await addButton.click();

  // Llenar campos por label (no por placeholder)
  await page.getByLabel('Descripción').fill('Artículo de prueba exterior');
  await page.getByLabel('Marca').fill('MarcaTestExterior');
  await page.getByLabel('Modelo').fill('ModeloTestExterior');
  await page.getByLabel('Proveedor').fill('ProveedorTestExterior');
  await page.getByLabel('Precio Unitario').fill('321.45');
  await page.getByLabel('Cantidad').fill('5');
  await page.getByRole('button', { name: /Guardar/i }).click();

  // Espera a que desaparezca el modal antes de buscar en la tabla
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

  // Usa la barra de búsqueda para filtrar por el nombre del artículo
  const searchBar = page.getByPlaceholder('Buscar por descripción, marca, modelo o categoría...');
  await searchBar.fill('MarcaTestExterior');

  // Busca la fila por la celda de marca
  const row = page.locator('tbody tr').filter({ has: page.getByText('MarcaTestExterior') });
  await expect(row).toBeVisible({ timeout: 10000 });
  // Valida que la fila tenga las celdas correctas
  await expect(row.locator('td')).toContainText(['MarcaTestExterior', 'ModeloTestExterior', 'Artículo de prueba exterior']);

  // Editar artículo
  await row.getByRole('button', { name: /Editar/i }).click();
  await page.getByLabel('Marca').fill('MarcaTestExteriorEditada');
  await page.getByRole('button', { name: /Guardar/i }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

  // Filtra por la marca editada
  await searchBar.fill('MarcaTestExteriorEditada');

  // Validar cambio
  const rowEdit = page.locator('tbody tr').filter({ has: page.getByText('MarcaTestExteriorEditada') });
  await expect(rowEdit).toBeVisible({ timeout: 10000 });
  await expect(rowEdit.locator('td')).toContainText(['MarcaTestExteriorEditada', 'ModeloTestExterior', 'Artículo de prueba exterior']);

  // Eliminar artículo
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toMatch(/¿Estás seguro de que deseas eliminar este artículo?/);
    await dialog.accept();
  });
  await rowEdit.getByRole('button', { name: /Eliminar/i }).click();

  // Espera a que desaparezca la fila
  await expect(rowEdit).not.toBeVisible({ timeout: 10000 });
});