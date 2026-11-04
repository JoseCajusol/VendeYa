import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { api, mensajeError, setBaseUrl, urlPorDefecto } from '@/services/api';
import type { Categoria, Configuracion, ItemCarrito, Producto } from '@/types';

const CLAVE_URL = 'vendeya.apiUrl';

interface AppState {
  iniciado: boolean;
  apiUrl: string;
  config: Configuracion | null;
  productos: Producto[];
  categorias: Categoria[];
  cargando: boolean;
  errorConexion: string | null;
  carrito: ItemCarrito[];
  /** Código leído por el escáner cuando se usa desde el formulario de producto. */
  codigoEscaneado: string | null;

  inicializar: () => Promise<void>;
  cambiarApiUrl: (url: string) => Promise<void>;
  cargarConfig: () => Promise<void>;
  cargarProductos: () => Promise<void>;
  cargarCategorias: () => Promise<void>;
  refrescarTodo: () => Promise<void>;
  /** Llamar después de cualquier cambio en el servidor para sincronizar todas las pantallas. */
  datosCambiaron: () => Promise<void>;
  setConfig: (config: Configuracion) => void;

  agregarAlCarrito: (producto: Producto, cantidad?: number) => { ok: boolean; mensaje: string };
  cambiarCantidad: (productoId: number, cantidad: number) => { ok: boolean; mensaje?: string };
  quitarDelCarrito: (productoId: number) => void;
  vaciarCarrito: () => void;

  setCodigoEscaneado: (codigo: string | null) => void;
}

/** Actualiza precio/stock/nombre del carrito con los datos más recientes del servidor. */
function sincronizarCarrito(carrito: ItemCarrito[], productos: Producto[]): ItemCarrito[] {
  const porId = new Map(productos.map((p) => [p.id, p]));
  return carrito
    .filter((i) => porId.has(i.producto_id))
    .map((i) => {
      const p = porId.get(i.producto_id)!;
      return { ...i, nombre: p.nombre, precio: p.precio_venta, stock: p.stock, codigo_barras: p.codigo_barras };
    });
}

export const useAppStore = create<AppState>()((set, get) => ({
  iniciado: false,
  apiUrl: urlPorDefecto(),
  config: null,
  productos: [],
  categorias: [],
  cargando: false,
  errorConexion: null,
  carrito: [],
  codigoEscaneado: null,

  inicializar: async () => {
    try {
      const guardada = await AsyncStorage.getItem(CLAVE_URL);
      if (guardada) {
        setBaseUrl(guardada);
        set({ apiUrl: guardada });
      } else {
        setBaseUrl(get().apiUrl);
      }
    } catch {
      setBaseUrl(get().apiUrl);
    }
    set({ iniciado: true });
    await get().refrescarTodo();
  },

  cambiarApiUrl: async (url) => {
    const limpia = url.trim().replace(/\/+$/, '');
    setBaseUrl(limpia);
    set({ apiUrl: limpia });
    try {
      await AsyncStorage.setItem(CLAVE_URL, limpia);
    } catch {
      // si falla el guardado, igual queda activa en esta sesión
    }
    await get().refrescarTodo();
  },

  cargarConfig: async () => {
    const config = await api.obtenerConfig();
    set({ config });
  },

  cargarProductos: async () => {
    const productos = await api.productos();
    set((s) => ({ productos, carrito: sincronizarCarrito(s.carrito, productos) }));
  },

  cargarCategorias: async () => {
    const categorias = await api.categorias();
    set({ categorias });
  },

  refrescarTodo: async () => {
    set({ cargando: true });
    try {
      await Promise.all([get().cargarConfig(), get().cargarProductos(), get().cargarCategorias()]);
      set({ errorConexion: null });
    } catch (e) {
      set({ errorConexion: mensajeError(e) });
    } finally {
      set({ cargando: false });
    }
  },

  datosCambiaron: async () => {
    try {
      await Promise.all([get().cargarProductos(), get().cargarCategorias()]);
      set({ errorConexion: null });
    } catch (e) {
      set({ errorConexion: mensajeError(e) });
    }
  },

  setConfig: (config) => set({ config }),

  agregarAlCarrito: (producto, cantidad = 1) => {
    const carrito = get().carrito;
    const existente = carrito.find((i) => i.producto_id === producto.id);
    const enCarrito = existente?.cantidad ?? 0;
    if (producto.stock <= 0) {
      return { ok: false, mensaje: `"${producto.nombre}" está agotado. Registra una entrada en Inventario.` };
    }
    if (enCarrito + cantidad > producto.stock) {
      return {
        ok: false,
        mensaje: `Solo hay ${producto.stock} unidades de "${producto.nombre}"${enCarrito ? ` y ya tienes ${enCarrito} en el carrito` : ''}.`,
      };
    }
    if (existente) {
      set({
        carrito: carrito.map((i) => (i.producto_id === producto.id ? { ...i, cantidad: i.cantidad + cantidad } : i)),
      });
    } else {
      set({
        carrito: [
          ...carrito,
          {
            producto_id: producto.id,
            nombre: producto.nombre,
            codigo_barras: producto.codigo_barras,
            precio: producto.precio_venta,
            cantidad,
            stock: producto.stock,
          },
        ],
      });
    }
    return { ok: true, mensaje: `${cantidad} × ${producto.nombre} agregado al carrito` };
  },

  cambiarCantidad: (productoId, cantidad) => {
    const item = get().carrito.find((i) => i.producto_id === productoId);
    if (!item) return { ok: false };
    if (cantidad < 1) return { ok: false, mensaje: 'La cantidad mínima es 1. Usa el botón de quitar para eliminarlo.' };
    if (cantidad > item.stock) {
      set({ carrito: get().carrito.map((i) => (i.producto_id === productoId ? { ...i, cantidad: item.stock } : i)) });
      return { ok: false, mensaje: `Solo hay ${item.stock} unidades disponibles de "${item.nombre}".` };
    }
    set({ carrito: get().carrito.map((i) => (i.producto_id === productoId ? { ...i, cantidad } : i)) });
    return { ok: true };
  },

  quitarDelCarrito: (productoId) => set({ carrito: get().carrito.filter((i) => i.producto_id !== productoId) }),
  vaciarCarrito: () => set({ carrito: [] }),

  setCodigoEscaneado: (codigo) => set({ codigoEscaneado: codigo }),
}));

/** Umbral de stock bajo configurado (5 por defecto). */
export function useUmbral() {
  return useAppStore((s) => s.config?.umbral_stock ?? 5);
}

export function totalCarrito(carrito: ItemCarrito[]) {
  return Math.round(carrito.reduce((t, i) => t + i.precio * i.cantidad, 0) * 100) / 100;
}
