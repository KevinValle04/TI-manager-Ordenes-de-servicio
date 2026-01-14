import fs from 'fs';
import handlebars from 'handlebars';
import path from 'path';
import puppeteer from 'puppeteer';

export interface CotizacionChecklistPdfData {
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
  estado: string;
  items: Array<{
    marca?: string;
    modelo?: string;
    concepto: string;
    cantidad: number;
    unidad: string;
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

export class CotizacionChecklistPdfGenerator {
  private formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private async obtenerPlantillaHtml(): Promise<string> {
    // Registrar helpers de Handlebars
    handlebars.registerHelper('increment', (value: number) => {
      return value + 1;
    });

    const rutaPlantilla = path.join(__dirname, '../templates/cotizacionChecklist.html');
    return fs.promises.readFile(rutaPlantilla, 'utf-8');
  }

  private limpiarDescripcion(descripcion: string): string {
    if (!descripcion || descripcion.trim() === '') {
      return 'Descripción no especificada';
    }
    
    return descripcion.trim()
      .replace(/\s+/g, ' ')
      .replace(/^./, str => str.toUpperCase());
  }

  public async generarPdfChecklistCotizacion(datos: CotizacionChecklistPdfData): Promise<Buffer> {
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
      const datosFormateados = {
        logoPath: logoBase64,
        topImg: topBase64,
        bottom1: bottom1Base64,
        bottom2: bottom2Base64,
        downImg: downBase64,
        numeroPresupuesto: datos.numeroPresupuesto,
        fecha: this.formatearFecha(datos.fecha),
        vigencia: this.formatearFecha(datos.vigencia),
        estado: datos.estado,
        comentarios: datos.comentarios,
        items: datos.items.map(item => {
          const descripcion = this.limpiarDescripcion(item.concepto);
          const marca = item.marca || '';
          const modelo = item.modelo || '';
          
          // Construir descripción completa con marca y modelo si existen
          let descripcionCompleta = descripcion;
          if (marca || modelo) {
            const extras = [marca, modelo].filter(x => x).join(' - ');
            descripcionCompleta = `${descripcion} ${extras ? `(${extras})` : ''}`;
          }
          
          return {
            descripcion: descripcionCompleta,
            cantidad: item.cantidad,
            unidad: item.unidad
          };
        })
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
      throw new Error('Error al generar PDF checklist de cotización');
    }
  }
}
