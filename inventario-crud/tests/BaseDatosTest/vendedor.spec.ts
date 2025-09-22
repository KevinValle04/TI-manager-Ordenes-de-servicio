import { expect, test } from "@playwright/test";
import { login, navigateTo } from '../utils/test-utils';

test("CRUD de Vendedores", async ({ page }) => {
  // Login y navegación usando las utilidades
  await login(page);
  await navigateTo(page, 'vendedores');

  // ---- AGREGAR ----
  const btnAgregar = page.getByRole("button", { name: /Agregar Vendedor/i });
  await expect(btnAgregar).toBeVisible({ timeout: 10000 });
  await btnAgregar.click();

  const modalAgregar = page.getByRole("dialog");
  await expect(modalAgregar).toBeVisible({ timeout: 10000 });

  // Campos principales (usar id para evitar ambigüedad)
  await modalAgregar.locator('#vendedor-nombre').fill('Vendedor Test');
  await modalAgregar.locator('#vendedor-correo').fill('vendedor@test.com');
  await modalAgregar.locator('#vendedor-telefono').fill('5551234567');

  // Guardar
  await modalAgregar.getByRole("button", { name: /Guardar/i }).click();
  await expect(modalAgregar).not.toBeVisible({ timeout: 10000 });

  // ---- VERIFICAR ----
  const searchBar = page.getByPlaceholder("Buscar por nombre, correo o teléfono...");
  await searchBar.fill("Vendedor Test");

  const row = page.locator("tbody tr").filter({ has: page.getByText("Vendedor Test") });
  await expect(row).toBeVisible({ timeout: 10000 });
  await expect(row.locator("td")).toContainText([
    "Vendedor Test",
    "vendedor@test.com",
    "5551234567",
  ]);

  // ---- EDITAR ----
  await row.getByRole("button", { name: /Editar/i }).click();
  const editModal = page.getByRole("dialog");
  await expect(editModal).toBeVisible({ timeout: 10000 });

  await editModal.locator('#vendedor-nombre').fill('Vendedor Editado');
  await editModal.locator('#vendedor-correo').fill('editado@test.com');
  await editModal.locator('#vendedor-telefono').fill('5557654321');

  await editModal.getByRole("button", { name: /Guardar/i }).click();
  await expect(editModal).not.toBeVisible({ timeout: 10000 });

  // ---- CONFIRMAR EDICIÓN ----
  await searchBar.fill("Vendedor Editado");
  const rowEdit = page.locator("tbody tr").filter({ has: page.getByText("Vendedor Editado") });
  await expect(rowEdit).toBeVisible({ timeout: 10000 });
  await expect(rowEdit.locator("td")).toContainText([
    "Vendedor Editado",
    "editado@test.com",
    "5557654321",
  ]);

  // ---- ELIMINAR ----
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    expect(dialog.message()).toMatch(/¿Eliminar vendedor\?/);
    await dialog.accept();
  });
  await rowEdit.getByRole("button", { name: /Eliminar/i }).click();

  await expect(rowEdit).not.toBeVisible({ timeout: 10000 });
});