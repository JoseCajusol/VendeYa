import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type {
  Categoria,
  Configuracion,
  Movimiento,
  NuevaVenta,
  Periodo,
  Producto,
  ProductoInput,
  ReporteInventario,
  ReporteVentas,
  ResumenInventario,
  Venta,
} from '@/types';

/** Carpeta de XAMPP (htdocs) donde vive el backend: C:\xampp\htdocs\vendeya */
export const RUTA_BACKEND = '/vendeya/api';

/**
 * URL por defecto del Apache de XAMPP:
 *  - En el navegador (versión web): el mismo equipo que abre la página (localhost).
 *  - En el celular con Expo Go: la IP de la PC donde corre `npx expo start` (Expo Go ya la conoce).
 */
export function urlPorDefecto(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `http://${window.location.hostname}${RUTA_BACKEND}`;
  }
  const hostUri = Constants.expoConfig?.hostUri ?? '';
  const host = hostUri.split(':')[0];
  return `http://${host || 'localhost'}${RUTA_BACKEND}`;
}

let baseUrl = urlPorDefecto();

export function setBaseUrl(url: string) {
  baseUrl = url.trim().replace(/\/+$/, '');
}

export function getBaseUrl() {
  return baseUrl;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface Opciones {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Query;
  body?: unknown;
  form?: FormData;
  timeoutMs?: number;
}

async function request<T>(archivo: string, { method = 'GET', query, body, form, timeoutMs = 15000 }: Opciones = {}): Promise<T> {
  const params = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const url = `${baseUrl}/${archivo}${params ? `?${params}` : ''}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: form ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(
      `No se pudo conectar con el servidor (${baseUrl}). Verifica que Apache y MySQL estén encendidos en XAMPP y que el celular esté en la misma red Wi-Fi que la PC.`,
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  let json: { ok: boolean; data?: T; error?: string };
  try {
    json = await res.json();
  } catch {
    throw new ApiError(
      `El servidor respondió algo que no es JSON (código ${res.status}). Revisa que la URL apunte a la carpeta "api" del backend.`,
      res.status,
    );
  }
  if (!res.ok || !json.ok) {
    throw new ApiError(json.error ?? `Error ${res.status}`, res.status);
  }
  return json.data as T;
}

export const api = {
  // Configuración
  obtenerConfig: () => request<Configuracion>('configuracion.php'),
  guardarConfig: (datos: Partial<Configuracion>) => request<Configuracion>('configuracion.php', { method: 'PUT', body: datos }),
  subirQrYape: (uri: string, mimeType = 'image/jpeg') => {
    const form = new FormData();
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    // React Native acepta { uri, name, type } como archivo dentro de FormData
    form.append('qr', { uri, name: `qr.${ext}`, type: mimeType } as unknown as Blob);
    return request<Configuracion>('configuracion.php', { method: 'POST', form, timeoutMs: 30000 });
  },
  quitarQrYape: () => request<Configuracion>('configuracion.php', { method: 'DELETE' }),

  // Categorías
  categorias: () => request<Categoria[]>('categorias.php'),
  crearCategoria: (nombre: string) => request<Categoria>('categorias.php', { method: 'POST', body: { nombre } }),
  eliminarCategoria: (id: number) => request<{ id: number }>('categorias.php', { method: 'DELETE', query: { id } }),

  // Productos
  productos: (query?: { q?: string; categoria_id?: number; stock_bajo?: boolean }) =>
    request<Producto[]>('productos.php', { query }),
  producto: (id: number) => request<Producto>('productos.php', { query: { id } }),
  productoPorCodigo: (codigo: string) => request<Producto>('productos.php', { query: { codigo } }),
  crearProducto: (datos: ProductoInput) => request<Producto>('productos.php', { method: 'POST', body: datos }),
  actualizarProducto: (id: number, datos: ProductoInput) =>
    request<Producto>('productos.php', { method: 'PUT', query: { id }, body: datos }),
  eliminarProducto: (id: number) => request<{ id: number }>('productos.php', { method: 'DELETE', query: { id } }),

  // Inventario
  resumenInventario: () => request<ResumenInventario>('inventario.php'),
  movimientos: (query: { producto_id?: number; desde?: string; hasta?: string }) =>
    request<Movimiento[]>('inventario.php', { query: { movimientos: 1, ...query } }),
  registrarMovimiento: (datos: {
    producto_id: number;
    tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
    cantidad: number;
    motivo?: string;
    precio_compra?: number;
  }) => request<Producto>('inventario.php', { method: 'POST', body: datos }),

  // Ventas
  ventas: (query?: { desde?: string; hasta?: string; metodo?: string; estado?: string }) =>
    request<Venta[]>('ventas.php', { query }),
  venta: (id: number) => request<Venta>('ventas.php', { query: { id } }),
  registrarVenta: (datos: NuevaVenta) => request<Venta>('ventas.php', { method: 'POST', body: datos }),
  anularVenta: (id: number, motivo?: string) =>
    request<Venta>('ventas.php', { method: 'POST', query: { id, accion: 'anular' }, body: { motivo } }),

  // Reportes
  reporteVentas: (periodo: Periodo, fecha: string) =>
    request<ReporteVentas>('reportes.php', { query: { tipo: 'ventas', periodo, fecha } }),
  reporteInventario: (periodo: Periodo, fecha: string) =>
    request<ReporteInventario>('reportes.php', { query: { tipo: 'inventario', periodo, fecha } }),
};

export function mensajeError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return 'Ocurrió un error inesperado.';
}
