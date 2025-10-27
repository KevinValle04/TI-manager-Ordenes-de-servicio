import { expect, test } from "@playwright/test";
import { login, navigateTo } from '../utils/test-utils';

// Configurar timeout extendido para este test debido al procesamiento de PDF con OpenAI
test.setTimeout(300000); // 5 minutos

test("CRUD de Orden de Compra", async ({ page }) => {
  // Login y navegación usando las utilidades
  await login(page);

  // --- Crear Proveedor solo si no existe ---
  await navigateTo(page, 'proveedores');
  const searchBarProv = page.getByPlaceholder('Buscar por empresa, dirección o contacto...');
  await searchBarProv.fill('SYSCOM');
  const rowProv = page.locator('tbody tr').filter({ has: page.getByText('SYSCOM') });
  if (!(await rowProv.isVisible())) {
    await page.getByRole('button', { name: /Agregar Proveedor/i }).click();
    const proveedorModal = page.getByRole('dialog');
    await expect(proveedorModal).toBeVisible({ timeout: 10000 });
    await proveedorModal.getByPlaceholder('Empresa').fill('SYSCOM');
    await proveedorModal.getByPlaceholder('Dirección').fill('Blvrd Federico Benítez López');
    await proveedorModal.getByPlaceholder('Teléfono').first().fill('664 655 1008');
    await proveedorModal.getByPlaceholder('Nombre').fill('RUBÉN ARREOLA ARECHIGA');
    await proveedorModal.getByPlaceholder('Puesto').fill('EJECUTIVO VENTAS');
    await proveedorModal.getByPlaceholder('Correo').fill('RUBEN.ARREOLA@SYSCOM.M');
    await proveedorModal.getByPlaceholder('Teléfono').nth(1).fill('664 655 1008');
    await proveedorModal.getByPlaceholder('Ext').fill('4919');
    await proveedorModal.getByRole('button', { name: /Guardar/i }).click();
    await expect(proveedorModal).not.toBeVisible({ timeout: 10000 });
  }

  // --- Crear Razón Social solo si no existe ---
  await navigateTo(page, 'razones-sociales');
  const searchBarRazon = page.getByPlaceholder("Buscar por nombre, RFC, email o dirección...");
  await searchBarRazon.fill("usuariorazonsocial");
  const rowRazon = page.locator("tbody tr").filter({ has: page.getByText("usuariorazonsocial") });
  if (!(await rowRazon.isVisible())) {
    await page.getByRole('button', { name: /Agregar Razón Social/i }).click();
    const razonModal = page.getByRole('dialog');
    await expect(razonModal).toBeVisible({ timeout: 10000 });
    await razonModal.locator('#razon-nombre').fill('usuariorazonsocial');
    await razonModal.locator('#razon-rfc').fill('DFERGHJKLADSFGHMJ,');
    await razonModal.locator('#razon-emailEmpresa').fill('razonsocial@correo.com');
    await razonModal.locator('#razon-telEmpresa').fill('4567889963');
    await razonModal.locator('#razon-celEmpresa').fill('345657721');
    await razonModal.locator('#razon-direccionEmpresa').fill('Av. Los pinos');
    await razonModal.locator('#razon-emailFacturacion').fill('razonsocial@correo.com');
    await razonModal.getByPlaceholder('Nombre de la dirección').fill('go');
    await razonModal.getByPlaceholder('Teléfono (opcional)').fill('3456788543');
    await razonModal.getByPlaceholder('Dirección completa').fill('av. abeto');
    await razonModal.getByPlaceholder('Persona de contacto (opcional)').fill('2565675765');
    await razonModal.getByRole('button', { name: /Guardar/i }).click();
    await expect(razonModal).not.toBeVisible({ timeout: 10000 });
  }

  // --- Navegar a Órdenes de Compra ---
  await navigateTo(page, 'ordenes-compra');

  // --- Crear Nueva Orden ---
  await page.getByRole("button", { name: "Nueva Orden de Compra" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // --- Seleccionar Proveedor ---
  await page.getByPlaceholder("Escriba el nombre del proveedor").fill("SYSCOM");
  const proveedorOption = page.getByRole("button", { name: /SYSCOM/i });
  await expect(proveedorOption).toBeVisible({ timeout: 5000 });
  await proveedorOption.click();

  // --- Seleccionar Razón Social ---
  await page.getByPlaceholder("Escriba el nombre o RFC").fill("usuariorazonsocial");
  const razonOption = page.getByRole("button", { name: /usuariorazonsocial/i });
  await expect(razonOption).toBeVisible({ timeout: 5000 });
  await razonOption.click();

  // --- Subir PDF ---
  await page.setInputFiles('input[type="file"]', "test.pdf");

  // --- Crear orden y esperar la respuesta ---
  const [response] = await Promise.all([
    page.waitForResponse(res =>
      res.url().includes("/ordenes-compra") && res.request().method() === "POST",
      { timeout: 0 } // Sin timeout - esperar indefinidamente
    ),
    page.getByRole("button", { name: /Crear Orden Directa/i }).click(),
  ]);
  expect(response.ok()).toBeTruthy();

  // --- Verificar en la lista ---
  await navigateTo(page, 'ordenes-compra');
  // Verificar que la tabla tenga al menos una fila con SYSCOM
  await expect(page.locator('tbody tr').filter({ hasText: 'SYSCOM' }).first()).toBeVisible({ timeout: 60000 }); // 1 minuto para que aparezca en la lista

  // --- Editar ---
  await page.locator('tbody tr').filter({ hasText: 'SYSCOM' }).first().getByRole("button", { name: /^Editar/ }).click();
  // Esperar a que aparezca el modal de edición y hacer clic en cancelar dentro del modal
  const modalEdicion = page.getByRole("dialog");
  await expect(modalEdicion).toBeVisible({ timeout: 10000 });
  await modalEdicion.getByRole("button", { name: /Cancelar/i }).first().click();
  await expect(modalEdicion).not.toBeVisible({ timeout: 10000 });

  // --- Abrir PDF generado y tomar captura de pantalla ---
  const [pdfPage] = await Promise.all([
    page.waitForEvent('popup'),
    // Buscar específicamente el botón "Ver PDF" en la primera fila con SYSCOM
    page.locator('tbody tr').filter({ hasText: 'SYSCOM' }).first().getByRole('button', { name: /Ver PDF/i }).click(),
  ]);
  await pdfPage.waitForLoadState('domcontentloaded');
  // Esperar 2 segundos para asegurar que el PDF se renderice
  await pdfPage.waitForTimeout(5000);
  await pdfPage.screenshot({ path: 'orden-compra-visualizacion.png', fullPage: true });

  // --- Eliminar ---
  await navigateTo(page, 'ordenes-compra');
  // Contar filas antes de eliminar
  const filasAntes = await page.locator('tbody tr').count();
  page.once("dialog", (dialog) => dialog.accept());
  // Eliminar específicamente la primera fila con SYSCOM
  await page.locator('tbody tr').filter({ hasText: 'SYSCOM' }).first().getByRole("button", { name: /^Eliminar/ }).click();

  // --- Verificar que se eliminó una fila ---
  await expect(async () => {
    const filasDespues = await page.locator('tbody tr').count();
    expect(filasDespues).toBe(filasAntes - 1);
  }).toPass({ timeout: 10000 });
});