
import Cotizacion from '../models/Cotizacion';
import RazonSocial from '../models/RazonSocial';

/**
 * Genera un número de presupuesto automático basado en:
 * - Primeras 3 letras de la empresa
 * - Primera letra del apellido/segunda palabra
 * - Últimas 3 letras de la empresa
 * - Guión (-)
 * - Primera letra del abecedario (A)
 * - Número secuencial por empresa (001, 002, 003...)
 * 
 * Ejemplo: si la empresa es "ALEJANDRO HERNANDEZ CASTILLO"
 * Resultado: ALE-H-LLO-A001, ALE-H-LLO-A002, etc.
 */
export const generarNumeroPresupuesto = async (razonSocialId?: string, nombreEmpresaDirecto?: string): Promise<string> => {
  try {
    let nombreEmpresa = 'EMPRESA DEFAULT'; // Valor por defecto con espacios
    
    // Si se proporciona nombre directamente, usarlo
    if (nombreEmpresaDirecto) {
      nombreEmpresa = nombreEmpresaDirecto.toUpperCase();
    }
    // Si se proporciona razón social, obtener el nombre
    else if (razonSocialId) {
      const razonSocial = await RazonSocial.findById(razonSocialId);
      if (razonSocial && razonSocial.nombre) {
        nombreEmpresa = razonSocial.nombre.toUpperCase();
      }
    }
    
    // Dividir en palabras para obtener apellido
    const palabras = nombreEmpresa.trim().split(/\s+/);
    const primeraPalabra = palabras[0] || 'EMPRESA';
    const segundaPalabra = palabras[1] || 'DEFAULT';
    
    // Limpiar palabras (solo letras)
    const primeraPalabraLimpia = primeraPalabra.replace(/[^A-Z]/g, '');
    const segundaPalabraLimpia = segundaPalabra.replace(/[^A-Z]/g, '');
    const nombreCompletoLimpio = nombreEmpresa.replace(/[^A-Z]/g, '');
    
    // Generar las partes del código
    let primeras3 = primeraPalabraLimpia.substring(0, 3).padEnd(3, 'X');
    let letraApellido = segundaPalabraLimpia.charAt(0) || 'X'; // Primera letra del apellido
    let ultimas3 = nombreCompletoLimpio.length > 6 ? 
      nombreCompletoLimpio.substring(nombreCompletoLimpio.length - 3) : 
      nombreCompletoLimpio.substring(3, 6).padEnd(3, 'X');
    
    // Generar patrón base
    const patronBase = `${primeras3}-${letraApellido}-${ultimas3}-A`;
    
    // Obtener siguiente número secuencial para esta empresa
    const numeroSecuencial = await obtenerSiguienteNumeroPorEmpresa(patronBase);
    
    // Formato final: ABC-D-EFG-A001
    const numeroPresupuesto = `${patronBase}${numeroSecuencial.toString().padStart(3, '0')}`;
    
    return numeroPresupuesto;
    
  } catch (error) {
    console.error('Error generando número de presupuesto:', error);
    // En caso de error, generar uno básico con timestamp
    const timestamp = Date.now().toString().slice(-3);
    return `EMP-D-EFA-A${timestamp}`;
  }
};

/**
 * Obtiene el siguiente número secuencial para una empresa específica
 * Busca en la BD las cotizaciones existentes con el mismo patrón
 */
const obtenerSiguienteNumeroPorEmpresa = async (patronBase: string): Promise<number> => {
  try {
    // Buscar todas las cotizaciones que empiecen con el patrón base
    const regex = new RegExp(`^${patronBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\d{3}$`);
    const cotizacionesExistentes = await Cotizacion.find({
      numeroPresupuesto: regex
    }).sort({ numeroPresupuesto: -1 }).limit(1);
    
    if (cotizacionesExistentes.length === 0) {
      // No hay cotizaciones previas para esta empresa, empezar en 1
      return 1;
    }
    
    // Extraer el número del último presupuesto
    const ultimoNumero = cotizacionesExistentes[0].numeroPresupuesto;
    const ultimoSecuencial = parseInt(ultimoNumero.slice(-3));
    
    // Retornar el siguiente número
    return ultimoSecuencial + 1;
    
  } catch (error) {
    console.error('Error obteniendo siguiente número secuencial:', error);
    // En caso de error, generar número basado en timestamp
    const ahora = new Date();
    const timestamp = `${ahora.getHours()}${ahora.getMinutes()}${ahora.getSeconds()}`;
    return parseInt(timestamp.slice(-3)) || 1;
  }
};

/**
 * Valida si un número de presupuesto ya existe
 */
export const validarNumeroPresupuestoUnico = async (numeroPresupuesto: string): Promise<boolean> => {
  const Cotizacion = require('../models/Cotizacion').default;
  const existente = await Cotizacion.findOne({ numeroPresupuesto });
  return !existente; // Retorna true si es único (no existe)
};