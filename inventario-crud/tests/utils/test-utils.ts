import { Page } from '@playwright/test';
import * as dotenv from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Configuración del entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: `${__dirname}/../../.env` });

// Aseguramos que las variables de entorno no sean undefined
const USER = process.env.TEST_USER ?? '';
const PASS = process.env.TEST_PASS ?? '';

// Validación temprana de variables de entorno requeridas
if (!USER || !PASS) {
  throw new Error('TEST_USER and TEST_PASS environment variables must be set');
}

export async function login(page: Page) {
  await page.goto("http://localhost/login");
  await page.getByPlaceholder("Usuario").fill(USER);
  await page.getByPlaceholder("Contraseña").fill(PASS);
  await page.getByRole("button", { name: /Entrar/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 10000 }).catch(() => {});
}

export async function navigateTo(page: Page, route: string) {
  await page.goto(`http://localhost/${route}`);
  await page.waitForLoadState("networkidle");
}