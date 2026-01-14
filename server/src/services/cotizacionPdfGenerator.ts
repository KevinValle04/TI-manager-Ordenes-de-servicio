import fs from 'fs';
import handlebars from 'handlebars';
import path from 'path';
import puppeteer from 'puppeteer';

export interface CotizacionPdfData {
  numeroPresupuesto: string;
  cliente: {
    nombre: string;
    compania: string;
    direccion: string;
    ciudad: string;
    telefono: string;
    email: string;
  };
  fecha: string;
  vigencia: string;
  subtotal: number;
  iva: number;
  ivaImporte: number;
  total: number;
  estado: string;
  moneda?: string;
  items: Array<{
    descripcion: string;
    marca?: string;
    modelo?: string;
    concepto?: string;
    cantidad: number;
    unidad: string;
    precioUnitario: number;
    subtotal: number;
    aplicarIva: boolean;
    iva?: number;
    esSeparador?: boolean;
  }>;
  comentarios?: string;
  comentariosPdf?: string;
  razonSocial?: {
    nombre: string;
    rfc: string;
    emailEmpresa: string;
    telEmpresa: string;
    direccionEmpresa: string;
  };
  vendedor?: {
    nombre?: string;
    email?: string;
    telefono?: string;
  };
}

export class CotizacionPdfGenerator {
  private formatoMoneda(valor: number, moneda: string = 'MXN'): string {
    const locale = moneda === 'USD' ? 'en-US' : 'es-MX';
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: moneda
    }).format(valor);
    
    // Si es USD, agregar explícitamente "USD" al final para mayor claridad
    if (moneda === 'USD') {
      return `${formatted} USD`;
    }
    
    return formatted;
  }

  private formatoFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private async obtenerPlantillaHtml(): Promise<string> {
    // Registrar helpers de Handlebars
    handlebars.registerHelper('multiply', (a: number, b: number) => {
      return a * b;
    });
    
    handlebars.registerHelper('divide', (a: number, b: number) => {
      return a / b;
    });
    
    handlebars.registerHelper('formatCurrency', (value: number) => {
      return this.formatoMoneda(value);
    });

    handlebars.registerHelper('increment', (value: number) => {
      return value + 1;
    });
    
    handlebars.registerHelper('reduce', (array, prop, initial) => {
      return array.reduce((acc: number, item: any) => acc + (item[prop] || 0), initial);
    });

    const formatCurrency = this.formatoMoneda.bind(this);
    handlebars.registerHelper('formatCurrency', (value: number) => {
      return formatCurrency(value);
    });

    const rutaPlantilla = path.join(__dirname, '../templates/cotizacion.html');
    return fs.promises.readFile(rutaPlantilla, 'utf-8');
  }

  public async generarPdfCotizacion(datos: CotizacionPdfData): Promise<Buffer> {
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

      // Cargar otras imágenes (bottom / footers) y convertir a base64
      const topPath = path.join(__dirname, '../templates/img/top.png');
      const bottom1Path = path.join(__dirname, '../templates/img/bottom.png');
      const bottom2Path = path.join(__dirname, '../templates/img/bottom-2.png');
      const downPath = path.join(__dirname, '../templates/img/down.png');

      let topBase64 = '';
      let bottom1Base64 = '';
      let bottom2Base64 = '';
      let downBase64 = '';

      try {
        if (fs.existsSync(topPath)) {
          const buf = fs.readFileSync(topPath);
          topBase64 = `data:image/png;base64,${buf.toString('base64')}`;
        }
      } catch (e) {
        console.warn('No se pudo cargar top.png:', e);
      }

      try {
        if (fs.existsSync(bottom1Path)) {
          const buf = fs.readFileSync(bottom1Path);
          bottom1Base64 = `data:image/png;base64,${buf.toString('base64')}`;
        }
      } catch (e) {
        console.warn('No se pudo cargar bottom.png:', e);
      }

      try {
        if (fs.existsSync(bottom2Path)) {
          const buf = fs.readFileSync(bottom2Path);
          bottom2Base64 = `data:image/png;base64,${buf.toString('base64')}`;
        }
      } catch (e) {
        console.warn('No se pudo cargar bottom-2.png:', e);
      }

      try {
        if (fs.existsSync(downPath)) {
          const buf = fs.readFileSync(downPath);
          downBase64 = `data:image/png;base64,${buf.toString('base64')}`;
        }
      } catch (e) {
        console.warn('No se pudo cargar down.png:', e);
      }

      // Preparar datos para la plantilla
      const moneda = datos.moneda || 'MXN';
      const nombreMoneda = moneda === 'USD' ? 'Dólares' : 'Pesos';
      
      const datosFormateados = {
        ...datos,
        logoPath: logoBase64,
        topImg: topBase64,
        bottom1: bottom1Base64,
        bottom2: bottom2Base64,
        downImg: downBase64,
        fecha: this.formatoFecha(datos.fecha),
        vigencia: this.formatoFecha(datos.vigencia),
        subtotal: this.formatoMoneda(datos.subtotal, moneda),
        total: this.formatoMoneda(datos.total, moneda),
        nombreMoneda: nombreMoneda,
        razonSocial: datos.razonSocial, // Pasar datos de razón social
        items: datos.items.map(item => ({
          ...item,
          precioUnitario: this.formatoMoneda(item.precioUnitario, moneda),
          subtotal: this.formatoMoneda(item.subtotal, moneda)
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