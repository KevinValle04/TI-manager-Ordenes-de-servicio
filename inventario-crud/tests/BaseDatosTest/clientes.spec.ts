import { expect, test } from '@playwright/test';
import { login, navigateTo } from '../utils/test-utils';

test('Crear cliente con campos vacíos', async ({ page }) => {
  // Login y navegación usando las utilidades
  await login(page);
  await navigateTo(page, 'clientes');

  // Abre el modal de nuevo cliente
  const addButton = page.getByRole('button', { name: /Agregar Cliente/i });
  await expect(addButton).toBeVisible({ timeout: 10000 });
  await addButton.click();

  // Espera el modal
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible({ timeout: 10000 });

  // Guardar sin llenar ningún campo
  await modal.getByRole('button', { name: /Guardar/i }).click();

  // Espera a que desaparezca el modal (indicando que se guardó exitosamente)
  await expect(modal).not.toBeVisible({ timeout: 10000 });

  // Verifica que el cliente vacío aparezca en la lista
  const row = page.locator('tbody tr').first();
  await expect(row).toBeVisible({ timeout: 10000 });

  // Verifica que los campos estén vacíos
  const cells = row.locator('td');
  await expect(cells.nth(0)).toHaveText(''); // Empresa
  await expect(cells.nth(1)).toHaveText(''); // Dirección
  await expect(cells.nth(2)).toHaveText(''); // Teléfono

  // Eliminar el cliente vacío
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toMatch(/¿Eliminar cliente?/);
    await dialog.accept();
  });
  await row.getByRole('button', { name: /Eliminar/i }).click();

  // Espera a que desaparezca la fila
  await expect(row).not.toBeVisible({ timeout: 10000 });
});

test('CRUD de clientes', async ({ page }) => {
  // Login y navegación usando las utilidades
  await login(page);
  await navigateTo(page, 'clientes');

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
  await modal.getByLabel('Teléfono', { exact: true }).first().fill('5551234567');

  // Contacto principal
  await modal.getByLabel('Nombre').fill('Contacto Test');
  await modal.getByLabel('Puesto').fill('Gerente');
  await modal.getByLabel('Correo').fill('contacto@test.com');
  await modal.getByLabel('Teléfono').nth(1).fill('5559876543');
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
  await modal.getByLabel('Teléfono', { exact: true }).first().fill('5557654321');

  await modal.getByLabel('Nombre').fill('Contacto Editado');
  await modal.getByLabel('Puesto').fill('Director');
  await modal.getByLabel('Correo').fill('editado@test.com');
  await modal.getByLabel('Teléfono').nth(1).fill('5551112222');
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