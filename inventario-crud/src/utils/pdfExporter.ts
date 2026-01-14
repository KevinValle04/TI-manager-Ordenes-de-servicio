import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { CotizacionCanalizacion } from '../types';

export const exportarCotizacionPDF = (cotizacion: CotizacionCanalizacion) => {
  // Crear nuevo documento PDF
  const doc = new jsPDF();
  
  // ===== ENCABEZADO PROFESIONAL SIMILAR A ORDEN DE COMPRA =====
  
  // Título principal con estilo moderno
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(37, 99, 235); // Color azul similar al CSS
  doc.text('COTIZACIÓN DE CANALIZACIÓN', 105, 25, { align: 'center' });
  
  // Subtítulo con el nombre de la empresa
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(100, 116, 139); // Color gris elegante
  doc.text('TIMANAGER', 105, 35, { align: 'center' });
  
  // Línea decorativa con gradiente simulado (múltiples líneas en azul)
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(3);
  doc.line(20, 45, 190, 45);
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(1);
  doc.line(20, 47, 120, 47); // Línea más corta para simular gradiente
  
  // ===== INFORMACIÓN DE LA COTIZACIÓN (lado derecho) =====
  const infoStartY = 55;
  
  // Número de presupuesto destacado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(30, 41, 59);
  doc.text(cotizacion.numeroPresupuesto, 190, infoStartY, { align: 'right' });
  
  // Badge de estado con color
  const estadoColors = {
    'Borrador': { bg: [243, 244, 246], text: [55, 65, 81] },
    'Enviada': { bg: [219, 234, 254], text: [29, 78, 216] },
    'Aceptada': { bg: [220, 252, 231], text: [22, 101, 52] },
    'Rechazada': { bg: [254, 226, 226], text: [220, 38, 38] },
    'Vencida': { bg: [254, 243, 199], text: [217, 119, 6] }
  };
  
  const estadoColor = estadoColors[cotizacion.estado as keyof typeof estadoColors] || estadoColors['Borrador'];
  
  // Crear badge del estado
  doc.setFillColor(estadoColor.bg[0], estadoColor.bg[1], estadoColor.bg[2]);
  doc.setDrawColor(estadoColor.bg[0], estadoColor.bg[1], estadoColor.bg[2]);
  doc.roundedRect(170, infoStartY + 5, 35, 8, 4, 4, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(estadoColor.text[0], estadoColor.text[1], estadoColor.text[2]);
  doc.text(cotizacion.estado.toUpperCase(), 187.5, infoStartY + 10.5, { align: 'center' });
  
  // ===== SECCIÓN DEL CLIENTE (estilo de orden de compra) =====
  const clienteStartY = 75;
  
  // Cliente info con fondo azul claro
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(4);
  doc.rect(20, clienteStartY, 80, 40, 'FD');
  doc.line(20, clienteStartY, 20, clienteStartY + 40); // Línea azul izquierda
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text('INFORMACIÓN DEL CLIENTE', 25, clienteStartY + 8);
  
  const clienteNombre = typeof cotizacion.cliente === 'string' 
    ? cotizacion.cliente 
    : cotizacion.cliente.nombreEmpresa || 'Cliente no especificado';
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`Cliente: ${clienteNombre}`, 25, clienteStartY + 18);
  doc.text(`Presupuesto: ${cotizacion.numeroPresupuesto}`, 25, clienteStartY + 28);
  
  // Detalles de cotización con fondo azul claro
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(4);
  doc.rect(110, clienteStartY, 80, 40, 'FD');
  doc.line(110, clienteStartY, 110, clienteStartY + 40); // Línea azul izquierda
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text('DETALLES DE COTIZACIÓN', 115, clienteStartY + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`Fecha: ${new Date(cotizacion.fecha).toLocaleDateString('es-MX')}`, 115, clienteStartY + 18);
  doc.text(`Vigencia: ${new Date(cotizacion.vigencia).toLocaleDateString('es-MX')}`, 115, clienteStartY + 28);
  doc.text(`Utilidad: ${cotizacion.utilidad}%`, 115, clienteStartY + 38);
  
  // ===== SECCIÓN DE ITEMS (estilo moderno) =====
  const itemsStartY = clienteStartY + 55;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('DETALLE DE MATERIALES DE CANALIZACIÓN', 20, itemsStartY);
  
  // Línea decorativa bajo el título
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(2);
  doc.line(20, itemsStartY + 3, 190, itemsStartY + 3);
  
  // Preparar datos de la tabla
  const itemsValidos = cotizacion.items.filter(item => 
    item.descripcion && 
    item.descripcion.trim() !== '' && 
    !item.descripcion.match(/^producto\d+$/i)
  );
  
  const tableData = itemsValidos.map(item => {
    let descripcion = item.descripcion;
    if (item.descripcion.match(/^producto\d+$/i)) {
      descripcion = 'Material de canalización eléctrica';
    }
    
    return [
      descripcion,
      item.cantidad.toString(),
      item.unidad,
      `$${item.precioUnitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      `$${item.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
    ];
  });
  
  if (tableData.length === 0) {
    tableData.push([
      'Sin materiales especificados',
      '0',
      'PZA',
      '$0.00',
      '$0.00'
    ]);
  }
  
  // Tabla con estilo moderno (gradiente en header)
  (doc as any).autoTable({
    head: [['DESCRIPCIÓN DEL MATERIAL', 'CANT.', 'UNIDAD', 'PRECIO UNIT.', 'IMPORTE']],
    body: tableData,
    startY: itemsStartY + 15,
    styles: {
      fontSize: 10,
      cellPadding: 8,
      lineColor: [226, 232, 240],
      lineWidth: 1,
      textColor: [30, 41, 59]
    },
    headStyles: {
      fillColor: [37, 99, 235], // Azul sólido para simular gradiente
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    columnStyles: {
      0: { cellWidth: 80, halign: 'left' },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right', textColor: [5, 150, 105], fontStyle: 'bold' } // Verde para importes
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    didParseCell: function(data: any) {
      if (data.cell.section === 'body' && data.row.index % 2 === 0) {
        data.cell.styles.fillColor = [249, 250, 251];
      }
    }
  });
  
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  // ===== SECCIÓN DE TOTALES (estilo moderno) =====
  const utilidadMonto = cotizacion.total - cotizacion.subtotal;
  
  // Crear caja de totales con sombra simulada
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.rect(130, finalY, 60, 40, 'FD');
  
  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', 135, finalY + 8);
  doc.setTextColor(5, 150, 105);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${cotizacion.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 185, finalY + 8, { align: 'right' });
  
  // Utilidad
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Utilidad (${cotizacion.utilidad}%):`, 135, finalY + 18);
  doc.setTextColor(5, 150, 105);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${utilidadMonto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 185, finalY + 18, { align: 'right' });
  
  // Total destacado con fondo azul (simulando gradiente)
  doc.setFillColor(37, 99, 235);
  doc.rect(135, finalY + 25, 50, 10, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', 138, finalY + 32);
  doc.setFontSize(16);
  doc.text(`$${cotizacion.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 182, finalY + 32, { align: 'right' });
  
  // ===== SECCIÓN DE COMENTARIOS (si existen) =====
  const finalYTotal = finalY + 55;
  
  if (cotizacion.comentariosPdf && cotizacion.comentariosPdf.trim() !== '') {
    // Fondo amarillo claro para observaciones (similar al CSS)
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(1);
    doc.rect(20, finalYTotal, 170, 25, 'FD');
    
    // Header de observaciones con fondo naranja
    doc.setFillColor(245, 158, 11);
    doc.rect(20, finalYTotal, 170, 8, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('OBSERVACIONES', 25, finalYTotal + 6);
    
    // Contenido de los comentarios
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(146, 64, 14); // Color café oscuro
    const comentarios = doc.splitTextToSize(cotizacion.comentariosPdf, 160);
    doc.text(comentarios, 25, finalYTotal + 15);
  }
  
  // ===== PIE DE PÁGINA (estilo orden de compra) =====
  const footerY = finalYTotal + (cotizacion.comentariosPdf ? 35 : 20);
  
  // Línea decorativa superior
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(2);
  doc.line(20, footerY, 190, footerY);
  
  // Condiciones (lado izquierdo)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(55, 65, 81);
  doc.text('Condiciones:', 20, footerY + 15);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  
  const condiciones = [
    '• Precios sujetos a cambio sin previo aviso',
    `• Cotización válida hasta: ${new Date(cotizacion.vigencia).toLocaleDateString('es-MX')}`,
    '• Precios expresados en pesos mexicanos'
  ];
  
  condiciones.forEach((condicion, index) => {
    doc.text(condicion, 20, footerY + 25 + (index * 6));
  });
  
  // Mensaje de agradecimiento (lado derecho)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.text('¡Gracias por su preferencia!', 190, footerY + 20, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text('Para más información contacte con nuestro', 190, footerY + 30, { align: 'right' });
  doc.text('equipo de ventas', 190, footerY + 38, { align: 'right' });
  
  // Pie de página final
  const bottomY = doc.internal.pageSize.height - 15;
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(`Generado el ${new Date().toLocaleDateString('es-MX')} • TIMANAGER`, 105, bottomY, { align: 'center' });
  
  // Descargar el PDF
  const fileName = `Cotizacion-${cotizacion.numeroPresupuesto}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

export const exportarListaCotizacionesPDF = (cotizaciones: CotizacionCanalizacion[]) => {
  const doc = new jsPDF();
  
  // ===== ENCABEZADO PROFESIONAL =====
  
  // Título principal con estilo moderno
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(37, 99, 235);
  doc.text('REPORTE DE COTIZACIONES', 105, 25, { align: 'center' });
  
  // Subtítulo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(100, 116, 139);
  doc.text('CANALIZACIÓN ELÉCTRICA', 105, 35, { align: 'center' });
  
  // Línea decorativa con gradiente simulado
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(3);
  doc.line(20, 45, 190, 45);
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(1);
  doc.line(20, 47, 120, 47);
  
  // ===== INFORMACIÓN DEL REPORTE =====
  const infoStartY = 60;
  
  // Calcular totales
  const totalGeneral = cotizaciones.reduce((sum, cot) => sum + cot.total, 0);
  
  // Caja de información con fondo azul claro
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(4);
  doc.rect(20, infoStartY, 170, 25, 'FD');
  doc.line(20, infoStartY, 20, infoStartY + 25); // Línea azul izquierda
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`Total de cotizaciones: ${cotizaciones.length}`, 25, infoStartY + 8);
  doc.text(`Monto total: $${totalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 25, infoStartY + 18);
  
  // Fecha de generación
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generado el: ${new Date().toLocaleDateString('es-MX')}`, 160, infoStartY + 8, { align: 'right' });
  
  // ===== TABLA DE COTIZACIONES =====
  const tableStartY = infoStartY + 35;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('RESUMEN DE COTIZACIONES', 20, tableStartY);
  
  // Línea decorativa
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(2);
  doc.line(20, tableStartY + 3, 190, tableStartY + 3);
  
  // Preparar datos para la tabla
  const tableData = cotizaciones.map((cotizacion, index) => {
    const clienteNombre = typeof cotizacion.cliente === 'string' 
      ? cotizacion.cliente 
      : cotizacion.cliente.nombreEmpresa || 'N/A';
      
    return [
      (index + 1).toString(),
      cotizacion.numeroPresupuesto,
      clienteNombre.length > 25 ? clienteNombre.substring(0, 22) + '...' : clienteNombre,
      new Date(cotizacion.fecha).toLocaleDateString('es-MX'),
      cotizacion.estado,
      `$${cotizacion.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
    ];
  });
  
  // Tabla con estilo moderno
  (doc as any).autoTable({
    head: [['#', 'No. Presupuesto', 'Cliente', 'Fecha', 'Estado', 'Total']],
    body: tableData,
    startY: tableStartY + 15,
    styles: {
      fontSize: 10,
      cellPadding: 6,
      lineColor: [226, 232, 240],
      lineWidth: 1,
      textColor: [30, 41, 59]
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 50, halign: 'left' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 30, halign: 'right', textColor: [5, 150, 105], fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    // Colores para estados
    didParseCell: function(data: any) {
      if (data.column.index === 4 && data.cell.section === 'body') {
        const estado = data.cell.text[0];
        const estadoColors = {
          'Borrador': [55, 65, 81],
          'Enviada': [29, 78, 216],
          'Aceptada': [22, 101, 52],
          'Rechazada': [220, 38, 38],
          'Vencida': [217, 119, 6]
        };
        
        const color = estadoColors[estado as keyof typeof estadoColors] || [55, 65, 81];
        data.cell.styles.textColor = color;
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });
  
  // ===== RESUMEN POR ESTADO =====
  const finalY = (doc as any).lastAutoTable.finalY + 25;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('RESUMEN POR ESTADO', 20, finalY);
  
  // Línea decorativa
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(2);
  doc.line(20, finalY + 3, 190, finalY + 3);
  
  // Contar por estado
  const estadosCount = cotizaciones.reduce((acc: any, cot) => {
    acc[cot.estado] = (acc[cot.estado] || 0) + 1;
    return acc;
  }, {});
  
  // Crear cajas de resumen por estado
  let yPos = finalY + 15;
  let xPos = 20;
  const boxWidth = 80;
  const boxHeight = 25;
  
  const estadoColorsBox = {
    'Borrador': { bg: [243, 244, 246], text: [55, 65, 81] },
    'Enviada': { bg: [219, 234, 254], text: [29, 78, 216] },
    'Aceptada': { bg: [220, 252, 231], text: [22, 101, 52] },
    'Rechazada': { bg: [254, 226, 226], text: [220, 38, 38] },
    'Vencida': { bg: [254, 243, 199], text: [217, 119, 6] }
  };
  
  Object.entries(estadosCount).forEach(([estado, count], index) => {
    if (index > 0 && index % 2 === 0) {
      yPos += boxHeight + 5;
      xPos = 20;
    }
    
    const colorInfo = estadoColorsBox[estado as keyof typeof estadoColorsBox] || estadoColorsBox['Borrador'];
    
    // Crear caja del estado
    doc.setFillColor(colorInfo.bg[0], colorInfo.bg[1], colorInfo.bg[2]);
    doc.setDrawColor(colorInfo.text[0], colorInfo.text[1], colorInfo.text[2]);
    doc.setLineWidth(1);
    doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD');
    
    // Texto del estado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(colorInfo.text[0], colorInfo.text[1], colorInfo.text[2]);
    doc.text(estado.toUpperCase(), xPos + boxWidth/2, yPos + 10, { align: 'center' });
    
    // Cantidad
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`${count}`, xPos + boxWidth/2, yPos + 20, { align: 'center' });
    
    xPos += boxWidth + 10;
  });
  
  // ===== PIE DE PÁGINA PROFESIONAL =====
  const footerY = yPos + boxHeight + 30;
  
  // Línea decorativa superior
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(2);
  doc.line(20, footerY, 190, footerY);
  
  // Mensaje de agradecimiento centrado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(37, 99, 235);
  doc.text('¡Gracias por confiar en TIMANAGER!', 105, footerY + 15, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128);
  doc.text('Sistema de Gestión de Cotizaciones • Departamento de Ventas', 105, footerY + 25, { align: 'center' });
  
  // Pie de página final
  const bottomY = doc.internal.pageSize.height - 15;
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(`Reporte generado el ${new Date().toLocaleDateString('es-MX')} • TIMANAGER`, 105, bottomY, { align: 'center' });
  
  // Descargar
  const fileName = `Reporte-Cotizaciones-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};