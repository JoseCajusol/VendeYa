import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Buscador, Chip, ErrorConexion, EstadoVacio, InsigniaStock } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { useAppStore, useUmbral } from '@/store/useAppStore';
import { moneda } from '@/utils/format';

export default function ProductosScreen() {
  const productos = useAppStore((s) => s.productos);
  const categorias = useAppStore((s) => s.categorias);
  const cargando = useAppStore((s) => s.cargando);
  const errorConexion = useAppStore((s) => s.errorConexion);
  const refrescarTodo = useAppStore((s) => s.refrescarTodo);
  const umbral = useUmbral();
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState<number | null>(null);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter(
      (p) =>
        (categoria === null || p.categoria_id === categoria) &&
        (!q || p.nombre.toLowerCase().includes(q) || (p.codigo_barras ?? '').includes(q)),
    );
  }, [productos, busqueda, categoria]);

  return (
    <View style={{ flex: 1 }}>
      {errorConexion && <ErrorConexion mensaje={errorConexion} onReintentar={refrescarTodo} />}
      <View style={{ padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm }}>
        <Buscador value={busqueda} onChangeText={setBusqueda} placeholder="Buscar producto o código..." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          <Chip texto={`Todos (${productos.length})`} activo={categoria === null} onPress={() => setCategoria(null)} />
          {categorias.map((c) => (
            <Chip key={c.id} texto={`${c.nombre} (${c.productos})`} activo={categoria === c.id} onPress={() => setCategoria(c.id)} />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtrados}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 96, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={refrescarTodo} colors={[colors.primary]} />}
        renderItem={({ item: p }) => (
          <Pressable style={styles.item} onPress={() => router.push({ pathname: '/producto/[id]', params: { id: String(p.id) } })}>
            {p.imagen_url ? <Image source={{ uri: p.imagen_url }} style={styles.avatar} /> : <View style={styles.avatar}><Text style={styles.avatarTexto}>{p.nombre.charAt(0).toUpperCase()}</Text></View>}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.nombre} numberOfLines={1}>
                {p.nombre}
              </Text>
              <Text style={styles.detalle} numberOfLines={1}>
                {p.codigo_barras ?? 'Sin código'} · {p.categoria ?? 'Sin categoría'}
              </Text>
              <InsigniaStock stock={p.stock} umbral={umbral} />
            </View>
            <Text style={styles.precio}>{moneda(p.precio_venta)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          !cargando ? (
            <EstadoVacio
              icono="pricetags-outline"
              titulo={productos.length === 0 ? 'Aún no tienes productos' : 'Sin resultados'}
              mensaje={productos.length === 0 ? 'Toca el botón + para registrar tu primer producto.' : 'Prueba con otra búsqueda o categoría.'}
            />
          ) : undefined
        }
      />

      <Pressable style={styles.fab} onPress={() => router.push({ pathname: '/producto/[id]', params: { id: 'nuevo' } })}>
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
  avatar: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontSize: 18, fontWeight: '800', color: colors.primary },
  nombre: { fontSize: 15, fontWeight: '700', color: colors.text },
  detalle: { fontSize: 12, color: colors.textMuted },
  precio: { fontSize: 16, fontWeight: '800', color: colors.primary },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
});
