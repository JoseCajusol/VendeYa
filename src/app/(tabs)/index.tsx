import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AlertaStock } from '@/components/AlertaStock';
import { Boton, Buscador, ErrorConexion, EstadoVacio, InsigniaStock, Stepper } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { totalCarrito, useAppStore, useUmbral } from '@/store/useAppStore';
import type { ItemCarrito, Producto } from '@/types';
import { moneda } from '@/utils/format';

export default function VenderScreen() {
  const carrito = useAppStore((s) => s.carrito);
  const productos = useAppStore((s) => s.productos);
  const errorConexion = useAppStore((s) => s.errorConexion);
  const refrescarTodo = useAppStore((s) => s.refrescarTodo);
  const agregarAlCarrito = useAppStore((s) => s.agregarAlCarrito);
  const vaciarCarrito = useAppStore((s) => s.vaciarCarrito);
  const umbral = useUmbral();
  const [busqueda, setBusqueda] = useState('');

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return [];
    return productos
      .filter((p) => p.nombre.toLowerCase().includes(q) || (p.codigo_barras ?? '').includes(q))
      .slice(0, 6);
  }, [busqueda, productos]);

  const total = totalCarrito(carrito);
  const unidades = carrito.reduce((t, i) => t + i.cantidad, 0);

  const agregarManual = (p: Producto) => {
    const r = agregarAlCarrito(p, 1);
    if (!r.ok) Alert.alert('No se pudo agregar', r.mensaje);
    else setBusqueda('');
  };

  const confirmarVaciar = () =>
    Alert.alert('Vaciar carrito', '¿Quitar todos los productos del carrito?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Vaciar', style: 'destructive', onPress: vaciarCarrito },
    ]);

  const cabecera = (
    <View style={{ gap: spacing.md, padding: spacing.lg, paddingBottom: 0 }}>
      <Pressable style={styles.botonEscanear} onPress={() => router.push({ pathname: '/escaner', params: { modo: 'venta' } })}>
        <View style={styles.iconoEscanear}>
          <Ionicons name="barcode-outline" size={34} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.escanearTitulo}>Escanear producto</Text>
          <Text style={styles.escanearTexto}>Usa la cámara para leer el código de barras</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </Pressable>

      <Buscador value={busqueda} onChangeText={setBusqueda} placeholder="O busca por nombre o código..." />
      {resultados.length > 0 && (
        <View style={styles.resultados}>
          {resultados.map((p) => (
            <Pressable key={p.id} style={styles.resultado} onPress={() => agregarManual(p)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultadoNombre} numberOfLines={1}>
                  {p.nombre}
                </Text>
                <Text style={styles.resultadoPrecio}>{moneda(p.precio_venta)}</Text>
              </View>
              <InsigniaStock stock={p.stock} umbral={umbral} />
              <Ionicons name="add-circle" size={28} color={p.stock > 0 ? colors.primary : colors.border} />
            </Pressable>
          ))}
        </View>
      )}
      {busqueda.trim() !== '' && resultados.length === 0 && (
        <Text style={{ color: colors.textMuted }}>No se encontró &quot;{busqueda}&quot;.</Text>
      )}

      <AlertaStock />

      <View style={styles.filaCarrito}>
        <Text style={styles.tituloCarrito}>Carrito {unidades > 0 ? `(${unidades})` : ''}</Text>
        {carrito.length > 0 && (
          <Pressable onPress={confirmarVaciar} hitSlop={8}>
            <Text style={{ color: colors.danger, fontWeight: '600' }}>Vaciar</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {errorConexion && <ErrorConexion mensaje={errorConexion} onReintentar={refrescarTodo} />}
      <FlatList
        data={carrito}
        keyExtractor={(i) => String(i.producto_id)}
        ListHeaderComponent={cabecera}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        renderItem={({ item }) => <FilaCarrito item={item} />}
        ListEmptyComponent={
          <EstadoVacio
            icono="cart-outline"
            titulo="El carrito está vacío"
            mensaje="Escanea un producto o búscalo por su nombre para empezar la venta."
          />
        }
      />
      {carrito.length > 0 && (
        <View style={styles.pie}>
          <View>
            <Text style={styles.pieEtiqueta}>Total a cobrar</Text>
            <Text style={styles.pieTotal}>{moneda(total)}</Text>
          </View>
          <Boton titulo="Cobrar" icono="cash-outline" onPress={() => router.push('/cobrar')} estilo={{ flex: 1 }} />
        </View>
      )}
    </View>
  );
}

function FilaCarrito({ item }: { item: ItemCarrito }) {
  const cambiarCantidad = useAppStore((s) => s.cambiarCantidad);
  const quitarDelCarrito = useAppStore((s) => s.quitarDelCarrito);

  const cambiar = (n: number) => {
    const r = cambiarCantidad(item.producto_id, n);
    if (!r.ok && r.mensaje) Alert.alert('Cantidad', r.mensaje);
  };

  return (
    <View style={styles.item}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.itemNombre} numberOfLines={2}>
          {item.nombre}
        </Text>
        <Text style={styles.itemPrecio}>
          {moneda(item.precio)} c/u · disponibles {item.stock}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 6 }}>
          <Stepper valor={item.cantidad} onCambiar={cambiar} max={item.stock} />
          <Text style={styles.itemSubtotal}>{moneda(item.precio * item.cantidad)}</Text>
        </View>
      </View>
      <Pressable style={styles.quitar} onPress={() => quitarDelCarrito(item.producto_id)} hitSlop={8}>
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
        <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '600' }}>Quitar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  botonEscanear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  iconoEscanear: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  escanearTitulo: { color: '#fff', fontSize: 18, fontWeight: '800' },
  escanearTexto: { color: colors.primarySoft, fontSize: 13, marginTop: 2 },
  resultados: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginTop: -6 },
  resultado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultadoNombre: { fontWeight: '600', color: colors.text },
  resultadoPrecio: { color: colors.textMuted, fontSize: 13 },
  filaCarrito: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  tituloCarrito: { fontSize: 17, fontWeight: '800', color: colors.text },
  item: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemNombre: { fontSize: 15, fontWeight: '700', color: colors.text },
  itemPrecio: { fontSize: 12, color: colors.textMuted },
  itemSubtotal: { fontSize: 16, fontWeight: '800', color: colors.text },
  quitar: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs, gap: 2 },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pieEtiqueta: { fontSize: 12, color: colors.textMuted },
  pieTotal: { fontSize: 24, fontWeight: '900', color: colors.text },
});
