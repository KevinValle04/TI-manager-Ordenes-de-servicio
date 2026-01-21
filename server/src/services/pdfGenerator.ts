import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';
import { DateUtils } from '../utils/dateUtils';

interface OrdenCompraData {
  numeroOrden: string;
  fecha: string;
  proveedor: {
    empresa: string;
    direccion: string;
    telefono: string;
    contactos?: Array<{
      nombre: string;
      correo: string;
      telefono: string;
      extension?: string;
    }>;
  };
  razonSocial: {
    nombre: string;
    direccionEmpresa: string;
    telEmpresa: string;
    emailEmpresa: string;
    emailFacturacion?: string;
  };
  direccionEnvio: {
    contacto?: string;
    nombre?: string;
    direccion: string;
    telefono: string;
  };
  vendedor?: {
    nombre: string;
    correo: string;
    telefono: string;
  };
  // Nuevos campos agregados
  moneda?: string;
  porcentajeIvaSimbolico?: string;
  datosPdf?: {
    datosExtraidos?: {
      folio?: string;
      folioOriginal?: string; // Agregar folioOriginal
      formaPago?: string;
      usoMercancia?: string;
      productos?: Array<{
        cantidad: number | string;
        unidad?: string;
        codigo?: string;
        clave?: string;
        descripcion?: string;
        concepto?: string;
        marca?: string;
        modelo?: string;
        precioUnitario?: number;
        precio?: number;
        importe?: number;
        total?: number;
      }>;
      totales?: {
        [key: string]: number; // Permitir cualquier nombre de campo para totales
      };
    };
  };
  productos?: Array<any>;
  totalesCalculados?: {
    subTotal: number;
    iva: number;
    total: number;
  };
}

export class PdfGeneratorService {
  private templatesPath: string;

  constructor() {
    this.templatesPath = path.join(__dirname, '..', 'templates');
  }

