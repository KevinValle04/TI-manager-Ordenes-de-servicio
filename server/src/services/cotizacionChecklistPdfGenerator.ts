import fs from 'fs';
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
  private templatesPath: string;

  constructor() {
    this.templatesPath = path.join(__dirname, '../templates');
  }

  private formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
    let browser;
    
    try {
      // Formatear datos
      const numeroPresupuesto = datos.numeroPresupuesto || 'N/A';
      const fecha = this.formatearFecha(datos.fecha);
      const vigencia = this.formatearFecha(datos.vigencia);
      const estado = datos.estado || 'Borrador';
      const comentarios = datos.comentarios || 'Sin observaciones adicionales';
      
      // Información del cliente
      const nombreCliente = datos.cliente.nombre || datos.cliente.compania || 'Cliente no especificado';
      const companiaCliente = datos.cliente.compania || nombreCliente;
      const direccionCliente = datos.cliente.direccion || 'Dirección no especificada';
      const ciudadCliente = datos.cliente.ciudad || '';
      const telefonoCliente = datos.cliente.telefono || 'Teléfono no proporcionado';
      const emailCliente = datos.cliente.email || 'Email no proporcionado';

      // Información de razón social
      const razonSocial = datos.razonSocial;
      const nombreEmpresa = razonSocial?.nombre || companiaCliente;
      const rfcEmpresa = razonSocial?.rfc || 'RFC no proporcionado';
      const direccionEmpresa = razonSocial?.direccionEmpresa || direccionCliente;
      const telEmpresa = razonSocial?.telEmpresa || telefonoCliente;
      const emailEmpresa = razonSocial?.emailEmpresa || emailCliente;

      // Información del vendedor
      const vendedor = datos.vendedor;
      const nombreVendedor = vendedor?.nombre || 'No asignado';
      const emailVendedor = vendedor?.email || '';
      const telefonoVendedor = vendedor?.telefono || '';

      // Generar filas de items tipo checklist
      const filasItems = datos.items
        .filter(item => item.concepto && item.concepto.trim() !== '')
        .map((item, index) => {
          const descripcion = this.limpiarDescripcion(item.concepto);
          const marca = item.marca || '';
          const modelo = item.modelo || '';
          const isEven = index % 2 === 0;
          const backgroundColor = isEven ? '#ffffff' : '#f8fafc';
          
          // Construir descripción completa con marca y modelo si existen
          let descripcionCompleta = descripcion;
          if (marca || modelo) {
            const extras = [marca, modelo].filter(x => x).join(' - ');
            descripcionCompleta = `${descripcion} ${extras ? `(${extras})` : ''}`;
          }
          
          return `
            <tr style="background-color: ${backgroundColor};">
              <td style="text-align: center; border: 1px solid #ddd; padding: 8px 6px; font-size: 10pt; vertical-align: middle; width: 5%;">☐</td>
              <td style="text-align: left; border: 1px solid #ddd; padding: 8px 10px; font-size: 9pt; vertical-align: middle; line-height: 1.3;">${descripcionCompleta}</td>
              <td style="text-align: center; border: 1px solid #ddd; padding: 8px 6px; font-size: 9pt; font-weight: 500; vertical-align: middle; width: 12%;">${item.cantidad}</td>
              <td style="text-align: center; border: 1px solid #ddd; padding: 8px 6px; font-size: 9pt; font-weight: 500; vertical-align: middle; width: 12%;">${item.unidad}</td>
            </tr>
          `;
        }).join('');

      // Obtener paths de imágenes
      const logoPath = path.join(this.templatesPath, 'img', 'logo.png');
      const topImagePath = path.join(this.templatesPath, 'img', 'top.png');
      const bottomImagePath = path.join(this.templatesPath, 'img', 'bottom.png');
      
      // Convertir imágenes a base64 si existen
      let logoBase64 = '';
      let topImageBase64 = '';
      let bottomImageBase64 = '';
      
      try {
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        }
        if (fs.existsSync(topImagePath)) {
          const topImageBuffer = fs.readFileSync(topImagePath);
          topImageBase64 = `data:image/png;base64,${topImageBuffer.toString('base64')}`;
        }
        if (fs.existsSync(bottomImagePath)) {
          const bottomImageBuffer = fs.readFileSync(bottomImagePath);
          bottomImageBase64 = `data:image/png;base64,${bottomImageBuffer.toString('base64')}`;
        }
      } catch (imageError) {
        console.warn('Error cargando imágenes:', imageError);
      }

      // CSS inline
      const cssContent = `
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 0; 
          font-size: 10pt; 
        }
        #tabla-cotizacion-wrapper { 
          width: 100%; 
          overflow-x: auto; 
        }
        table { 
          border-collapse: collapse; 
        }
      `;

      // Crear HTML completo
      const htmlCompleto = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Checklist Cotización - ${numeroPresupuesto}</title>
          <style>${cssContent}</style>
        </head>
        <body>
          <div id="tabla-cotizacion-wrapper" style="width:100%;overflow-x:auto;">
            
            ${topImageBase64 ? `<img src="${topImageBase64}" alt="Header Corporativo" style="width: 100%; height: auto; max-height: 100px; display: block;">` : ''}
            
            <!-- TABLA DE ENCABEZADO -->
            <table id="tabla-top" style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
              <tbody>
                <!-- Título -->
                <tr>
                  <td colspan="6" style="border: none; padding: 2px;"></td>
                  <td colspan="4" style="font-weight: bold; color: #0F2A52; text-align: right; font-size: 13pt; padding: 5px;">Checklist de Cotización</td>
                </tr>
                
                <!-- Información del documento -->
                <tr>
                  <td colspan="4" style="border: none; padding: 1px;"></td>
                  <td colspan="2" style="border: none;"></td>
                  <td style="padding: 4px 8px; font-size: 8.5pt; font-weight: bold; background: #e9ecef; border: 1px solid #ccc;">No. Cotización</td>
                  <td colspan="3" style="background: #f8f9fa; font-weight: bold; padding: 4px 8px; border: 1px solid #ccc; font-size: 8.5pt; text-align: center;">${numeroPresupuesto}</td>
                </tr>
                <tr>
                  <td colspan="4" style="border: none; padding: 1px;"></td>
                  <td colspan="2" style="border: none;"></td>
                  <td style="padding: 4px 8px; font-size: 8.5pt; font-weight: bold; background: #e9ecef; border: 1px solid #ccc;">Fecha</td>
                  <td colspan="3" style="background: #f8f9fa; font-weight: bold; padding: 4px 8px; border: 1px solid #ccc; font-size: 8.5pt; text-align: center;">${fecha}</td>
                </tr>
                <tr>
                  <td colspan="4" style="border: none; padding: 1px;"></td>
                  <td colspan="2" style="border: none;"></td>
                  <td style="padding: 4px 8px; font-size: 8.5pt; font-weight: bold; background: #e9ecef; border: 1px solid #ccc;">Vigencia</td>
                  <td colspan="3" style="background: #f8f9fa; font-weight: bold; padding: 4px 8px; border: 1px solid #ccc; font-size: 8.5pt; text-align: center;">${vigencia}</td>
                </tr>
                <tr>
                  <td colspan="4" style="border: none; padding: 1px;"></td>
                  <td colspan="2" style="border: none;"></td>
                  <td style="padding: 4px 8px; font-size: 8.5pt; font-weight: bold; background: #e9ecef; border: 1px solid #ccc;">Estado</td>
                  <td colspan="3" style="background: #f8f9fa; font-weight: bold; padding: 4px 8px; border: 1px solid #ccc; font-size: 8.5pt; text-align: center; color: #0F2A52;">${estado}</td>
                </tr>
                
                <!-- Espaciador -->
                <tr>
                  <td colspan="10" style="border: none; height: 6px;"></td>
                </tr>
                
                <!-- VENDEDOR -->
                <tr>
                  <td colspan="5" style="background-color: #0F2A52; color: white; font-weight: bold; padding: 5px 8px; border: 1px solid #0F2A52; font-size: 9pt; text-transform: uppercase;">VENDEDOR ASIGNADO</td>
                  <td colspan="5" style="border: none;"></td>
                </tr>
                <tr>
                  <td colspan="5" style="padding: 6px 8px; background: #f8fafc; border: 1px solid #ddd; font-size: 8.5pt; line-height: 1.2;">
                    <div style="margin-bottom: 2px;"><strong style="color: #0F2A52;">Nombre:</strong> ${nombreVendedor}</div>
                    ${emailVendedor ? `<div style="margin-bottom: 2px;"><strong style="color: #0F2A52;">Email:</strong> ${emailVendedor}</div>` : ''}
                    ${telefonoVendedor ? `<div><strong style="color: #0F2A52;">Teléfono:</strong> ${telefonoVendedor}</div>` : ''}
                  </td>
                  <td colspan="5" style="border: none;"></td>
                </tr>
                
                <!-- Espaciador -->
                <tr>
                  <td colspan="10" style="border: none; height: 4px;"></td>
                </tr>
                
                <!-- INFORMACIÓN DEL CLIENTE -->
                <tr>
                  <td colspan="5" style="background-color: #0F2A52; color: white; font-weight: bold; padding: 5px 8px; border: 1px solid #0F2A52; font-size: 9pt; text-transform: uppercase;">INFORMACIÓN DEL CLIENTE</td>
                  <td colspan="5" style="border: none;"></td>
                </tr>
                <tr>
                  <td colspan="5" style="padding: 6px 8px; background: #f8fafc; border: 1px solid #ddd; font-size: 8.5pt; line-height: 1.2;">
                    <div style="margin-bottom: 2px;"><strong style="color: #0F2A52;">Nombre:</strong> ${nombreCliente}</div>
                    <div style="margin-bottom: 2px;"><strong style="color: #0F2A52;">Compañía:</strong> ${companiaCliente}</div>
                    <div style="margin-bottom: 2px;"><strong style="color: #0F2A52;">Dirección:</strong> ${direccionCliente}</div>
                    <div style="margin-bottom: 2px;"><strong style="color: #0F2A52;">Ciudad:</strong> ${ciudadCliente}</div>
                    <div style="margin-bottom: 2px;"><strong style="color: #0F2A52;">Teléfono:</strong> ${telefonoCliente}</div>
                    <div><strong style="color: #0F2A52;">Email:</strong> ${emailCliente}</div>
                  </td>
                  <td colspan="5" style="border: none;"></td>
                </tr>
                
                <!-- Espaciador -->
                <tr>
                  <td colspan="10" style="border: none; height: 4px;"></td>
                </tr>
                
                <!-- COMENTARIOS -->
                <tr>
                  <td colspan="5" style="background-color: #0F2A52; color: white; font-weight: bold; padding: 5px 8px; border: 1px solid #0F2A52; font-size: 9pt; text-transform: uppercase;">COMENTARIOS</td>
                  <td colspan="5" style="border: none;"></td>
                </tr>
                <tr>
                  <td colspan="5" style="padding: 10px; background: white; border: 1px solid #ddd; font-size: 8.5pt; line-height: 1.4; min-height: 80px; vertical-align: top;">
                    ${comentarios || ''}
                  </td>
                  <td colspan="5" style="border: none;"></td>
                </tr>
                
                <!-- Espaciador final -->
                <tr>
                  <td colspan="10" style="border: none; height: 8px;"></td>
                </tr>
              </tbody>
            </table>

            <!-- TABLA DE ITEMS FORMATO CHECKLIST -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
              <thead>
                <tr>
                  <th style="background: #0F2A52; color: white; font-weight: bold; border: 1px solid #0F2A52; padding: 8px 6px; text-align: center; font-size: 9pt; text-transform: uppercase; width: 5%;">✓</th>
                  <th style="background: #0F2A52; color: white; font-weight: bold; border: 1px solid #0F2A52; padding: 8px 10px; text-align: center; font-size: 9pt; text-transform: uppercase;">DESCRIPCIÓN DEL PRODUCTO</th>
                  <th style="background: #0F2A52; color: white; font-weight: bold; border: 1px solid #0F2A52; padding: 8px 6px; text-align: center; font-size: 9pt; text-transform: uppercase; width: 12%;">CANT.</th>
                  <th style="background: #0F2A52; color: white; font-weight: bold; border: 1px solid #0F2A52; padding: 8px 6px; text-align: center; font-size: 9pt; text-transform: uppercase; width: 12%;">UNIDAD</th>
                </tr>
              </thead>
              <tbody>
                ${filasItems}
              </tbody>
            </table>

            <!-- INFORMACIÓN ADICIONAL -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #0F2A52;">
              <thead>
                <tr>
                  <th colspan="2" style="background: #0F2A52; color: white; padding: 6px 10px; font-size: 9pt; text-transform: uppercase; text-align: left;">INFORMACIÓN ADICIONAL</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="background-color: #f8fafc; font-weight: bold; padding: 5px 8px; border-bottom: 1px solid #ddd; font-size: 8.5pt; width: 140px; color: #0F2A52;">PROPÓSITO</td>
                  <td style="padding: 5px 8px; border-bottom: 1px solid #ddd; font-size: 8.5pt; background: white;">Lista de verificación de productos cotizados</td>
                </tr>
                <tr>
                  <td style="background-color: #f8fafc; font-weight: bold; padding: 5px 8px; border-bottom: 1px solid #ddd; font-size: 8.5pt; color: #0F2A52;">INSTRUCCIONES</td>
                  <td style="padding: 5px 8px; border-bottom: 1px solid #ddd; font-size: 8.5pt; background: white;">Marcar con ✓ los productos conforme se vayan verificando o entregando</td>
                </tr>
              </tbody>
            </table>

            <!-- FIRMAS -->
            <div style="margin-top: 20px; margin-bottom: 15px;">
              <table style="width: 100%; margin-top: 15px;">
                <tr>
                  <td style="width: 45%; text-align: center; vertical-align: bottom; padding: 8px;">
                    <div style="border-bottom: 1px solid #0F2A52; width: 180px; margin: 0 auto 6px auto; height: 20px;"></div>
                    <div style="font-weight: bold; font-size: 9pt; text-transform: uppercase; color: #0F2A52;">RECIBIDO POR</div>
                    <div style="font-size: 7pt; color: #666; margin-top: 1px;">Nombre, firma y fecha</div>
                  </td>
                  <td style="width: 10%; text-align: center;">
                    <div style="border-left: 1px solid #ddd; height: 30px;"></div>
                  </td>
                  <td style="width: 45%; text-align: center; vertical-align: bottom; padding: 8px;">
                    <div style="border-bottom: 1px solid #0F2A52; width: 180px; margin: 0 auto 6px auto; height: 20px;"></div>
                    <div style="font-weight: bold; font-size: 9pt; text-transform: uppercase; color: #0F2A52;">ENTREGADO POR</div>
                    <div style="font-size: 7pt; color: #666; margin-top: 1px;">Nombre, firma y fecha</div>
                  </td>
                </tr>
              </table>
            </div>

            ${bottomImageBase64 ? `<img src="${bottomImageBase64}" alt="Footer Corporativo" style="width: 100%; margin-top: 10px; height: auto; max-height: 60px; display: block;">` : ''}
            
          </div>
        </body>
        </html>
      `;

      // Inicializar Puppeteer
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      
      await page.setViewport({ 
        width: 816,
        height: 1056,
        deviceScaleFactor: 1.0
      });

      await page.setContent(htmlCompleto, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      await page.emulateMediaType('print');
      await new Promise(resolve => setTimeout(resolve, 2000));

      const pdfBuffer = await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: {
          top: '0.4in',
          right: '0.4in',
          bottom: '0.4in',
          left: '0.4in'
        },
        timeout: 60000
      });

      return Buffer.from(pdfBuffer);
      
    } catch (error) {
      console.error('Error al generar PDF checklist:', error);
      throw new Error(`Error al generar PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
