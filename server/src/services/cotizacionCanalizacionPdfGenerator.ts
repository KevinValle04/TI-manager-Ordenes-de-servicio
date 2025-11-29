import fs from 'fs';
import handlebars from 'handlebars';
import path from 'path';
import puppeteer from 'puppeteer';

export interface CotizacionCanalizacionPdfData {
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
    celularEmpresa?: string;
    direccionEmpresa: string;
    emailFacturacion?: string;
    direccionesEnvio?: Array<{
      nombre: string;
      telefono: string;
      direccion: string;
      contacto: string;
    }>;
  };
  clienteInfo?: {
    nombreEmpresa: string;
    direccion: string;
    telefono: string;
    contactos: Array<{
      nombre: string;
      puesto: string;
      contacto: {
        correo: string;
        telefono: string;
        extension?: string;
      };
    }>;
  } | null;
}

export class CotizacionCanalizacionPdfGenerator {
  private formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(valor);
  }

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
    
    handlebars.registerHelper('formatCurrency', (value: number) => {
      return this.formatearMoneda(value);
    });

    const rutaPlantilla = path.join(__dirname, '../templates/cotizacionCanalizacion.html');
    return fs.promises.readFile(rutaPlantilla, 'utf-8');
  }

  public async generarPdfCotizacionCanalizacion(datos: CotizacionCanalizacionPdfData): Promise<Buffer> {
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

      // Calcular utilidad en monto
      const utilidadMonto = datos.total - datos.subtotal;
      
      // Preparar información del cliente
      const clienteInfo = datos.clienteInfo;
      const primerContacto = clienteInfo?.contactos?.[0];
      
      const clienteData = {
        nombreEmpresa: clienteInfo?.nombreEmpresa || datos.cliente,
        direccion: clienteInfo?.direccion || 'Dirección no especificada',
        telefono: clienteInfo?.telefono || 'Teléfono no proporcionado',
        contacto: primerContacto ? {
          nombre: primerContacto.nombre || 'No especificado',
          puesto: primerContacto.puesto || 'No especificado',
          telefono: primerContacto.contacto?.telefono || 'No especificado'
        } : null
      };

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
        subtotalFormatted: this.formatearMoneda(datos.subtotal),
        utilidad: datos.utilidad,
        utilidadMontoFormatted: this.formatearMoneda(utilidadMonto),
        totalFormatted: this.formatearMoneda(datos.total),
        estado: datos.estado,
        comentarios: datos.comentarios,
        razonSocial: datos.razonSocial,
        cliente: clienteData,
        items: datos.items.map(item => ({
          ...item,
          descripcion: this.limpiarDescripcion(item.descripcion)
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
      throw new Error('Error al generar PDF de cotización de canalización');
    }
  }

  private limpiarDescripcion(descripcion: string): string {
    // Limpiar formato pero mantener el nombre real del material
    if (!descripcion || descripcion.trim() === '') {
      return 'Descripción no especificada';
    }
    
    // Limpiar espacios extra y capitalizar primera letra
    return descripcion.trim()
      .replace(/\s+/g, ' ')
      .replace(/^./, str => str.toUpperCase());
  }
}