  private formatearMoneda(valor: number): string {
    return `$${valor.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
  }

  private procesarDatosOrden(datosOrden: OrdenCompraData): any {
    // Extraer información del proveedor
    const proveedor = datosOrden.proveedor;
    const contactoPrincipal = proveedor.contactos && proveedor.contactos.length > 0
      ? proveedor.contactos[0]
      : { nombre: '', correo: '', telefono: '', extension: '' };
    
    // Extraer información de razón social (facturar a)
    const razonSocial = datosOrden.razonSocial;
    
    // Extraer información de envío
    const direccionEnvio = datosOrden.direccionEnvio;
    
    // Extraer información del vendedor (solicita)
    const vendedor = datosOrden.vendedor;
    
    // Extraer datos del PDF si existen
    const datosPdf = datosOrden.datosPdf?.datosExtraidos || {};
    
    // Usar siempre los totales calculados proporcionados
    const totales = {
      subTotal: Number(datosOrden.totalesCalculados?.subTotal) || 0,
      iva: Number(datosOrden.totalesCalculados?.iva) || 0,
      total: Number(datosOrden.totalesCalculados?.total) || 0
    };

    // Formatear moneda según la seleccionada
    const moneda = datosOrden.moneda || 'MXN';
    const formatearConMoneda = (valor: number) => this.formatearMonedaConTipo(valor, moneda);

    // Mapear variables para la plantilla
    const plantillaVars = {
      // Información del documento
      noDocVal: datosOrden.numeroOrden || '',
      fechaDoc: datosOrden.fecha || DateUtils.formatForOrdenCompra(),
      numCotizacion: datosPdf.folioOriginal || datosPdf.folio || '', // Usar folioOriginal primero
      
      // Información del proveedor
      nomProveedor: proveedor.empresa || '',
      dirProveedor: proveedor.direccion || '',
      telProveedor: proveedor.telefono || '',
      
      // Contacto del proveedor
      contactoProveedor: contactoPrincipal.nombre || '',
      emailProveedorContacto: contactoPrincipal.correo || '',
      telProveedorContato: contactoPrincipal.telefono ? 
        `${contactoPrincipal.telefono} ${contactoPrincipal.extension ? 'Ext. ' + contactoPrincipal.extension : ''}` : '',
      
      // Facturar a (razón social) - incluyendo RFC
      nomFacturar: razonSocial.nombre || '',
      rfcFacturar: (razonSocial as any).rfc || '', // Agregar RFC
      emailFacturar: razonSocial.emailFacturacion || razonSocial.emailEmpresa || '',
      dirFacturar: razonSocial.direccionEmpresa || '',
      telFacturar: razonSocial.telEmpresa || '',
      
      // Solicitante (vendedor si está disponible, sino datos de la empresa)
      solicitante: vendedor?.nombre || razonSocial.nombre || '',
      emailSolicitante: vendedor?.correo || razonSocial.emailEmpresa || '',
      telSolicitante: vendedor?.telefono || razonSocial.telEmpresa || '',
      
      // Entregar a (dirección de envío)
      receptor: direccionEnvio.contacto || direccionEnvio.nombre || '',
      direccionReceptor: direccionEnvio.direccion || '',
      telefonoReceptor: direccionEnvio.telefono || '',
      
      // Totales con formato de moneda
      subtotal: formatearConMoneda(totales.subTotal),
      iva: `${datosOrden.porcentajeIvaSimbolico || '16'}%`, // Usar el porcentaje simbólico seleccionado
      importeIva: formatearConMoneda(totales.iva),
      total: formatearConMoneda(totales.total),
      
      // Información adicional
      usoMercancia: datosPdf.usoMercancia || 'G03 - GASTOS EN GENERAL',
      formaPago: datosPdf.formaPago || 'POR DEFINIR',
      moneda: moneda
    };
    
    return plantillaVars;
  }

  // Nueva función para formatear moneda con tipo específico
  private formatearMonedaConTipo(valor: number, moneda: string): string {
    const locale = moneda === 'USD' ? 'en-US' : 'es-MX';
    return `$${valor.toLocaleString(locale, { minimumFractionDigits: 2 })} ${moneda}`;
  }

  private calcularColspansTotales(productos: Array<any>): { colspanTotales: string, colspanTotalesLabel: string } {
    // Determinar qué columnas mostrar basándose en los datos disponibles
    const columnasDisponibles = {
      codigo: productos.some(p => p.codigo || p.clave || p.codigoFabricante),
      descripcion: productos.some(p => p.descripcion),
      unidad: productos.some(p => p.unidad),
      cantidad: productos.some(p => p.cantidad),
      precioUnitario: productos.some(p => p.precioUnitario || p.precio || p.precioLista),
      almacen: productos.some(p => p.alm || p.almacen),
      precioLista: productos.some(p => p.precioLista && p.precioLista > 0),
      descuento: productos.some(p => p.descuento && p.descuento > 0),
      importe: productos.some(p => p.importe || p.total || p.cantidad)
    };

    // Contar columnas activas
    let numeroColumnas = 0;
    if (columnasDisponibles.codigo) numeroColumnas++;
    if (columnasDisponibles.descripcion) numeroColumnas += 2; // colspan="2"
    if (columnasDisponibles.unidad) numeroColumnas++;
    if (columnasDisponibles.cantidad) numeroColumnas++;
    if (columnasDisponibles.precioUnitario) numeroColumnas++;
    if (columnasDisponibles.almacen) numeroColumnas++;
    if (columnasDisponibles.precioLista) numeroColumnas++;
    if (columnasDisponibles.descuento) numeroColumnas++;
    if (columnasDisponibles.importe) numeroColumnas++;

    const colspanTotales = `colspan="${numeroColumnas}"`;
    const colspanTotalesLabel = `colspan="${numeroColumnas - 1}"`;

    return { colspanTotales, colspanTotalesLabel };
  }

  private generarEncabezadosTabla(productos: Array<any>): string {
    // Determinar qué columnas mostrar basándose en los datos disponibles
    const columnasDisponibles = {
      codigo: productos.some(p => p.codigo || p.clave || p.codigoFabricante),
      descripcion: productos.some(p => p.descripcion),
      unidad: productos.some(p => p.unidad),
      cantidad: productos.some(p => p.cantidad),
      precioUnitario: productos.some(p => p.precioUnitario || p.precio || p.precioLista),
      almacen: productos.some(p => p.alm || p.almacen),
      precioLista: productos.some(p => p.precioLista && p.precioLista > 0),
      descuento: productos.some(p => p.descuento && p.descuento > 0),
      importe: productos.some(p => p.importe || p.total || p.cantidad)
    };

    let encabezados = '';
    
    if (columnasDisponibles.codigo) {
      encabezados += '<th class="col-codigo">CÓDIGO/CLAVE</th>';
    }
    if (columnasDisponibles.descripcion) {
      encabezados += '<th class="col-descripcion" colspan="2">DESCRIPCIÓN/CONCEPTO</th>';
    }
    if (columnasDisponibles.unidad) {
      encabezados += '<th class="col-u">U</th>';
    }
    if (columnasDisponibles.cantidad) {
      encabezados += '<th class="col-cant">CANT</th>';
    }
    if (columnasDisponibles.precioUnitario) {
      encabezados += '<th class="col-pu">P.U.</th>';
    }
    if (columnasDisponibles.almacen) {
      encabezados += '<th class="col-alm">ALM</th>';
    }
    if (columnasDisponibles.precioLista) {
      encabezados += '<th class="col-lista">P. LISTA</th>';
    }
    if (columnasDisponibles.descuento) {
      encabezados += '<th class="col-descuento">DESC %</th>';
    }
    if (columnasDisponibles.importe) {
      encabezados += '<th class="col-importe">IMPORTE</th>';
    }

    return encabezados;
  }

  private generarFilasProductos(productos: Array<any>): string {
    if (!productos || productos.length === 0) {
      return '<tr><td colspan="10">No hay productos</td></tr>';
    }

    // Determinar qué columnas mostrar basándose en los datos disponibles
    const columnasDisponibles = {
      codigo: productos.some(p => p.codigo || p.clave || p.codigoFabricante),
      descripcion: productos.some(p => p.descripcion),
      unidad: productos.some(p => p.unidad),
      cantidad: productos.some(p => p.cantidad),
      precioUnitario: productos.some(p => p.precioUnitario || p.precio || p.precioLista),
      almacen: productos.some(p => p.alm || p.almacen),
      precioLista: productos.some(p => p.precioLista && p.precioLista > 0),
      descuento: productos.some(p => p.descuento && p.descuento > 0),
      importe: productos.some(p => p.importe || p.total || p.cantidad)
    };

    return productos.map((producto, index) => {
      const cantidad = Number(producto.cantidad) || 0;
      const precioUnitario = Number(producto.precioUnitario) || Number(producto.precio) || Number(producto.precioLista) || 0;
      const precioLista = Number(producto.precioLista) || 0;
      const descuento = Number(producto.descuento) || 0;
      
      // Declarar variables antes de usarlas
      const almacen = producto.alm || producto.almacen || '';
      const codigo = producto.codigo || producto.clave || producto.codigoFabricante || '';
      
      // Usar el importe que viene del modal/frontend (ya calculado correctamente)
      // Si no existe, calcularlo como fallback
      let importe = Number(producto.importe) || Number(producto.total);
      if (!importe || isNaN(importe)) {
        const subtotal = cantidad * precioUnitario;
        importe = subtotal * (1 - descuento / 100);
        console.log(`⚠️ Recalculando importe para ${codigo}: ${cantidad} × ${precioUnitario} × (1 - ${descuento}%) = ${importe}`);
      } else {
        console.log(`✅ Usando importe del modal para ${codigo}: ${importe}`);
      }
      
      let fila = '<tr>';
      
      if (columnasDisponibles.codigo) {
        fila += `<td class="col-codigo">${codigo}</td>`;
      }
      if (columnasDisponibles.descripcion) {
        fila += `<td class="col-descripcion" colspan="2">${producto.descripcion || producto.concepto || ''}</td>`;
      }
      if (columnasDisponibles.unidad) {
        fila += `<td class="col-u">${producto.unidad || ''}</td>`;
      }
      if (columnasDisponibles.cantidad) {
        fila += `<td class="col-cant">${cantidad}</td>`;
      }
      if (columnasDisponibles.precioUnitario) {
        fila += `<td class="col-pu">${this.formatearMoneda(precioUnitario)}</td>`;
      }
      if (columnasDisponibles.almacen) {
        fila += `<td class="col-alm">${almacen}</td>`;
      }
      if (columnasDisponibles.precioLista) {
        fila += `<td class="col-lista">${precioLista > 0 ? this.formatearMoneda(precioLista) : ''}</td>`;
      }
      if (columnasDisponibles.descuento) {
        fila += `<td class="col-descuento">${descuento > 0 ? descuento.toFixed(1) + '%' : ''}</td>`;
      }
      if (columnasDisponibles.importe) {
        fila += `<td class="col-importe">${this.formatearMoneda(importe)}</td>`;
      }
      
      fila += '</tr>';
      return fila;
    }).join('');
  }

  // Nueva función para generar filas de productos con soporte de moneda
  private generarFilasProductosConMoneda(productos: Array<any>, moneda: string): string {
    if (!productos || productos.length === 0) {
      return '<tr><td colspan="10">No hay productos</td></tr>';
    }

    // Determinar qué columnas mostrar basándose en los datos disponibles
    const columnasDisponibles = {
      codigo: productos.some(p => p.codigo || p.clave || p.codigoFabricante),
      descripcion: productos.some(p => p.descripcion),
      unidad: productos.some(p => p.unidad),
      cantidad: productos.some(p => p.cantidad),
      precioUnitario: productos.some(p => p.precioUnitario || p.precio || p.precioLista),
      almacen: productos.some(p => p.alm || p.almacen),
      precioLista: productos.some(p => p.precioLista && p.precioLista > 0),
      descuento: productos.some(p => p.descuento && p.descuento > 0),
      importe: productos.some(p => p.importe || p.total || p.cantidad)
    };

    return productos.map((producto, index) => {
      const cantidad = Number(producto.cantidad) || 0;
      const precioUnitario = Number(producto.precioUnitario) || Number(producto.precio) || Number(producto.precioLista) || 0;
      const precioLista = Number(producto.precioLista) || 0;
      const descuento = Number(producto.descuento) || 0;
      
      const almacen = producto.alm || producto.almacen || '';
      const codigo = producto.codigo || producto.clave || producto.codigoFabricante || '';
      
      // Usar el importe que viene del modal/frontend (ya calculado correctamente)
      let importe = Number(producto.importe) || Number(producto.total);
      if (!importe || isNaN(importe)) {
        const subtotal = cantidad * precioUnitario;
        importe = subtotal * (1 - descuento / 100);
      }
      
      let fila = '<tr>';
      
      if (columnasDisponibles.codigo) {
        fila += `<td class="text-center">${codigo}</td>`;
      }
      if (columnasDisponibles.descripcion) {
        fila += `<td colspan="2">${producto.descripcion || producto.concepto || ''}</td>`;
      }
      if (columnasDisponibles.unidad) {
        fila += `<td class="text-center">${producto.unidad || ''}</td>`;
      }
      if (columnasDisponibles.cantidad) {
        fila += `<td class="text-center">${cantidad}</td>`;
      }
      if (columnasDisponibles.precioUnitario) {
        fila += `<td class="text-right">${this.formatearMonedaConTipo(precioUnitario, moneda)}</td>`;
      }
      if (columnasDisponibles.almacen) {
        fila += `<td class="text-center">${almacen}</td>`;
      }
      if (columnasDisponibles.precioLista) {
        fila += `<td class="text-right">${precioLista > 0 ? this.formatearMonedaConTipo(precioLista, moneda) : ''}</td>`;
      }
      if (columnasDisponibles.descuento) {
        fila += `<td class="text-center">${descuento > 0 ? descuento.toFixed(1) + '%' : ''}</td>`;
      }
      if (columnasDisponibles.importe) {
        fila += `<td class="col-importe">${this.formatearMonedaConTipo(importe, moneda)}</td>`;
      }
      
      fila += '</tr>';
      return fila;
    }).join('');
  }

  public async generarPdfOrdenCompra(datosOrden: OrdenCompraData): Promise<Buffer> {
    console.log('🖨️ DEBUG pdfGenerator - Datos recibidos:');
    console.log('📦 Productos en PDF:', JSON.stringify(datosOrden.productos?.slice(0, 2), null, 2));
    console.log('🧮 Totales en PDF:', JSON.stringify(datosOrden.totalesCalculados, null, 2));
    console.log('🏷️ Porcentaje IVA en PDF:', datosOrden.porcentajeIvaSimbolico);
    console.log('💱 Moneda en PDF:', datosOrden.moneda);
    
    let browser;
    
    try {
      // Usar la nueva plantilla mejorada
      const templatePath = path.join(this.templatesPath, 'ordenCompra_nuevo.html');
      let htmlTemplate = fs.readFileSync(templatePath, 'utf8');
      
      // Procesar los datos de la orden
      const plantillaVars = this.procesarDatosOrden(datosOrden);
      
      // Generar las filas y encabezados de productos dinámicamente
      const productos = datosOrden.productos || datosOrden.datosPdf?.datosExtraidos?.productos || [];
      const moneda = datosOrden.moneda || 'MXN';
      const encabezadosTabla = this.generarEncabezadosTabla(productos);
      const filasProductos = this.generarFilasProductosConMoneda(productos, moneda);
      const { colspanTotales, colspanTotalesLabel } = this.calcularColspansTotales(productos);
      
      // Calcular colspan para la tabla inferior (son 5 columnas fijas)
      const colspanTotalesLabel2 = 'colspan="2"';
      
      // Reemplazar variables en el HTML
      Object.keys(plantillaVars).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        htmlTemplate = htmlTemplate.replace(regex, plantillaVars[key] || '');
      });
      
      // Reemplazar las secciones de productos y totales
      htmlTemplate = htmlTemplate.replace('{{encabezadosTabla}}', encabezadosTabla);
      htmlTemplate = htmlTemplate.replace('{{productos}}', filasProductos);
      htmlTemplate = htmlTemplate.replace(/{{colspanTotales}}/g, colspanTotales);
      htmlTemplate = htmlTemplate.replace(/{{colspanTotalesLabel}}/g, colspanTotalesLabel);
      htmlTemplate = htmlTemplate.replace(/{{colspanTotalesLabel2}}/g, colspanTotalesLabel2);
      
      // Convertir imágenes a base64 para embeber en el HTML
      const imgTopPath = path.join(this.templatesPath, 'img', 'top.png');
      const imgBottomPath = path.join(this.templatesPath, 'img', 'bottom.png');
      
      let imgTopBase64 = '';
      let imgBottomBase64 = '';
      
      try {
        if (fs.existsSync(imgTopPath)) {
          const imgTopBuffer = fs.readFileSync(imgTopPath);
          imgTopBase64 = `data:image/png;base64,${imgTopBuffer.toString('base64')}`;
          htmlTemplate = htmlTemplate.replace(/{{topImg}}/g, imgTopBase64);
          console.log('Imagen top.png cargada correctamente, tamaño:', imgTopBuffer.length, 'bytes');
        } else {
          console.warn('Imagen top.png no encontrada en:', imgTopPath);
          // Eliminar la etiqueta de imagen si no existe el archivo
          htmlTemplate = htmlTemplate.replace(/<img[^>]*{{topImg}}[^>]*>/g, '');
        }
        
        if (fs.existsSync(imgBottomPath)) {
          const imgBottomBuffer = fs.readFileSync(imgBottomPath);
          imgBottomBase64 = `data:image/png;base64,${imgBottomBuffer.toString('base64')}`;
          htmlTemplate = htmlTemplate.replace(/{{bottom1}}/g, imgBottomBase64);
          console.log('Imagen bottom.png cargada correctamente, tamaño:', imgBottomBuffer.length, 'bytes');
        } else {
          console.warn('Imagen bottom.png no encontrada en:', imgBottomPath);
          // Eliminar la etiqueta de imagen si no existe el archivo
          htmlTemplate = htmlTemplate.replace(/<img[^>]*{{bottom1}}[^>]*>/g, '');
        }
      } catch (imgError) {
        console.error('Error al cargar imágenes:', imgError);
        // Continuar sin las imágenes en caso de error
      }
      
      // Crear HTML completo (ya tiene CSS embebido en la plantilla)
      const htmlCompleto = htmlTemplate;
      
      console.log('Iniciando generación de PDF para orden:', datosOrden.numeroOrden);
      
      // Inicializar Puppeteer con configuración más estable y conservadora
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--max-old-space-size=4096',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-default-apps'
        ],
        timeout: 60000,
        protocolTimeout: 60000
      });
      
      const page = await browser.newPage();
      console.log('Página de Puppeteer creada correctamente');
      
      // Configurar timeouts más largos
      page.setDefaultTimeout(60000);
      page.setDefaultNavigationTimeout(60000);
      
      // Configurar el viewport para formato carta (8.5 x 11 pulgadas)
      await page.setViewport({ 
        width: 816,   // 8.5 pulgadas * 96 DPI
        height: 1056, // 11 pulgadas * 96 DPI
        deviceScaleFactor: 1.0
      });
      console.log('Viewport configurado correctamente');
      
      // Cargar el HTML con configuración simplificada
      await page.setContent(htmlCompleto, { 
        waitUntil: 'domcontentloaded',  // Cambio a domcontentloaded para ser menos estricto
        timeout: 30000
      });
      console.log('HTML cargado en la página');
      
      // Esperar a que las imágenes base64 se procesen
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('Esperando carga de imágenes...');
      
      // Aplicar ajustes a las imágenes de forma más segura
      try {
        await page.evaluate(() => {
          const topImg = document.querySelector('img[src*="data:image/png;base64"]') as HTMLImageElement;
          if (topImg) {
            topImg.style.maxHeight = '200px'; // Aumentado para que coincida con CSS
            topImg.style.width = '100%';
            topImg.style.objectFit = 'contain';
            topImg.style.display = 'block';
            topImg.style.margin = '0'; // Sin márgenes
            topImg.style.padding = '0';
          }
        });
        console.log('Estilos de imagen aplicados');
      } catch (evalError) {
        console.warn('Error al aplicar estilos de imagen:', evalError);
        // Continuar sin los estilos personalizados
      }
      
      // Configurar media type para impresión
      await page.emulateMediaType('print');
      console.log('Media type configurado para impresión');
      
      // Espera final antes de generar PDF
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Iniciando generación del archivo PDF...');
      
      // Generar PDF con configuración simplificada y más estable
      try {
        console.log('Llamando a page.pdf()...');
        const pdfBuffer = await page.pdf({
          format: 'Letter',  // Cambio a formato carta
          printBackground: true,
          displayHeaderFooter: false,
          margin: {
            top: '0.25in',     // Márgenes reducidos
            right: '0.25in',
            bottom: '0.25in',
            left: '0.25in'
          },
          timeout: 120000  // Timeout más largo específicamente para la generación del PDF
        });
        
        console.log('PDF generado correctamente, tamaño:', pdfBuffer.length, 'bytes');
        return Buffer.from(pdfBuffer);
      } catch (pdfError) {
        console.error('Error específico al generar PDF:', pdfError);
        
        // Intentar una segunda vez con configuración aún más simple
        console.log('Intentando generar PDF con configuración básica...');
        try {
          const pdfBufferSimple = await page.pdf({
            format: 'Letter',  // También en el fallback usar carta
            margin: {
              top: '0.25in',
              right: '0.25in', 
              bottom: '0.25in',
              left: '0.25in'
            },
            timeout: 120000
          });
          console.log('PDF generado con configuración básica, tamaño:', pdfBufferSimple.length, 'bytes');
          return Buffer.from(pdfBufferSimple);
        } catch (secondError) {
          console.error('Error en segundo intento:', secondError);
          throw pdfError; // Lanzar el error original
        }
      }
      
    } catch (error) {
      console.error('Error al generar PDF:', error);
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
