export interface IItem {
  _id?: string;
  descripcion: string;
  marca: string;
  modelo: string;
  proveedor: string;
  unidad: string;
  precioUnitario: number;
}

export interface Vendedor {
  _id?: string;
  nombre: string;
  correo: string;
  telefono: string;
}

export interface IInventoryItem {
  _id?: string;
  descripcion: string;
  marca: string;
  modelo: string;
  proveedor: string;
  unidad: string;
  precioUnitario: number;
  cantidad: number;
  numerosSerie: string[];
  categorias: string[];
  razonSocial?: string | RazonSocial; // Referencia opcional a RazonSocial (puede ser ID o objeto poblado)
}

export interface IInventoryMovement {
  _id?: string;
  itemId: any; // Puede ser objeto o string
  tipo: "entrada" | "salida";
  cantidad: number;
  fecha: string;
  comentario?: string;
  usuario?: string;
}

export interface Persona {
  nombre: string;
  correo: string;
  telefono: string;
}

export interface IContacto {
  nombre: string;
  puesto: string;
  contacto: {
    correo: string;
    telefono: string;
    extension?: string;
  };
}

export interface Cliente {
  _id?: string;
  nombreEmpresa: string;
  direccion: string;
  telefono: string;
  contactos: IContacto[];
}

export interface Guia {
  _id?: string;
  numeroGuia: string;
  proveedor: string;
  paqueteria: string;
  fechaPedido: string;
  fechaLlegada: string;
  proyectos: string[];
  estado: 'entregado' | 'no entregado' | 'en transito' | 'atrasado';
  comentarios?: string; // Nuevo campo
}

export interface IContactoProveedor {
  nombre: string;
  puesto: string;
  correo: string;
  telefono: string;
  extension?: string;
}

export interface Proveedor {
  _id?: string;
  empresa: string;
  direccion: string;
  telefono: string;
  contactos: IContactoProveedor[];
}

export interface IDireccionEnvio {
  nombre: string;
  direccion: string;
  telefono?: string;
  contacto?: string;
}

export interface RazonSocial {
  _id?: string;
  nombre: string;
  rfc: string;
  emailEmpresa: string;
  telEmpresa: string;
  celEmpresa: string;
  direccionEmpresa: string;
  emailFacturacion: string;
  direccionEnvio: IDireccionEnvio[];
}

export interface OrdenCompra {
  _id?: string;
  numeroOrden: string;
  numeroCotizacion?: string; // Número de cotización extraído del PDF
  fecha: Date | string;
  proveedor: string | Proveedor;
  razonSocial: string | RazonSocial;
  vendedor?: string | Vendedor;
  proyecto?: string | Proyecto; // Referencia al proyecto (opcional)
  datosOrden: any;
  rutaPdf?: string; // Ruta del PDF generado
  createdAt?: string;
  updatedAt?: string;
}

export interface Colaborador {
  _id?: string;
  numeroEmpleado?: string;
  nombre: string;
  nss: string;
  puesto: string;
  fotografia?: string;
  fechaAltaIMSS: Date | string;
  razonSocialId: string;
  activo: boolean;
}

export interface MaterialCanalizacion {
  _id?: string;
  tipo: string;
  material: string;
  medida: string;
  unidad: "PZA" | "MTS";
  proveedor: string;
  precio: number;
  fechaActualizacion: Date | string;
}

export interface CotizacionCanalizacion {
  _id?: string;
  numeroPresupuesto: string;
  cliente: string | Cliente;
  razonSocial?: string | RazonSocial; // Referencia a la razón social (opcional)
  fecha: Date | string;
  vigencia: Date | string;
  subtotal: number;
  utilidad: number; // Porcentaje de utilidad
  total: number;
  estado: "Borrador" | "Enviada" | "Aceptada" | "Rechazada" | "Vencida";
  items: ItemCotizacionCanalizacion[];
  comentarios?: string;
  fechaCreacion: Date | string;
  fechaActualizacion: Date | string;
}

export interface ItemCotizacionCanalizacion {
  _id?: string;
  materialCanalizacion?: string | MaterialCanalizacion; // Referencia al material (opcional)
  descripcion: string;
  cantidad: number;
  unidad: "PZA" | "MTS";
  precioUnitario: number;
  subtotal: number;
}

