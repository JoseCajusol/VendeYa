import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip, EmptyState, ScreenHeader } from '@/components/ui';
import { totalCarrito, useStore } from '@/store/useStore';
import { colors, radius } from '@/constants/colors';
import { dinero } from '@/utils/format';

export default function CatalogoScreen() {
  const { productos, categorias, carrito, config, agregarAlCarrito } = useStore();
  const [categoria, setCategoria] = useState('todas');
  const [busqueda, setBusqueda] = useState('');

  const lista = useMemo(
    () =>
      productos.filter(
        (p) =>
          (categoria === 'todas' || p.categoriaId === categoria) &&
          p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
      ),
    [productos, categoria, busqueda],
  );

  const cantidadEnCarrito = (id: string) => carrito.find((i) => i.productoId === id)?.cantidad ?? 0;
  const total = totalCarrito(carrito, productos);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Catálogo" icon="grid-outline" />

      <View style={styles.filters}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar producto..."
            placeholderTextColor="#9AA6A2"
            style={styles.searchInput}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label={`Todas (${productos.length})`} active={categoria === 'todas'} onPress={() => setCategoria('todas')} />
          {categorias.map((c) => (
            <Chip
              key={c.id}
              label={`${c.nombre} (${productos.filter((p) => p.categoriaId === c.id).length})`}
              active={categoria === c.id}
              onPress={() => setCategoria(c.id)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={lista}
        keyExtractor={(p) => p.id}
        numColumns={3}
        contentContainerStyle={{ padding: 12, paddingBottom: 90 }}
        columnWrapperStyle={{ gap: 10 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <EmptyState icon="search-outline" title="Sin resultados" text="No hay productos que coincidan con la búsqueda." />
        }
        renderItem={({ item }) => {
          const enCarrito = cantidadEnCarrito(item.id);
          const agotado = item.stock <= 0;
          return (
            <Pressable
              onPress={() => agregarAlCarrito(item.id, item.unidad === 'kilo' ? 0.25 : 1)}
              style={({ pressed }) => [styles.card, enCarrito > 0 && styles.cardActive, pressed && { opacity: 0.7 }]}
            >
              {enCarrito > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{enCarrito}</Text>
                </View>
              )}
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text style={styles.name} numberOfLines={2}>
                {item.nombre}
              </Text>
              <Text style={styles.price}>
                {dinero(item.precioVenta, config.moneda)}
                {item.unidad === 'kilo' ? '/kg' : ''}
              </Text>
              <Text style={[styles.stock, agotado && { color: colors.danger }]}>
                {agotado ? 'Agotado' : `Stock: ${item.stock}`}
              </Text>
            </Pressable>
          );
        }}
      />

      {carrito.length > 0 && (
        <Pressable style={styles.floating} onPress={() => router.navigate('/')}>
          <Ionicons name="cart" size={20} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.floatingSmall}>{carrito.length} productos</Text>
            <Text style={styles.floatingTotal}>{dinero(total, config.moneda)}</Text>
          </View>
          <Text style={styles.floatingAction}>Ver carrito</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { padding: 12, gap: 10, backgroundColor: colors.surface },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: colors.text },
  card: {
    flex: 1 / 3,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cardActive: { borderColor: colors.accent },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  emoji: { fontSize: 34, marginVertical: 6 },
  name: { fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center', minHeight: 32 },
  price: { fontSize: 13, fontWeight: '800', color: colors.primary, marginTop: 4 },
  stock: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  floating: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: 14,
  },
  floatingSmall: { color: '#CFE3DC', fontSize: 11 },
  floatingTotal: { color: '#fff', fontSize: 16, fontWeight: '800' },
  floatingAction: { color: '#fff', fontWeight: '700' },
});
