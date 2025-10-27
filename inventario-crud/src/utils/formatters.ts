// Tipos de moneda disponibles
export const MONEDAS = {
  MXN: { codigo: 'MXN', nombre: 'Pesos Mexicanos', simbolo: '$', locale: 'es-MX' },
  USD: { codigo: 'USD', nombre: 'Dólares Estadounidenses', simbolo: '$', locale: 'en-US' }
} as const;

export type MonedaTipo = keyof typeof MONEDAS;

export const formatearMoneda = (valor: number, moneda: string): string => {
  const monedaInfo = MONEDAS[moneda as MonedaTipo];
  return `${monedaInfo.simbolo}${valor.toLocaleString(monedaInfo.locale, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })} ${monedaInfo.codigo}`;
};