export type MetodoPago = 'EFECTIVO' | 'YAPE';
export type EstadoVenta = 'COMPLETADA' | 'ANULADA';
export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'VENTA' | 'ANULACION';
export type Periodo = 'diario' | 'semanal' | 'mensual' | 'anual';

export interface Configuracion {
  id: number;
  nombre_negocio: string;
  ruc: string | null;
  direccion: string | null;
  telefono: string | null;
  yape_numero: string | null;
  yape_titular: string | null;
  yape_qr: string | null;
  yape_qr_url: string | null;
  umbral_stock: number;
  moneda: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  productos: number;
}

export interface Producto {
  id: number;
  codigo_barras: string | null;
  nombre: string;
  descripcion: string | null;
  categoria_id: number | null;
  categoria: string | null;
  precio_compra: number;
  precio_venta: number;
  stock: number;
  unidad: string;
  activo: boolean;
}

export interface ProductoInput {
  codigo_barras: string | null;
  nombre: string;
  descripcion: string | null;
  categoria_id: number | null;
  precio_compra: number;
  precio_venta: number;
  unidad: string;
  stock?: number;
}

export interface ItemCarrito {
  producto_id: number;
  nombre: string;
  codigo_barras: string | null;
  precio: number;
  cantidad: number;
  stock: number;
}

export interface VentaItem {
  id: number;
  producto_id: number;
  nombre_producto: string;
  codigo_barras: string | null;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
}

export interface Venta {
  id: number;
  codigo: string;
  fecha: string;
  total: number;
  metodo_pago: MetodoPago;
  monto_recibido: number | null;
  vuelto: number | null;
  estado: EstadoVenta;
  observacion: string | null;
  anulada_en: string | null;
  items_count?: number;
  items?: VentaItem[];
  alertas_stock?: { producto_id: number; nombre: string; stock: number }[];
}

export interface NuevaVenta {
  items: { producto_id: number; cantidad: number }[];
  metodo_pago: MetodoPago;
  monto_recibido?: number;
  observacion?: string;
}

export interface Movimiento {
  id: number;
  producto_id: number;
  producto: string;
  tipo: TipoMovimiento;
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  venta_id: number | null;
  venta_codigo: string | null;
  motivo: string | null;
  fecha: string;
}

export interface ResumenInventario {
  umbral: number;
  productos: number;
  unidades: number;
  valor_costo: number;
  valor_venta: number;
  stock_bajo: number;
  agotados: number;
}

export interface RangoReporte {
  periodo: Periodo;
  desde: string;
  hasta: string;
  etiqueta: string;
}

export interface ReporteVentas {
  rango: RangoReporte;
  resumen: {
    ventas: number;
    total: number;
    ticket_promedio: number;
    unidades: number;
    ganancia: number;
    anuladas: number;
  };
  por_metodo: { metodo: MetodoPago; ventas: number; total: number }[];
  top_productos: { producto_id: number; nombre: string; cantidad: number; total: number }[];
  serie: { etiqueta: string; ventas: number; total: number }[];
}

export interface ProductoReporte extends Producto {
  entradas: number;
  salidas: number;
  vendidos: number;
  estado: 'OK' | 'BAJO' | 'AGOTADO';
}

export interface ReporteInventario {
  rango: RangoReporte;
  umbral: number;
  resumen: {
    productos: number;
    unidades: number;
    valor_costo: number;
    valor_venta: number;
    stock_bajo: number;
    agotados: number;
    entradas: number;
    salidas: number;
    vendidos: number;
  };
  stock_bajo: ProductoReporte[];
  productos: ProductoReporte[];
}
