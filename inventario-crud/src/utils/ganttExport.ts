import jsPDF from 'jspdf';
import { Actividad, Proyecto } from '../types';

interface GanttExportOptions {
  actividades: Actividad[];
  proyecto: Proyecto;
}

export const exportGanttToPDF = ({ actividades, proyecto }: GanttExportOptions) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Configuración de colores
  const colors = {
    header: [41, 128, 185] as [number, number, number], // Azul
    text: [52, 73, 94] as [number, number, number], // Gris oscuro
    gridLine: [189, 195, 199] as [number, number, number], // Gris claro
    pendiente: [149, 165, 166] as [number, number, number], // Gris
    enProgreso: [52, 152, 219] as [number, number, number], // Azul
    completada: [46, 204, 113] as [number, number, number], // Verde
    cancelada: [231, 76, 60] as [number, number, number] // Rojo
  };

  // Título del documento
  doc.setFontSize(18);
  doc.setTextColor(...colors.header);
  doc.text('Diagrama de Gantt', 148, 15, { align: 'center' });

  // Información del proyecto
  doc.setFontSize(12);
  doc.setTextColor(...colors.text);
  doc.text(`Proyecto: ${proyecto.nombre}`, 15, 25);

  // Obtener el rango de fechas
  if (actividades.length === 0) {
    doc.setFontSize(10);
    doc.text('No hay actividades para mostrar en el diagrama', 15, 35);
    doc.save(`gantt_${proyecto.nombre}_${new Date().toISOString().split('T')[0]}.pdf`);
    return;
  }

  const fechas = actividades.map(a => ({
    inicio: new Date(a.fechaInicio),
    fin: new Date(a.fechaFinal)
  }));

  const fechaMinima = new Date(Math.min(...fechas.map(f => f.inicio.getTime())));
  const fechaMaxima = new Date(Math.max(...fechas.map(f => f.fin.getTime())));

  // Añadir margen a las fechas
  fechaMinima.setDate(fechaMinima.getDate() - 2);
  fechaMaxima.setDate(fechaMaxima.getDate() + 2);

  const totalDias = Math.ceil((fechaMaxima.getTime() - fechaMinima.getTime()) / (1000 * 60 * 60 * 24));

  // Configuración del área del diagrama
  const chartStartX = 15;
  const chartStartY = 35;
  const chartWidth = 267; // Ancho disponible en landscape A4
  const rowHeight = 10;
  const labelWidth = 25; // Reducido: solo mostramos ACT00, ACT01, etc.
  const ganttWidth = chartWidth - labelWidth;

  // Dibujar encabezado de fechas
  doc.setFontSize(8);
  doc.setTextColor(...colors.text);
  
  // Calcular intervalo de fechas para mostrar
  const intervalo = Math.ceil(totalDias / 15); // Mostrar aproximadamente 15 marcas
  
  for (let i = 0; i <= totalDias; i += intervalo) {
    const fecha = new Date(fechaMinima);
    fecha.setDate(fecha.getDate() + i);
    const x = chartStartX + labelWidth + (i / totalDias) * ganttWidth;
    
    // Línea vertical de la cuadrícula
    doc.setDrawColor(...colors.gridLine);
    doc.setLineWidth(0.1);
    doc.line(x, chartStartY, x, chartStartY + (actividades.length + 1) * rowHeight);
    
    // Etiqueta de fecha
    const fechaStr = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    doc.text(fechaStr, x, chartStartY - 2, { align: 'center' });
  }

  // Dibujar línea horizontal superior
  doc.setDrawColor(...colors.text);
  doc.setLineWidth(0.3);
  doc.line(chartStartX, chartStartY, chartStartX + chartWidth, chartStartY);

  // Dibujar cada actividad
  actividades.forEach((actividad, index) => {
    const y = chartStartY + (index + 1) * rowHeight;

    // Línea horizontal de separación
    doc.setDrawColor(...colors.gridLine);
    doc.setLineWidth(0.1);
    doc.line(chartStartX, y + rowHeight, chartStartX + chartWidth, y + rowHeight);

    // Mostrar solo el número de actividad en la etiqueta izquierda (ACT00, ACT01, etc.)
    doc.setFontSize(8);
    doc.setTextColor(...colors.text);
    const numeroAct = actividad.numeroActividad || `ACT${index.toString().padStart(2, '0')}`;
    doc.text(numeroAct, chartStartX + 2, y + 6);

    // Calcular posición y ancho de la barra
    const inicioActividad = new Date(actividad.fechaInicio);
    const finActividad = new Date(actividad.fechaFinal);
    
    const diasDesdeInicio = Math.max(0, Math.ceil((inicioActividad.getTime() - fechaMinima.getTime()) / (1000 * 60 * 60 * 24)));
    const duracionDias = Math.max(1, Math.ceil((finActividad.getTime() - inicioActividad.getTime()) / (1000 * 60 * 60 * 24)));

    const barraX = chartStartX + labelWidth + (diasDesdeInicio / totalDias) * ganttWidth;
    const barraWidth = Math.max(2, (duracionDias / totalDias) * ganttWidth);
    const barraY = y + 2;
    const barraHeight = rowHeight - 4;

    // Color azul para todas las barras
    const barraColor = colors.enProgreso;

    // Dibujar barra de la actividad (sin texto)
    doc.setFillColor(...barraColor);
    doc.roundedRect(barraX, barraY, barraWidth, barraHeight, 1, 1, 'F');
  });

  // Listado de actividades con descripción y tiempos
  let listadoY = chartStartY + (actividades.length + 1) * rowHeight + 10;
  doc.setFontSize(9);
  doc.setTextColor(...colors.header);
  doc.text('Listado de Actividades:', chartStartX, listadoY);
  listadoY += 5;

  // Encabezados de la tabla
  doc.setFontSize(7);
  doc.setTextColor(...colors.text);
  doc.setFont('helvetica', 'bold');
  doc.text('No.', chartStartX, listadoY);
  doc.text('Descripción', chartStartX + 15, listadoY);
  doc.text('Inicio', chartStartX + 140, listadoY);
  doc.text('Fin', chartStartX + 175, listadoY);
  doc.text('Estado', chartStartX + 210, listadoY);
  
  doc.setDrawColor(...colors.gridLine);
  doc.setLineWidth(0.2);
  doc.line(chartStartX, listadoY + 1, chartStartX + 250, listadoY + 1);
  listadoY += 5;

  doc.setFont('helvetica', 'normal');
  actividades.forEach((actividad, index) => {
    // Verificar si necesitamos una nueva página
    if (listadoY > 195) {
      doc.addPage();
      listadoY = 15;
      // Re-imprimir encabezados en nueva página
      doc.setFontSize(9);
      doc.setTextColor(...colors.header);
      doc.text('Listado de Actividades (continuación):', chartStartX, listadoY);
      listadoY += 5;
      doc.setFontSize(7);
      doc.setTextColor(...colors.text);
      doc.setFont('helvetica', 'bold');
      doc.text('No.', chartStartX, listadoY);
      doc.text('Descripción', chartStartX + 15, listadoY);
      doc.text('Inicio', chartStartX + 140, listadoY);
      doc.text('Fin', chartStartX + 175, listadoY);
      doc.text('Estado', chartStartX + 210, listadoY);
      doc.setDrawColor(...colors.gridLine);
      doc.line(chartStartX, listadoY + 1, chartStartX + 250, listadoY + 1);
      listadoY += 5;
      doc.setFont('helvetica', 'normal');
    }

    const numeroAct = actividad.numeroActividad || `ACT${index.toString().padStart(2, '0')}`;
    const descripcionTruncada = actividad.descripcion.length > 60 
      ? actividad.descripcion.substring(0, 57) + '...' 
      : actividad.descripcion;
    const fechaInicioStr = new Date(actividad.fechaInicio).toLocaleDateString('es-MX', { 
      day: '2-digit', month: 'short', year: 'numeric' 
    });
    const fechaFinStr = new Date(actividad.fechaFinal).toLocaleDateString('es-MX', { 
      day: '2-digit', month: 'short', year: 'numeric' 
    });

    doc.setFontSize(7);
    doc.setTextColor(...colors.text);
    doc.text(numeroAct, chartStartX, listadoY);
    doc.text(descripcionTruncada, chartStartX + 15, listadoY);
    doc.text(fechaInicioStr, chartStartX + 140, listadoY);
    doc.text(fechaFinStr, chartStartX + 175, listadoY);
    doc.text(actividad.estado, chartStartX + 210, listadoY);
    
    listadoY += 4;
  });

  // Información adicional al final
  listadoY += 5;
  doc.setFontSize(8);
  doc.setTextColor(...colors.gridLine);
  doc.text(
    `Generado el ${new Date().toLocaleDateString('es-MX')} a las ${new Date().toLocaleTimeString('es-MX')}`,
    chartStartX,
    listadoY
  );
  doc.text(`Total de actividades: ${actividades.length}`, chartStartX + 120, listadoY);

  // Guardar el PDF
  const nombreArchivo = `gantt_${proyecto.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(nombreArchivo);
};
