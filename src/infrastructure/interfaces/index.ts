export type UnidadVenta = 'unidad' | 'kilo';

export type MetodoPago = 'efectivo' | 'yape' | 'plin' | 'tarjeta' | 'fiado';

export interface Categoria {
  id: string;
  nombre: string;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoriaId: string;
  unidad: UnidadVenta;
  precioCompra: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  emoji: string;
  creadoEn: string;
}

export interface ItemCarrito {
  productoId: string;
  cantidad: number;
}

export interface ItemVenta {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  unidad: UnidadVenta;
}

export interface Venta {
  id: string;
  codigo: string;
  fecha: string;
  items: ItemVenta[];
  subtotal: number;
  descuento: number;
  total: number;
  metodo: MetodoPago;
  montoRecibido?: number;
  vuelto?: number;
  notas: string;
  clienteId?: string;
}

export interface MovimientoFiado {
  id: string;
  fecha: string;
  tipo: 'cargo' | 'abono';
  monto: number;
  ventaId?: string;
}

export interface ClienteFiado {
  id: string;
  nombre: string;
  telefono: string;
  movimientos: MovimientoFiado[];
}

export interface CuentaDigital {
  activo: boolean;
  numero: string;
  titular: string;
  qrUri?: string;
}

export interface ConfigNegocio {
  nombre: string;
  ruc: string;
  telefono: string;
  direccion: string;
  mensajeTicket: string;
  logoUri?: string;
  moneda: string;
  efectivo: boolean;
  tarjeta: boolean;
  fiado: boolean;
  yape: CuentaDigital;
  plin: CuentaDigital;
}
