import puppeteer from 'puppeteer';
import * as Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

export const generatePDF = async (templatePath: string, data: any): Promise<Buffer> => {
  try {
    // Leer el template
    const template = fs.readFileSync(templatePath, 'utf8');
    
    // Compilar el template con Handlebars
    const compiledTemplate = Handlebars.compile(template);
    const html = compiledTemplate(data, {
      allowProtoPropertiesByDefault: true,
      allowProtoMethodsByDefault: true
    });

    // Iniciar Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Configurar el tamaño de página
    await page.setViewport({
      width: 1200,
      height: 800
    });

    // Cargar el HTML
    await page.setContent(html);

    // Generar el PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      printBackground: true
    });

    // Cerrar el navegador
    await browser.close();

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('Error al generar PDF:', error);
    throw error;
  }
};
