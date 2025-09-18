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

test("Crear razón social con campos vacíos", async ({ page }) => {
  // ---- LOGIN ----
  await page.goto("http://localhost/login");
  await page.getByPlaceholder("Usuario").fill(USER);
  await page.getByPlaceholder("Contraseña").fill(PASS);
  await page.getByRole("button", { name: /Entrar/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 10000 }).catch(() => {});

  // ---- IR A RAZONES SOCIALES ----
  await page.goto("http://localhost/razones-sociales");
  await page.waitForLoadState("networkidle");

  // ---- AGREGAR RAZÓN SOCIAL VACÍA ----
  const addButton = page.getByRole("button", { name: /Agregar Razón Social/i });
  await expect(addButton).toBeVisible({ timeout: 10000 });
  await addButton.click();

  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible({ timeout: 10000 });

  // Guardar sin llenar ningún campo
  await modal.getByRole("button", { name: /Guardar/i }).click();
  
  // El modal debe cerrarse (indica que se guardó correctamente)
  await expect(modal).not.toBeVisible({ timeout: 10000 });

  // Buscar la razón social vacía usando el buscador
  const searchBar = page.getByPlaceholder("Buscar por nombre, RFC, email o dirección...");
  // Limpiar el buscador para asegurarnos de que muestre todo
  await searchBar.fill('');
  await page.waitForTimeout(1000); // Esperar a que se actualice la lista

  // Buscar la fila que tenga todos los campos vacíos
  const row = page.locator("tbody tr").filter({
    has: page.locator("td:nth-child(1):empty") // Busca una fila donde la primera celda esté vacía
  }).first();
  await expect(row).toBeVisible({ timeout: 10000 });

  // Verificar que todos los campos estén vacíos
  const cells = row.locator("td");
  await expect(cells.nth(0)).toHaveText(''); // Nombre
  await expect(cells.nth(1)).toHaveText(''); // RFC
  await expect(cells.nth(2)).toHaveText(''); // Email empresa

  // Eliminar la razón social vacía
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    expect(dialog.message()).toMatch(/¿Eliminar razón social\?/);
    await dialog.accept();
  });
  await row.getByRole("button", { name: /Eliminar/i }).click();

  // Verificar que se eliminó
  await expect(row).not.toBeVisible({ timeout: 10000 });
});

test("CRUD de Razones Sociales", async ({ page }) => {
  // ---- LOGIN ----
  await page.goto("http://localhost/login");
  await page.getByPlaceholder("Usuario").fill(USER);
  await page.getByPlaceholder("Contraseña").fill(PASS);
  await page.getByRole("button", { name: /Entrar/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 10000 }).catch(() => {});

  // ---- IR A RAZONES SOCIALES ----
  await page.goto("http://localhost/razones-sociales");
  await page.waitForLoadState("networkidle");

  // ---- AGREGAR ----
  const addButton = page.getByRole("button", { name: /Agregar Razón Social/i });
  await expect(addButton).toBeVisible({ timeout: 10000 });
  await addButton.click();

  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible({ timeout: 10000 });

    // Campos principales (usar id para evitar ambigüedad)
    await modal.locator('#razon-nombre').fill('Razón Social Test');
    await modal.locator('#razon-rfc').fill('TEST123456ABC');
    await modal.locator('#razon-emailEmpresa').fill('empresa@test.com');
    await modal.locator('#razon-telEmpresa').fill('5551234567');
    await modal.locator('#razon-celEmpresa').fill('5557654321');
    await modal.locator('#razon-direccionEmpresa').fill('Calle Falsa 123');
    await modal.locator('#razon-emailFacturacion').fill('facturacion@test.com');

  // Dirección de envío (usar placeholders)
  await modal.getByPlaceholder("Nombre de la dirección").fill("Sucursal Centro");
  await modal.getByPlaceholder("Teléfono (opcional)").fill("5559998888");
  await modal.getByPlaceholder("Dirección completa").fill("Av. Central 45");
  await modal.getByPlaceholder("Persona de contacto (opcional)").fill("Carlos Pérez");

  // Guardar
  await modal.getByRole("button", { name: /Guardar/i }).click();
  await expect(modal).not.toBeVisible({ timeout: 10000 });

  // ---- VERIFICAR ----
  const searchBar = page.getByPlaceholder("Buscar por nombre, RFC, email o dirección...");
  await searchBar.fill("Razón Social Test");

  const row = page.locator("tbody tr").filter({ has: page.getByText("Razón Social Test") });
  await expect(row).toBeVisible({ timeout: 10000 });
  await expect(row.locator("td")).toContainText([
    "Razón Social Test",
    "TEST123456ABC",
    "empresa@test.com",
  ]);

  // ---- EDITAR ----
  await row.getByRole("button", { name: /Editar/i }).click();
  const editModal = page.getByRole("dialog");
  await expect(editModal).toBeVisible({ timeout: 10000 });

    await editModal.locator('#razon-nombre').fill('Razón Social Editada');
    await editModal.locator('#razon-rfc').fill('EDIT987654ZYX');
    await editModal.locator('#razon-telEmpresa').fill('5554443322');
    await editModal.locator('#razon-direccionEmpresa').fill('Calle Nueva 456');

  // Editar dirección de envío
  await editModal.getByPlaceholder("Nombre de la dirección").fill("Sucursal Norte");
  await editModal.getByPlaceholder("Teléfono (opcional)").fill("5552221111");
  await editModal.getByPlaceholder("Dirección completa").fill("Av. Norte 99");
  await editModal.getByPlaceholder("Persona de contacto (opcional)").fill("Ana Gómez");

  await editModal.getByRole("button", { name: /Guardar/i }).click();
  await expect(editModal).not.toBeVisible({ timeout: 10000 });

  // ---- CONFIRMAR EDICIÓN ----
  await searchBar.fill("Razón Social Editada");
  const rowEdit = page.locator("tbody tr").filter({ has: page.getByText("Razón Social Editada") });
  await expect(rowEdit).toBeVisible({ timeout: 10000 });
  await expect(rowEdit.locator("td")).toContainText([
    "Razón Social Editada",
    "EDIT987654ZYX",
    "5554443322",
  ]);

  // ---- ELIMINAR ----
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    expect(dialog.message()).toMatch(/¿Eliminar razón social\?/);
    await dialog.accept();
  });
  await rowEdit.getByRole("button", { name: /Eliminar/i }).click();

  await expect(rowEdit).not.toBeVisible({ timeout: 10000 });
});
