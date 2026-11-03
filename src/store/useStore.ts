import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { categoriasIniciales, configInicial, productosIniciales } from '@/data/seed';
import {
  Categoria,
  ClienteFiado,
  ConfigNegocio,
  ItemCarrito,
  MetodoPago,
  Producto,
  Venta,
} from '@/infrastructure/interfaces';
import { codigoTicket, uid } from '@/utils/format';

export interface DatosCobro {
  metodo: MetodoPago;
  descuento: number;
  notas: string;
  montoRecibido?: number;
  clienteId?: string;
  clienteNuevo?: string;
}

interface Estado {
  productos: Producto[];
  categorias: Categoria[];
  carrito: ItemCarrito[];
  ventas: Venta[];
  clientes: ClienteFiado[];
  config: ConfigNegocio;

  // Carrito
  agregarAlCarrito: (productoId: string, cantidad?: number) => void;
  cambiarCantidad: (productoId: string, cantidad: number) => void;
  vaciarCarrito: () => void;

  // Productos
  guardarProducto: (producto: Producto) => void;
  eliminarProducto: (id: string) => void;
  ajustarStock: (id: string, delta: number) => void;

  // Ventas
  confirmarVenta: (datos: DatosCobro) => Venta | null;

  // Fiados
  registrarAbono: (clienteId: string, monto: number) => void;

  // Configuración
  guardarConfig: (config: ConfigNegocio) => void;
  agregarCategoria: (nombre: string) => void;
  eliminarCategoria: (id: string) => void;
  restablecerDatos: () => void;
}

const redondear = (n: number) => Math.round(n * 100) / 100;

export const saldoCliente = (cliente: ClienteFiado) =>
  redondear(
    cliente.movimientos.reduce((acc, m) => acc + (m.tipo === 'cargo' ? m.monto : -m.monto), 0),
  );

export const totalCarrito = (carrito: ItemCarrito[], productos: Producto[]) =>
  redondear(
    carrito.reduce((acc, item) => {
      const producto = productos.find((p) => p.id === item.productoId);
      return acc + (producto ? producto.precioVenta * item.cantidad : 0);
    }, 0),
  );

const estadoInicial = () => ({
  productos: productosIniciales,
  categorias: categoriasIniciales,
  carrito: [] as ItemCarrito[],
  ventas: [] as Venta[],
  clientes: [] as ClienteFiado[],
  config: configInicial,
});

export const useStore = create<Estado>()(
  persist(
    (set, get) => ({
      ...estadoInicial(),

      agregarAlCarrito: (productoId, cantidad = 1) =>
        set((s) => {
          const existe = s.carrito.find((i) => i.productoId === productoId);
          if (existe) {
            return {
              carrito: s.carrito.map((i) =>
                i.productoId === productoId ? { ...i, cantidad: i.cantidad + cantidad } : i,
              ),
            };
          }
          return { carrito: [...s.carrito, { productoId, cantidad }] };
        }),

      cambiarCantidad: (productoId, cantidad) =>
        set((s) => ({
          carrito:
            cantidad <= 0
              ? s.carrito.filter((i) => i.productoId !== productoId)
              : s.carrito.map((i) => (i.productoId === productoId ? { ...i, cantidad } : i)),
        })),

      vaciarCarrito: () => set({ carrito: [] }),

      guardarProducto: (producto) =>
        set((s) => {
          const existe = s.productos.some((p) => p.id === producto.id);
          return {
            productos: existe
              ? s.productos.map((p) => (p.id === producto.id ? producto : p))
              : [producto, ...s.productos],
          };
        }),

      eliminarProducto: (id) =>
        set((s) => ({
          productos: s.productos.filter((p) => p.id !== id),
          carrito: s.carrito.filter((i) => i.productoId !== id),
        })),

      ajustarStock: (id, delta) =>
        set((s) => ({
          productos: s.productos.map((p) =>
            p.id === id ? { ...p, stock: Math.max(0, redondear(p.stock + delta)) } : p,
          ),
        })),

      confirmarVenta: (datos) => {
        const { carrito, productos, clientes } = get();
        if (carrito.length === 0) return null;

        const items = carrito
          .map((item) => {
            const producto = productos.find((p) => p.id === item.productoId);
            if (!producto) return null;
            return {
              productoId: producto.id,
              nombre: producto.nombre,
              precio: producto.precioVenta,
              cantidad: item.cantidad,
              unidad: producto.unidad,
            };
          })
          .filter((i): i is NonNullable<typeof i> => i !== null);

        const subtotal = redondear(items.reduce((acc, i) => acc + i.precio * i.cantidad, 0));
        const descuento = Math.min(redondear(datos.descuento), subtotal);
        const total = redondear(subtotal - descuento);
        const fecha = new Date().toISOString();
        const ventaId = uid();

        let clienteId = datos.clienteId;
        let nuevosClientes = clientes;
        if (datos.metodo === 'fiado') {
          if (!clienteId && datos.clienteNuevo) {
            clienteId = uid();
            nuevosClientes = [
              ...clientes,
              { id: clienteId, nombre: datos.clienteNuevo.trim(), telefono: '', movimientos: [] },
            ];
          }
          nuevosClientes = nuevosClientes.map((c) =>
            c.id === clienteId
              ? {
                  ...c,
                  movimientos: [
                    ...c.movimientos,
                    { id: uid(), fecha, tipo: 'cargo' as const, monto: total, ventaId },
                  ],
                }
              : c,
          );
        }

        const venta: Venta = {
          id: ventaId,
          codigo: codigoTicket(),
          fecha,
          items,
          subtotal,
          descuento,
          total,
          metodo: datos.metodo,
          notas: datos.notas.trim(),
          clienteId: datos.metodo === 'fiado' ? clienteId : undefined,
          montoRecibido: datos.metodo === 'efectivo' ? datos.montoRecibido : undefined,
          vuelto:
            datos.metodo === 'efectivo' && datos.montoRecibido !== undefined
              ? redondear(datos.montoRecibido - total)
              : undefined,
        };

        set((s) => ({
          ventas: [venta, ...s.ventas],
          clientes: nuevosClientes,
          carrito: [],
          productos: s.productos.map((p) => {
            const item = items.find((i) => i.productoId === p.id);
            return item ? { ...p, stock: Math.max(0, redondear(p.stock - item.cantidad)) } : p;
          }),
        }));
        return venta;
      },

      registrarAbono: (clienteId, monto) =>
        set((s) => ({
          clientes: s.clientes.map((c) =>
            c.id === clienteId
              ? {
                  ...c,
                  movimientos: [
                    ...c.movimientos,
                    { id: uid(), fecha: new Date().toISOString(), tipo: 'abono', monto: redondear(monto) },
                  ],
                }
              : c,
          ),
        })),

      guardarConfig: (config) => set({ config }),

      agregarCategoria: (nombre) =>
        set((s) => ({ categorias: [...s.categorias, { id: uid(), nombre: nombre.trim() }] })),

      eliminarCategoria: (id) =>
        set((s) => ({
          categorias: s.categorias.filter((c) => c.id !== id),
          productos: s.productos.map((p) => (p.categoriaId === id ? { ...p, categoriaId: '' } : p)),
        })),

      restablecerDatos: () => set(estadoInicial()),
    }),
    {
      name: 'vendeya-store',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
