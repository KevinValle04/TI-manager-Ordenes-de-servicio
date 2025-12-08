import jsPDF from 'jspdf';
import { Actividad, Proyecto, Colaborador } from '../types';

interface GanttExportOptions {
  actividades: Actividad[];
  proyecto: Proyecto;
  colaboradores: Colaborador[];
}

export const exportGanttToPDF = ({ actividades, proyecto, colaboradores }: GanttExportOptions) => {
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
  const labelWidth = 80;
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

    // Etiqueta de la actividad (truncada si es muy larga)
    doc.setFontSize(8);
    doc.setTextColor(...colors.text);
    const descripcionTruncada = actividad.descripcion.length > 35 
      ? actividad.descripcion.substring(0, 32) + '...' 
      : actividad.descripcion;
    doc.text(descripcionTruncada, chartStartX + 2, y + 6);

    // Calcular posición y ancho de la barra
    const inicioActividad = new Date(actividad.fechaInicio);
    const finActividad = new Date(actividad.fechaFinal);
    
    const diasDesdeInicio = Math.max(0, Math.ceil((inicioActividad.getTime() - fechaMinima.getTime()) / (1000 * 60 * 60 * 24)));
    const duracionDias = Math.max(1, Math.ceil((finActividad.getTime() - inicioActividad.getTime()) / (1000 * 60 * 60 * 24)));

    const barraX = chartStartX + labelWidth + (diasDesdeInicio / totalDias) * ganttWidth;
    const barraWidth = Math.max(2, (duracionDias / totalDias) * ganttWidth);
    const barraY = y + 2;
    const barraHeight = rowHeight - 4;

    // Color según estado
    let barraColor: [number, number, number];
    switch (actividad.estado) {
      case 'Completada':
        barraColor = colors.completada;
        break;
      case 'En progreso':
        barraColor = colors.enProgreso;
        break;
      case 'Cancelada':
        barraColor = colors.cancelada;
        break;
      default:
        barraColor = colors.pendiente;
    }

    // Dibujar barra de la actividad
    doc.setFillColor(...barraColor);
    doc.roundedRect(barraX, barraY, barraWidth, barraHeight, 1, 1, 'F');

    // Agregar información de colaboradores si hay espacio
    if (actividad.colaboradores && actividad.colaboradores.length > 0) {
      const colaboradorNombres = actividad.colaboradores
        .map(c => {
          if (typeof c === 'string') {
            const colab = colaboradores.find(col => col._id === c);
            return colab ? colab.nombre.split(' ')[0] : '';
          }
          return c.nombre.split(' ')[0];
        })
        .filter(n => n)
        .slice(0, 2)
        .join(', ');

      if (colaboradorNombres && barraWidth > 20) {
        doc.setFontSize(6);
        doc.setTextColor(255, 255, 255);
        doc.text(colaboradorNombres, barraX + barraWidth / 2, barraY + barraHeight / 2 + 1, { align: 'center' });
      }
    }
  });

  // Leyenda
  const legendY = chartStartY + (actividades.length + 1) * rowHeight + 10;
  doc.setFontSize(9);
  doc.setTextColor(...colors.text);
  doc.text('Leyenda:', chartStartX, legendY);

  const estados: Array<{ nombre: string; color: [number, number, number] }> = [
    { nombre: 'Pendiente', color: colors.pendiente },
    { nombre: 'En progreso', color: colors.enProgreso },
    { nombre: 'Completada', color: colors.completada },
    { nombre: 'Cancelada', color: colors.cancelada }
  ];

  estados.forEach((estado, index) => {
    const legendX = chartStartX + 25 + (index * 50);
    doc.setFillColor(...estado.color);
    doc.roundedRect(legendX, legendY - 3, 8, 4, 0.5, 0.5, 'F');
    doc.setFontSize(8);
    doc.text(estado.nombre, legendX + 10, legendY);
  });

  // Información adicional
  doc.setFontSize(8);
  doc.setTextColor(...colors.gridLine);
  doc.text(
    `Generado el ${new Date().toLocaleDateString('es-MX')} a las ${new Date().toLocaleTimeString('es-MX')}`,
    chartStartX,
    legendY + 8
  );
  doc.text(`Total de actividades: ${actividades.length}`, chartStartX + 120, legendY + 8);

  // Guardar el PDF
  const nombreArchivo = `gantt_${proyecto.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(nombreArchivo);
};
