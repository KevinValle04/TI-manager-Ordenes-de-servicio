import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import puppeteer from 'puppeteer';

export interface CotizacionPdfData {
  numeroPresupuesto: string;
  cliente: string;
  fecha: string;
  vigencia: string;
  subtotal: number;
  utilidad: number;
  total: number;
  estado: string;
  items: Array<{
    descripcion: string;
    cantidad: number;
    unidad: string;
    precioUnitario: number;
    subtotal: number;
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

export class CotizacionPdfGenerator {
  private formatoMoneda(valor: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(valor);
  }

  private formatoFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private async obtenerPlantillaHtml(): Promise<string> {
    const rutaPlantilla = path.join(__dirname, '../templates/cotizacion.html');
    return fs.promises.readFile(rutaPlantilla, 'utf-8');
  }

  public async generarPdfCotizacion(datos: CotizacionPdfData): Promise<Buffer> {
    try {
      // Preparar datos para la plantilla
      const datosFormateados = {
        ...datos,
        fecha: this.formatoFecha(datos.fecha),
        vigencia: this.formatoFecha(datos.vigencia),
        subtotal: this.formatoMoneda(datos.subtotal),
        total: this.formatoMoneda(datos.total),
        items: datos.items.map(item => ({
          ...item,
          precioUnitario: this.formatoMoneda(item.precioUnitario),
          subtotal: this.formatoMoneda(item.subtotal)
        }))
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
      throw new Error('Error al generar PDF de cotización');
    }
  }
}