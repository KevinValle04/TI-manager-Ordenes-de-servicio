import fs from 'fs';
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
    direccionEmpresa: string;
  };
}

export class CotizacionCanalizacionPdfGenerator {
  private templatesPath: string;

  constructor() {
    this.templatesPath = path.join(__dirname, '../templates');
  }

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

  public async generarPdfCotizacionCanalizacion(datos: CotizacionCanalizacionPdfData): Promise<Buffer> {
    let browser;
    
    try {
      // Leer CSS
      const cssPath = path.join(this.templatesPath, 'cotizacionCanalizacion.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');
      
      // Calcular utilidad en monto
      const utilidadMonto = datos.total - datos.subtotal;
      
      // Formatear datos
      const numeroPresupuesto = datos.numeroPresupuesto || 'N/A';
      const cliente = datos.cliente || 'Cliente no especificado';
      const fecha = this.formatearFecha(datos.fecha);
      const vigencia = this.formatearFecha(datos.vigencia);
      const subtotal = this.formatearMoneda(datos.subtotal);
      const utilidad = `${datos.utilidad}%`;
      const utilidadMontoFormateado = this.formatearMoneda(utilidadMonto);
      const total = this.formatearMoneda(datos.total);
      const estado = datos.estado || 'Borrador';
      const comentarios = datos.comentarios || 'Sin observaciones adicionales';
      
      // Información del cliente (con valores por defecto si no existe)
      const razonSocial = datos.razonSocial;
      const nombreEmpresa = razonSocial?.nombre || cliente;
      const rfcEmpresa = razonSocial?.rfc || 'RFC no proporcionado';
      const direccionEmpresa = razonSocial?.direccionEmpresa || 'Dirección no especificada';
      const telEmpresa = razonSocial?.telEmpresa || 'Teléfono no proporcionado';
      const emailEmpresa = razonSocial?.emailEmpresa || 'Email no proporcionado';

      // Generar filas de items tipo checklist
      const filasItems = datos.items
        .filter(item => item.descripcion && item.descripcion.trim() !== '')
        .map((item, index) => {
          const descripcion = this.limpiarDescripcion(item.descripcion);
          const isEven = index % 2 === 0;
          const backgroundColor = isEven ? '#ffffff' : '#f8fafc';
          
          return `
            <tr style="background-color: ${backgroundColor};">
              <td style="text-align: center; border: 1px solid #ddd; padding: 8px 6px; font-size: 10pt; vertical-align: middle; width: 5%;">☐</td>
              <td style="text-align: left; border: 1px solid #ddd; padding: 8px 10px; font-size: 9pt; vertical-align: middle; line-height: 1.3;">${descripcion}</td>
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

      // Crear HTML completo directamente
      const htmlCompleto = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Lista de Materiales de Canalización - ${numeroPresupuesto}</title>
          <style>${cssContent}</style>
        </head>
        <body>
          <div id="tabla-cotizacion-wrapper" style="width:100%;overflow-x:auto;">
            
            ${topImageBase64 ? `<img src="${topImageBase64}" alt="Header Corporativo" style="width: 100%; height: auto; max-height: 100px; display: block;">` : ''}
            
            <!-- TABLA DE ENCABEZADO ULTRA COMPACTA -->
            <table id="tabla-top" style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
              <tbody>
                <!-- Fila 1: Título y datos del documento -->
                <tr>
                  <td colspan="3" style="font-weight: bold; color: #0F2A52; text-align: left; font-size: 11pt; padding: 3px 0; vertical-align: middle;">Lista de Materiales - Canalización</td>
                  <td style="padding: 2px 5px; font-size: 7pt; font-weight: bold; background: #e9ecef; border: 1px solid #ccc; width: 70px;">No. Lista</td>
                  <td style="background: #f8f9fa; font-weight: bold; padding: 2px 5px; border: 1px solid #ccc; font-size: 7pt; text-align: center; width: 100px;">${numeroPresupuesto}</td>
                  <td style="padding: 2px 5px; font-size: 7pt; font-weight: bold; background: #e9ecef; border: 1px solid #ccc; width: 60px;">Fecha</td>
                  <td style="background: #f8f9fa; font-weight: bold; padding: 2px 5px; border: 1px solid #ccc; font-size: 7pt; text-align: center; width: 100px;">${fecha}</td>
                </tr>
                
                <!-- Fila 2: Vigencia y Estado -->
                <tr>
                  <td colspan="3" style="border: none;"></td>
                  <td style="padding: 2px 5px; font-size: 7pt; font-weight: bold; background: #e9ecef; border: 1px solid #ccc;">Vigencia</td>
                  <td style="background: #f8f9fa; font-weight: bold; padding: 2px 5px; border: 1px solid #ccc; font-size: 7pt; text-align: center;">${vigencia}</td>
                  <td style="padding: 2px 5px; font-size: 7pt; font-weight: bold; background: #e9ecef; border: 1px solid #ccc;">Estado</td>
                  <td style="background: #f8f9fa; font-weight: bold; padding: 2px 5px; border: 1px solid #ccc; font-size: 7pt; text-align: center; color: #0F2A52;">${estado}</td>
                </tr>
                
                <!-- Espaciador mínimo -->
                <tr>
                  <td colspan="7" style="border: none; height: 4px;"></td>
                </tr>
                
                <!-- Fila 3: Headers de información en dos columnas -->
                <tr>
                  <td colspan="3" style="background-color: #0F2A52; color: white; font-weight: bold; padding: 3px 6px; border: 1px solid #0F2A52; font-size: 7.5pt; text-transform: uppercase;">INFORMACIÓN DEL CLIENTE</td>
                  <td style="border: none; width: 8px;"></td>
                  <td colspan="3" style="background-color: #0F2A52; color: white; font-weight: bold; padding: 3px 6px; border: 1px solid #0F2A52; font-size: 7.5pt; text-transform: uppercase;">DATOS DE CONTACTO</td>
                </tr>
                
                <!-- Fila 4: Datos del cliente y contacto en paralelo -->
                <tr>
                  <td colspan="3" style="padding: 4px 6px; background: #f8fafc; border: 1px solid #ddd; font-size: 7pt; line-height: 1.3; vertical-align: top;">
                    <div style="margin-bottom: 1px;"><strong style="color: #0F2A52;">Cliente:</strong> ${cliente}</div>
                    <div style="margin-bottom: 1px;"><strong style="color: #0F2A52;">Empresa:</strong> ${nombreEmpresa}</div>
                    <div style="margin-bottom: 1px;"><strong style="color: #0F2A52;">RFC:</strong> ${rfcEmpresa}</div>
                    <div><strong style="color: #0F2A52;">Dirección:</strong> ${direccionEmpresa}</div>
                  </td>
                  <td style="border: none;"></td>
                  <td colspan="3" style="padding: 4px 6px; background: #f8fafc; border: 1px solid #ddd; font-size: 7pt; line-height: 1.3; vertical-align: top;">
                    <div style="margin-bottom: 1px;"><strong style="color: #0F2A52;">Teléfono:</strong> ${telEmpresa}</div>
                    <div style="margin-bottom: 1px;"><strong style="color: #0F2A52;">Email:</strong> ${emailEmpresa}</div>
                    <div style="margin-top: 8px;"><strong style="color: #0F2A52;">Tipo:</strong> Checklist de materiales</div>
                    <div><strong style="color: #0F2A52;">Observaciones:</strong> ${comentarios}</div>
                  </td>
                </tr>
                
                <!-- Espaciador final mínimo -->
                <tr>
                  <td colspan="7" style="border: none; height: 6px;"></td>
                </tr>
              </tbody>
            </table>

            <!-- TABLA DE ITEMS FORMATO CHECKLIST -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
              <thead>
                <tr>
                  <th style="background: #0F2A52; color: white; font-weight: bold; border: 1px solid #0F2A52; padding: 8px 6px; text-align: center; font-size: 9pt; text-transform: uppercase; width: 5%;">✓</th>
                  <th style="background: #0F2A52; color: white; font-weight: bold; border: 1px solid #0F2A52; padding: 8px 10px; text-align: center; font-size: 9pt; text-transform: uppercase;">DESCRIPCIÓN DEL MATERIAL</th>
                  <th style="background: #0F2A52; color: white; font-weight: bold; border: 1px solid #0F2A52; padding: 8px 6px; text-align: center; font-size: 9pt; text-transform: uppercase; width: 12%;">CANT.</th>
                  <th style="background: #0F2A52; color: white; font-weight: bold; border: 1px solid #0F2A52; padding: 8px 6px; text-align: center; font-size: 9pt; text-transform: uppercase; width: 12%;">UNIDAD</th>
                </tr>
              </thead>
              <tbody>
                ${filasItems}
              </tbody>
            </table>

            <!-- FIRMAS COMPACTAS -->
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

      // Inicializar Puppeteer con configuración optimizada
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      const page = await browser.newPage();
      
      // Configurar viewport para carta
      await page.setViewport({ 
        width: 816,
        height: 1056,
        deviceScaleFactor: 1.0
      });

      // Cargar contenido con timeout extendido
      await page.setContent(htmlCompleto, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      // Configurar para impresión
      await page.emulateMediaType('print');
      
      // Esperar que el contenido se renderice completamente
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generar PDF con configuración optimizada
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
      console.error('Error al generar PDF de cotización:', error);
      throw new Error(`Error al generar PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      if (browser) {
        await browser.close();
      }
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