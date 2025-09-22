import { expect, test } from "@playwright/test";
import { login, navigateTo } from '../utils/test-utils';

test("Validación de campos vacíos en Material de Canalización", async ({ page }) => {
  // Login y navegación usando las utilidades
  await login(page);
  await navigateTo(page, 'mat-elec');

  // Contar materiales antes de intentar crear uno vacío
  const initialRowCount = await page.locator('tbody tr').count();

  // ---- INTENTAR AGREGAR MATERIAL VACÍO ----
  const addButton = page.getByRole("button", { name: /Agregar Material de Canalización/i });
  await expect(addButton).toBeVisible({ timeout: 10000 });
  await addButton.click();

  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible({ timeout: 10000 });

  // Intentar guardar sin llenar campos
  await modal.getByRole("button", { name: /Guardar/i }).click();

  // Verificar que aparece el mensaje de error
  const errorAlert = page.getByText("No se pudo guardar el material de canalización");
  await expect(errorAlert).toBeVisible({ timeout: 10000 });

  // El modal debería seguir visible después del error
  await expect(modal).toBeVisible();

  // Cerrar el modal
  await modal.getByRole("button", { name: /Cancelar/i }).click();
  await expect(modal).not.toBeVisible();

  // Verificar que no se agregó ningún material nuevo
  const finalRowCount = await page.locator('tbody tr').count();
  expect(finalRowCount).toBe(initialRowCount);
});

test("CRUD de Material de Canalización", async ({ page }) => {
  // Login y navegación usando las utilidades
  await login(page);
  await navigateTo(page, 'mat-elec');

  // ---- AGREGAR ----
  const unique = Date.now();
  const tipo = `Tubo${unique}`;
  const nombre = `PVC${unique}`;
  const medida = `1/2`;
  const unidad = `PZA`;
  const proveedor = `PLASTIMEX${unique}`;
  const precio = `12.50`;

  const addButton = page.getByRole("button", { name: /Agregar Material de Canalización/i });
  await expect(addButton).toBeVisible({ timeout: 10000 });
  await addButton.click();

  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible({ timeout: 10000 });

  // Campos principales
  await modal.locator('#material-tipo').fill(tipo);
  await modal.locator('#material-nombre').fill(nombre);
  await modal.locator('#material-medida').fill(medida);
  await modal.locator('#material-unidad').selectOption(unidad);
  await modal.locator('#material-proveedor').fill(proveedor);
  await modal.locator('#material-precio').fill(precio);

  // Guardar
  await modal.getByRole("button", { name: /Guardar/i }).click();
  await expect(modal).not.toBeVisible({ timeout: 10000 });

  // ---- VERIFICAR ----
  const searchBar = page.getByPlaceholder("Buscar por tipo, material, medida o proveedor...");
  await searchBar.fill(tipo);
  await page.waitForTimeout(1200);

  const matches = page.locator('tbody tr').filter({ hasText: tipo }).filter({ hasText: nombre });
  await expect(matches).toHaveCount(1, { timeout: 15000 });
  const row = matches.first();
  await expect(row).toBeVisible({ timeout: 15000 });
  await expect(row.locator('td')).toContainText([
    tipo,
    nombre,
    medida,
    unidad,
    proveedor,
    `$${precio}`
  ]);

  // ---- EDITAR ----
  await row.getByRole("button", { name: /Editar/i }).click();
  const editModal = page.getByRole("dialog");
  await expect(editModal).toBeVisible({ timeout: 10000 });

  const tipoEdit = `Charola${unique}`;
  const nombreEdit = `Galvanizado${unique}`;
  const medidaEdit = `2`;
  const unidadEdit = `MTS`;
  const proveedorEdit = `CONDUIT${unique}`;
  const precioEdit = `25.00`;

  await editModal.locator('#material-tipo').fill(tipoEdit);
  await editModal.locator('#material-nombre').fill(nombreEdit);
  await editModal.locator('#material-medida').fill(medidaEdit);
  await editModal.locator('#material-unidad').selectOption(unidadEdit);
  await editModal.locator('#material-proveedor').fill(proveedorEdit);
  await editModal.locator('#material-precio').fill(precioEdit);

  await editModal.getByRole("button", { name: /Guardar/i }).click();
  await expect(editModal).not.toBeVisible({ timeout: 10000 });

  // ---- CONFIRMAR EDICIÓN ----
  await searchBar.fill(tipoEdit);
  await page.waitForTimeout(1200);

  const matchesEdit = page.locator('tbody tr').filter({ hasText: tipoEdit }).filter({ hasText: nombreEdit });
  await expect(matchesEdit).toHaveCount(1, { timeout: 15000 });
  const rowEdit = matchesEdit.first();
  await expect(rowEdit).toBeVisible({ timeout: 15000 });
  await expect(rowEdit.locator('td')).toContainText([
    tipoEdit,
    nombreEdit,
    medidaEdit,
    unidadEdit,
    proveedorEdit,
    `$${precioEdit}`
  ]);

  // ---- ELIMINAR ----
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    expect(dialog.message()).toMatch(/¿Eliminar material de canalización\?/);
    await dialog.accept();
  });
  await rowEdit.getByRole("button", { name: /Eliminar/i }).click();

  await expect(rowEdit).not.toBeVisible({ timeout: 10000 });
});