import { expect, test } from "@playwright/test";
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

test("CRUD de Vendedores", async ({ page }) => {
  // ---- LOGIN ----
  await page.goto("http://localhost/login");
  await page.getByPlaceholder("Usuario").fill(USER);
  await page.getByPlaceholder("Contraseña").fill(PASS);
  await page.getByRole("button", { name: /Entrar/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 10000 }).catch(() => {});

  // ---- IR A VENDEDORES ----
  await page.goto("http://localhost/vendedores");
  await page.waitForLoadState("networkidle");

  // ---- AGREGAR ----
  const addButton = page.getByRole("button", { name: /Agregar Vendedor/i });
  await expect(addButton).toBeVisible({ timeout: 10000 });
  await addButton.click();

  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible({ timeout: 10000 });

  // Campos principales (usar id para evitar ambigüedad)
  await modal.locator('#vendedor-nombre').fill('Vendedor Test');
  await modal.locator('#vendedor-correo').fill('vendedor@test.com');
  await modal.locator('#vendedor-telefono').fill('5551234567');

  // Guardar
  await modal.getByRole("button", { name: /Guardar/i }).click();
  await expect(modal).not.toBeVisible({ timeout: 10000 });

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
