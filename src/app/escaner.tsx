import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult, type BarcodeType } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton, InsigniaStock, Stepper } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { ApiError, api, mensajeError } from '@/services/api';
import { totalCarrito, useAppStore, useUmbral } from '@/store/useAppStore';
import type { Producto } from '@/types';
import { moneda } from '@/utils/format';

const TIPOS: BarcodeType[] = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'itf14', 'codabar'];

type Lectura =
  | { estado: 'buscando'; codigo: string }
  | { estado: 'encontrado'; codigo: string; producto: Producto }
  | { estado: 'no_encontrado'; codigo: string }
  | { estado: 'error'; codigo: string; mensaje: string };

/**
 * Escáner de códigos de barras con la cámara.
 *  - modo "venta":  busca el producto y permite elegir la cantidad antes de agregarlo al carrito.
 *  - modo "codigo": devuelve el código leído al formulario de producto.
 */
export default function EscanerScreen() {
  const { modo = 'venta' } = useLocalSearchParams<{ modo?: 'venta' | 'codigo' }>();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [linterna, setLinterna] = useState(false);
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null);
  const bloqueado = useRef(false);

  const productos = useAppStore((s) => s.productos);
  const carrito = useAppStore((s) => s.carrito);
  const agregarAlCarrito = useAppStore((s) => s.agregarAlCarrito);
  const setCodigoEscaneado = useAppStore((s) => s.setCodigoEscaneado);
  const cargarProductos = useAppStore((s) => s.cargarProductos);
  const umbral = useUmbral();

  const mostrarAviso = (texto: string, ok: boolean) => {
    setAviso({ texto, ok });
    setTimeout(() => setAviso(null), 2200);
  };

  const reanudar = () => {
    setLectura(null);
    setCantidad(1);
    // pequeña pausa para que no vuelva a leer el mismo código al instante
    setTimeout(() => {
      bloqueado.current = false;
    }, 700);
  };

  const alLeer = async ({ data }: BarcodeScanningResult) => {
    if (bloqueado.current || !data) return;
    bloqueado.current = true;
    const codigo = data.trim();
    Vibration.vibrate(80);

    if (modo === 'codigo') {
      setCodigoEscaneado(codigo);
      router.back();
      return;
    }

    const local = productos.find((p) => p.codigo_barras === codigo);
    if (local) {
      setLectura({ estado: 'encontrado', codigo, producto: local });
      return;
    }
    setLectura({ estado: 'buscando', codigo });
    try {
      const producto = await api.productoPorCodigo(codigo);
      setLectura({ estado: 'encontrado', codigo, producto });
      cargarProductos().catch(() => {});
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setLectura({ estado: 'no_encontrado', codigo });
      else setLectura({ estado: 'error', codigo, mensaje: mensajeError(e) });
    }
  };

  const agregar = (producto: Producto) => {
    const r = agregarAlCarrito(producto, cantidad);
    mostrarAviso(r.mensaje, r.ok);
    if (r.ok) reanudar();
  };

  if (!permiso) {
    return (
      <View style={[styles.centro, { backgroundColor: '#000' }]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!permiso.granted) {
    return (
      <SafeAreaView style={[styles.centro, { backgroundColor: colors.background, padding: spacing.xl }]}>
        <Ionicons name="camera-outline" size={64} color={colors.primary} />
        <Text style={styles.permisoTitulo}>Necesitamos usar tu cámara</Text>
        <Text style={styles.permisoTexto}>VendeYa usa la cámara como lector de códigos de barras para agregar productos rápidamente.</Text>
        <Boton titulo="Permitir cámara" icono="checkmark" onPress={pedirPermiso} estilo={{ alignSelf: 'stretch', marginTop: spacing.lg }} />
        <Boton titulo="Volver" variante="fantasma" onPress={() => router.back()} estilo={{ alignSelf: 'stretch' }} />
      </SafeAreaView>
    );
  }

  const enCarrito = lectura?.estado === 'encontrado' ? (carrito.find((i) => i.producto_id === lectura.producto.id)?.cantidad ?? 0) : 0;
  const disponible = lectura?.estado === 'encontrado' ? Math.max(0, lectura.producto.stock - enCarrito) : 0;
  const unidades = carrito.reduce((t, i) => t + i.cantidad, 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={linterna}
        barcodeScannerSettings={{ barcodeTypes: TIPOS }}
        onBarcodeScanned={lectura ? undefined : alLeer}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.barraSuperior}>
          <Pressable style={styles.botonRedondo} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.tituloSuperior}>{modo === 'codigo' ? 'Leer código del producto' : 'Escanear para vender'}</Text>
          <Pressable style={styles.botonRedondo} onPress={() => setLinterna((v) => !v)} hitSlop={8}>
            <Ionicons name={linterna ? 'flash' : 'flash-off'} size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.centro}>
          <View style={styles.marco}>
            <View style={styles.linea} />
          </View>
          <Text style={styles.instruccion}>Apunta al código de barras del producto</Text>
        </View>

        {aviso && (
          <View style={[styles.aviso, { backgroundColor: aviso.ok ? colors.success : colors.danger }]}>
            <Ionicons name={aviso.ok ? 'checkmark-circle' : 'alert-circle'} size={20} color="#fff" />
            <Text style={styles.avisoTexto}>{aviso.texto}</Text>
          </View>
        )}

        {modo === 'venta' && !lectura && (
          <View style={styles.pie}>
            <Text style={{ color: '#fff' }}>
              Carrito: {unidades} {unidades === 1 ? 'unidad' : 'unidades'} · {moneda(totalCarrito(carrito))}
            </Text>
            <Boton titulo="Ver carrito" icono="cart" compacto onPress={() => router.back()} />
          </View>
        )}

        {lectura && (
          <View style={styles.hoja}>
            {lectura.estado === 'buscando' && (
              <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.lg }}>
                <ActivityIndicator color={colors.primary} />
                <Text>Buscando {lectura.codigo}...</Text>
              </View>
            )}

            {lectura.estado === 'encontrado' && (
              <>
                <Text style={styles.codigo}>{lectura.codigo}</Text>
                <Text style={styles.nombre}>{lectura.producto.nombre}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 4 }}>
                  <Text style={styles.precio}>{moneda(lectura.producto.precio_venta)}</Text>
                  <InsigniaStock stock={lectura.producto.stock} umbral={umbral} />
                </View>
                {enCarrito > 0 && <Text style={styles.nota}>Ya tienes {enCarrito} en el carrito.</Text>}

                {disponible > 0 ? (
                  <>
                    <View style={styles.filaCantidad}>
                      <Text style={styles.etiqueta}>Cantidad</Text>
                      <Stepper valor={cantidad} onCambiar={(n) => setCantidad(Math.min(Math.max(1, n), disponible))} max={disponible} />
                      <Text style={styles.subtotal}>{moneda(lectura.producto.precio_venta * cantidad)}</Text>
                    </View>
                    <View style={styles.filaBotones}>
                      <Boton titulo="Cancelar" variante="secundario" onPress={reanudar} estilo={{ flex: 1 }} />
                      <Boton titulo="Agregar" icono="cart" onPress={() => agregar(lectura.producto)} estilo={{ flex: 2 }} />
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={[styles.nota, { color: colors.danger }]}>
                      {lectura.producto.stock === 0
                        ? 'Este producto está agotado. Registra una entrada en Inventario.'
                        : 'Ya agregaste todo el stock disponible de este producto.'}
                    </Text>
                    <Boton titulo="Escanear otro" icono="scan" onPress={reanudar} estilo={{ marginTop: spacing.md }} />
                  </>
                )}
              </>
            )}

            {lectura.estado === 'no_encontrado' && (
              <>
                <Text style={styles.codigo}>{lectura.codigo}</Text>
                <Text style={styles.nombre}>Producto no registrado</Text>
                <Text style={styles.nota}>Este código de barras aún no está en tu catálogo.</Text>
                <View style={styles.filaBotones}>
                  <Boton titulo="Escanear otro" variante="secundario" onPress={reanudar} estilo={{ flex: 1 }} />
                  <Boton
                    titulo="Registrarlo"
                    icono="add"
                    onPress={() => router.replace({ pathname: '/producto/[id]', params: { id: 'nuevo', codigo: lectura.codigo } })}
                    estilo={{ flex: 1 }}
                  />
                </View>
              </>
            )}

            {lectura.estado === 'error' && (
              <>
                <Text style={[styles.nombre, { color: colors.danger }]}>No se pudo buscar el producto</Text>
                <Text style={styles.nota}>{lectura.mensaje}</Text>
                <Boton titulo="Intentar de nuevo" icono="refresh" onPress={reanudar} estilo={{ marginTop: spacing.md }} />
              </>
            )}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const MARCO = 260;

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  permisoTitulo: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: spacing.lg, textAlign: 'center' },
  permisoTexto: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  barraSuperior: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  botonRedondo: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
  tituloSuperior: { color: '#fff', fontSize: 16, fontWeight: '700' },
  marco: {
    width: MARCO,
    height: MARCO * 0.6,
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: radius.lg,
    justifyContent: 'center',
  },
  linea: { height: 2, backgroundColor: colors.danger, marginHorizontal: spacing.md },
  instruccion: { color: '#fff', marginTop: spacing.lg, backgroundColor: colors.overlay, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  avisoTexto: { color: '#fff', fontWeight: '600', flex: 1 },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.overlay,
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  hoja: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    margin: spacing.md,
    padding: spacing.lg,
  },
  codigo: { fontSize: 12, color: colors.textMuted, fontFamily: 'monospace' },
  nombre: { fontSize: 19, fontWeight: '800', color: colors.text, marginTop: 2 },
  precio: { fontSize: 22, fontWeight: '900', color: colors.primary },
  nota: { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm },
  filaCantidad: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  etiqueta: { fontWeight: '700', color: colors.text },
  subtotal: { flex: 1, textAlign: 'right', fontSize: 17, fontWeight: '800', color: colors.text },
  filaBotones: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
});