export interface Cotizacion {
  _id?: string;
  numeroPresupuesto: string;
  cliente: string | Cliente;
  razonSocial?: string | RazonSocial; // Referencia a la razón social (opcional)
  proyecto?: string | Proyecto; // Referencia al proyecto (opcional)
  fecha: Date | string;
  vigencia: Date | string;
  subtotal: number;
  iva: number; // Porcentaje de IVA (8%)
  ivaImporte: number; // Monto del IVA
  total: number;
  estado: "Borrador" | "Enviada" | "Aceptada" | "Rechazada" | "Vencida";
  moneda?: string; // Moneda de la cotización (MXN o USD)
  items: ItemCotizacion[];
  comentarios?: string;
  fechaCreacion: Date | string;
  fechaActualizacion: Date | string;
}

export interface Entrega {
  _id?: string;
  numeroEntrega: string;
  cliente: string | Cliente;
  razonSocial?: string | RazonSocial; // Referencia a la razón social (opcional)
  proyecto?: string | Proyecto; // Referencia al proyecto (opcional)
  fecha: Date | string;
  items: ItemEntrega[];
  comentarios?: string;
  fechaCreacion: Date | string;
  fechaActualizacion: Date | string;
}

export interface ItemCotizacion {
  _id?: string;
  clave: number;
  marca?: string;
  modelo?: string;
  concepto: string;
  cantidad: number;
  unidad: "PZA" | "MTS" | "SERV" | "LOTE";
  precioUnitario: number; // Precio costo unitario (lo que nos cuesta)
  porcentajeGanancia: number; // Porcentaje de ganancia a aplicar
  ganancia: number; // Ganancia por unidad en valor monetario
  importe: number; // Importe final (cantidad * (precioUnitario + ganancia))
  aplicarIva: boolean;
  material?: string | IInventoryItem; // Referencia al material (opcional)
  canalizacionId?: string; // ID de la canalización si aplica
  esCanalizacion?: boolean;
  esSeparador?: boolean; // Para identificar si es un separador visual
}

export interface ItemEntrega {
  _id?: string;
  clave: number;
  marca?: string;
  modelo?: string;
  concepto: string;
  cantidad: number;
  unidad: "PZA" | "MTS" | "SERV" | "LOTE";
  inventarioItemId?: string; // Referencia opcional al item de inventario
}

export interface Proyecto {
  _id?: string;
  nombre: string;
  fechaInicio: Date | string;
  fechaTerminacion: Date | string;
  colaboradores: string[] | Colaborador[]; // Array de IDs o colaboradores populados
  estado?: 'En progreso' | 'Completado' | 'Pausado' | 'Cancelado';
  descripcion?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface DireccionIP {
  _id?: string;
  proyecto: string;
  equipo: string;
  usuario: string;
  contrasena: string;
  direccion: string;
  esRango: boolean;
  direccionFin?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface EvidenciaActividad {
  _id?: string;
  nombre: string;
  url: string;
  tipo: string; // image/jpeg, image/png, etc.
  tamaño: number; // En bytes
  fechaSubida: Date | string;
  subidoPor?: string; // Usuario que subió la imagen
}

export interface NotaActividad {
  _id?: string;
  texto: string;
  fechaCreacion: Date | string;
  creadoPor?: string; // Usuario que creó la nota
}

export interface Actividad {
  _id?: string;
  proyecto: string | Proyecto; // Referencia al proyecto
  numeroActividad?: string; // Número de actividad: ACT00, ACT01, etc.
  descripcion: string;
  fechaInicio: Date | string;
  fechaFinal: Date | string;
  estado: 'Pendiente' | 'En progreso' | 'Completada' | 'Cancelada';
  colaboradores: string[] | Colaborador[]; // Array de IDs o colaboradores populados
  color?: string; // Color personalizado para la tarjeta
  evidencias?: EvidenciaActividad[]; // Imágenes de evidencia
  notas?: NotaActividad[]; // Notas de texto
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface HistorialServicio {
  _id?: string;
  fecha: Date | string;
  descripcion?: string;
  kilometraje?: number;
  costo?: number;
  realizadoPor?: string;
}

export interface Vehiculo {
  _id?: string;
  marca: string;
  modelo: string;
  año: number;
  color: string;
  placas?: string;
  numeroSerie?: string;
  ultimoServicio?: Date | string;
  proximoServicio?: Date | string;
  historialServicios: HistorialServicio[];
  activo: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
