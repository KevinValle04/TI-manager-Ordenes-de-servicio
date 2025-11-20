import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import puppeteer from 'puppeteer';

export interface EntregaPdfData {
  numeroPresupuesto: string;
  cliente: string;
  fecha: string;
  items: Array<{
    clave: number;
    marca?: string;
    modelo?: string;
    descripcion: string;
    cantidad: number;
    unidad: string;
  }>;
  comentarios?: string;
  razonSocial?: {
    nombre: string;
    rfc: string;
    emailEmpresa: string;
    telEmpresa: string;
    direccionEmpresa: string;
  };
}

export class EntregaPdfGenerator {
  private formatoFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private async obtenerPlantillaHtml(): Promise<string> {
    handlebars.registerHelper('increment', (value: number) => {
      return value + 1;
    });

    const rutaPlantilla = path.join(__dirname, '../templates/entrega.html');
    return fs.promises.readFile(rutaPlantilla, 'utf-8');
  }

  public async generarPdfEntrega(datos: EntregaPdfData): Promise<Buffer> {
    try {
      // Cargar el logo y convertir a base64
      const logoPath = path.join(__dirname, '../templates/img/logo.png');
      let logoBase64 = '';
      
      try {
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        }
      } catch (logoError) {
        console.warn('Error cargando logo:', logoError);
      }

      // Preparar datos para la plantilla
      const datosFormateados = {
        ...datos,
        logoPath: logoBase64,
        fecha: this.formatoFecha(datos.fecha),
        items: datos.items
      };

      // Obtener y compilar plantilla
      const plantillaHtml = await this.obtenerPlantillaHtml();
      const template = handlebars.compile(plantillaHtml);
      const html = template(datosFormateados);

      // Generar PDF con Puppeteer
      const browser = await puppeteer.launch({
        headless: true
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' },
        printBackground: true
      });

      await browser.close();
      return Buffer.from(pdfBuffer);

    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw new Error('Error al generar PDF de entrega');
    }
  }
}
