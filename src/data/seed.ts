import { Categoria, ConfigNegocio, Producto } from '@/infrastructure/interfaces';

export const categoriasIniciales: Categoria[] = [
  { id: 'abarrotes', nombre: 'Abarrotes' },
  { id: 'bebidas', nombre: 'Bebidas' },
  { id: 'snacks', nombre: 'Snacks' },
  { id: 'lacteos', nombre: 'Lácteos' },
  { id: 'limpieza', nombre: 'Limpieza' },
  { id: 'verduras', nombre: 'Verduras' },
];

const p = (
  id: string,
  codigo: string,
  nombre: string,
  categoriaId: string,
  precioCompra: number,
  precioVenta: number,
  stock: number,
  emoji: string,
  unidad: Producto['unidad'] = 'unidad',
  stockMinimo = 5,
): Producto => ({
  id,
  codigo,
  nombre,
  descripcion: '',
  categoriaId,
  unidad,
  precioCompra,
  precioVenta,
  stock,
  stockMinimo,
  emoji,
  creadoEn: new Date().toISOString(),
});

export const productosIniciales: Producto[] = [
  p('p1', '7750885012345', 'Arroz Costeño 1 kg', 'abarrotes', 3.8, 4.5, 40, '🍚'),
  p('p2', '7751271001234', 'Azúcar rubia 1 kg', 'abarrotes', 3.2, 3.9, 25, '🧂'),
  p('p3', '7750243050123', 'Aceite Primor 900 ml', 'abarrotes', 8.5, 10.5, 12, '🫒'),
  p('p4', '7750182000123', 'Fideos Don Vittorio 500 g', 'abarrotes', 2.6, 3.2, 30, '🍝'),
  p('p5', '7750670000123', 'Inca Kola 500 ml', 'bebidas', 1.9, 2.5, 48, '🥤'),
  p('p6', '7751271011111', 'Agua San Luis 625 ml', 'bebidas', 1.0, 1.5, 3, '💧'),
  p('p7', '7750106000123', 'Morochas Snack', 'snacks', 1.4, 2.0, 20, '🍪'),
  p('p8', '7750168000456', 'Doritos 45 g', 'snacks', 1.8, 2.5, 15, '🌽'),
  p('p9', '7751271022222', 'Papas Lay\'s 42 g', 'snacks', 1.7, 2.5, 0, '🥔'),
  p('p10', '7751271033333', 'Leche Gloria 400 g', 'lacteos', 3.4, 4.2, 36, '🥛'),
  p('p11', '7751271044444', 'Yogurt Gloria 1 L', 'lacteos', 5.8, 7.0, 4, '🍶'),
  p('p12', '7751271055555', 'Detergente Bolívar 500 g', 'limpieza', 5.2, 6.5, 10, '🧼'),
  p('p13', '2000000000011', 'Cebolla roja', 'verduras', 2.0, 3.0, 18, '🧅', 'kilo', 3),
  p('p14', '2000000000028', 'Tomate', 'verduras', 2.5, 3.5, 2, '🍅', 'kilo', 3),
];

export const configInicial: ConfigNegocio = {
  nombre: 'Minimarket El Buen Sabor',
  ruc: '10456789012',
  telefono: '987654321',
  direccion: 'Jr. Amazonas 450, Chachapoyas',
  mensajeTicket: '¡Gracias por su compra, vuelva pronto!',
  moneda: 'S/',
  efectivo: true,
  tarjeta: true,
  fiado: true,
  yape: { activo: true, numero: '987654321', titular: 'Luis R.' },
  plin: { activo: true, numero: '987654321', titular: 'Luis R.' },
};
