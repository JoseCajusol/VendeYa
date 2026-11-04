import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AlertaStock } from '@/components/AlertaStock';
import { Buscador, Chip, ErrorConexion, EstadoVacio, InsigniaStock, Kpi } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { useAppStore, useUmbral } from '@/store/useAppStore';
import { moneda } from '@/utils/format';

type Filtro = 'todos' | 'bajo' | 'agotado';

export default function InventarioScreen() {
  const params = useLocalSearchParams<{ filtro?: Filtro }>();
  const productos = useAppStore((s) => s.productos);
  const cargando = useAppStore((s) => s.cargando);
  const errorConexion = useAppStore((s) => s.errorConexion);
  const refrescarTodo = useAppStore((s) => s.refrescarTodo);
  const umbral = useUmbral();
  const [filtro, setFiltro] = useState<Filtro>(params.filtro ?? 'todos');
  const [busqueda, setBusqueda] = useState('');

  // Si llegan aquí desde la alerta de stock bajo, aplicar ese filtro
  const [filtroParam, setFiltroParam] = useState(params.filtro);
  if (params.filtro !== filtroParam) {
    setFiltroParam(params.filtro);
    if (params.filtro) setFiltro(params.filtro);
  }

  // El resumen se calcula con la misma lista de productos que usan las demás pantallas,
  // así siempre está sincronizado después de cada venta o movimiento.
  const resumen = useMemo(
    () => ({
      unidades: productos.reduce((t, p) => t + p.stock, 0),
      costo: productos.reduce((t, p) => t + p.stock * p.precio_compra, 0),
      venta: productos.reduce((t, p) => t + p.stock * p.precio_venta, 0),
      bajo: productos.filter((p) => p.stock <= umbral).length,
      agotados: productos.filter((p) => p.stock === 0).length,
    }),
    [productos, umbral],
  );

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos
      .filter((p) => (filtro === 'bajo' ? p.stock <= umbral : filtro === 'agotado' ? p.stock === 0 : true))
      .filter((p) => !q || p.nombre.toLowerCase().includes(q) || (p.codigo_barras ?? '').includes(q))
      .sort((a, b) => (filtro === 'todos' ? a.nombre.localeCompare(b.nombre) : a.stock - b.stock));
  }, [productos, filtro, busqueda, umbral]);

  const cabecera = (
    <View style={{ gap: spacing.md, marginBottom: spacing.sm }}>
      <View style={styles.kpis}>
        <Kpi titulo="Valor a costo" valor={moneda(resumen.costo)} icono="wallet-outline" />
        <Kpi titulo="Valor a precio de venta" valor={moneda(resumen.venta)} icono="trending-up-outline" color={colors.success} />
        <Kpi titulo="Unidades en stock" valor={String(resumen.unidades)} icono="cube-outline" color={colors.yape} />
        <Kpi titulo={`Stock bajo (≤ ${umbral})`} valor={`${resumen.bajo} · ${resumen.agotados} agotados`} icono="warning-outline" color={colors.warning} />
      </View>
      <AlertaStock irAInventario={false} />
      <Buscador value={busqueda} onChangeText={setBusqueda} placeholder="Buscar en inventario..." />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Chip texto="Todos" activo={filtro === 'todos'} onPress={() => setFiltro('todos')} />
        <Chip texto={`Stock bajo (${resumen.bajo})`} icono="warning-outline" activo={filtro === 'bajo'} onPress={() => setFiltro('bajo')} />
        <Chip texto={`Agotados (${resumen.agotados})`} activo={filtro === 'agotado'} onPress={() => setFiltro('agotado')} />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {errorConexion && <ErrorConexion mensaje={errorConexion} onReintentar={refrescarTodo} />}
      <FlatList
        data={lista}
        keyExtractor={(p) => String(p.id)}
        ListHeaderComponent={cabecera}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={refrescarTodo} colors={[colors.primary]} />}
        renderItem={({ item: p }) => {
          const bajo = p.stock <= umbral;
          return (
            <Pressable
              style={[styles.item, bajo && { borderColor: p.stock === 0 ? colors.danger : '#FDE68A' }]}
              onPress={() => router.push({ pathname: '/movimiento/[id]', params: { id: String(p.id) } })}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.nombre} numberOfLines={1}>
                  {p.nombre}
                </Text>
                <Text style={styles.detalle}>
                  Costo {moneda(p.precio_compra)} · Venta {moneda(p.precio_venta)}
                </Text>
                <InsigniaStock stock={p.stock} umbral={umbral} />
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.stock, { color: p.stock === 0 ? colors.danger : bajo ? colors.warning : colors.text }]}>{p.stock}</Text>
                <Text style={styles.detalle}>{p.unidad}</Text>
              </View>
              <View style={styles.botonMas}>
                <Ionicons name="add" size={22} color={colors.primary} />
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EstadoVacio
            icono={filtro === 'todos' ? 'cube-outline' : 'checkmark-done-circle-outline'}
            titulo={filtro === 'todos' ? 'No hay productos en el inventario' : '¡Todo en orden!'}
            mensaje={filtro === 'todos' ? 'Registra productos en la pestaña Productos.' : 'No hay productos en este filtro.'}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nombre: { fontSize: 15, fontWeight: '700', color: colors.text },
  detalle: { fontSize: 12, color: colors.textMuted },
  stock: { fontSize: 24, fontWeight: '900' },
  botonMas: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
