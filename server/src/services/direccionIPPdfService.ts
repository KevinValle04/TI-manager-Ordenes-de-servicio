import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';

interface DireccionIPData {
  _id?: string;
  equipo: string;
  usuario: string;
  contrasena: string;
  direccion: string;
  esRango: boolean;
  direccionFin?: string;
}

interface ProyectoData {
  nombre: string;
  descripcion?: string;
}

export class DireccionIPPdfService {
  private templatesPath: string;

  constructor() {
    this.templatesPath = path.join(__dirname, '..', 'templates');
  }

  private generarFilasDirecciones(direcciones: DireccionIPData[]): string {
    if (!direcciones || direcciones.length === 0) {
      return '<tr><td colspan="5" class="text-center">No hay direcciones IP registradas</td></tr>';
    }

    return direcciones.map((direccion, index) => {
      const direccionIP = direccion.esRango && direccion.direccionFin
        ? `${direccion.direccion} - ${direccion.direccionFin}`
        : direccion.direccion;
      
      const badgeRango = direccion.esRango
        ? '<span class="badge-rango">RANGO</span>'
        : '';

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${direccion.equipo}</td>
          <td>${direccion.usuario}</td>
          <td>${direccion.contrasena}</td>
          <td>
            ${direccionIP}
            ${badgeRango}
          </td>
        </tr>
      `;
    }).join('');
  }

  public async generarPdfDirecciones(
    direcciones: DireccionIPData[],
    proyecto: ProyectoData
  ): Promise<Buffer> {
    let browser;
    
    try {
      // Leer la plantilla HTML
      const templatePath = path.join(this.templatesPath, 'direccionesIP.html');
      let htmlTemplate = fs.readFileSync(templatePath, 'utf8');
      
      // Generar fecha actual
      const fechaGeneracion = new Date().toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Variables de la plantilla
      const plantillaVars = {
        nombreProyecto: proyecto.nombre || 'Sin nombre',
        descripcion: proyecto.descripcion || '',
        fechaGeneracion: fechaGeneracion,
        totalDirecciones: direcciones.length.toString()
      };

      // Generar las filas de direcciones
      const filasDirecciones = this.generarFilasDirecciones(direcciones);
      
      // Reemplazar variables en el HTML
      Object.keys(plantillaVars).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        htmlTemplate = htmlTemplate.replace(regex, (plantillaVars as any)[key] || '');
      });
      
      // Reemplazar las filas de direcciones
      htmlTemplate = htmlTemplate.replace('{{filasDirecciones}}', filasDirecciones);
      
      // Leer CSS
      const cssPath = path.join(this.templatesPath, 'direccionesIP.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');
      
      // Cargar imágenes opcionales (si existen)
      const imgTopPath = path.join(this.templatesPath, 'img', 'top.png');
      let imgTopBase64 = '';
      
      try {
        if (fs.existsSync(imgTopPath)) {
          const imgTopBuffer = fs.readFileSync(imgTopPath);
          imgTopBase64 = `data:image/png;base64,${imgTopBuffer.toString('base64')}`;
          htmlTemplate = htmlTemplate.replace(/src="img\/top\.png"/g, `src="${imgTopBase64}"`);
          console.log('Imagen top.png cargada correctamente');
        }
      } catch (imgError) {
        console.warn('No se pudo cargar imagen top.png:', imgError);
      }
      
      // Crear HTML completo con CSS embebido
      const htmlCompleto = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Direcciones IP - ${plantillaVars.nombreProyecto}</title>
          <style>${cssContent}</style>
        </head>
        <body>
          ${htmlTemplate.replace(/<html[^>]*>[\s\S]*?<\/head>/, '').replace(/<body[^>]*>|<\/body>|<\/html>/g, '')}
        </body>
        </html>
      `;
      
      console.log('Iniciando generación de PDF de direcciones para proyecto:', proyecto.nombre);
      
      // Inicializar Puppeteer
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--max-old-space-size=4096'
        ],
        timeout: 60000,
        protocolTimeout: 60000
      });
      
      const page = await browser.newPage();
      console.log('Página de Puppeteer creada');
      
      page.setDefaultTimeout(60000);
      page.setDefaultNavigationTimeout(60000);
      
      await page.setViewport({ 
        width: 816,
        height: 1056,
        deviceScaleFactor: 1.0
      });
      
      await page.setContent(htmlCompleto, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      console.log('HTML cargado en la página');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await page.emulateMediaType('print');
      
      console.log('Generando PDF...');
      const pdfBuffer = await page.pdf({
        format: 'Letter',
        printBackground: true,
        displayHeaderFooter: false,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        },
        timeout: 120000
      });
      
      console.log('PDF generado correctamente, tamaño:', pdfBuffer.length, 'bytes');
      return Buffer.from(pdfBuffer);
      
    } catch (error) {
      console.error('Error al generar PDF de direcciones:', error);
      throw new Error(`Error al generar PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error('Error al cerrar browser:', closeError);
        }
      }
    }
  }
}