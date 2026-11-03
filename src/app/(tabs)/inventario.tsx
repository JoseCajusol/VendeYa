import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Chip, EmptyState, Field, ScreenHeader, Segmented, StatCard } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { colors, radius } from '@/constants/colors';
import { Producto } from '@/infrastructure/interfaces';
import { dinero, parseNumero } from '@/utils/format';

type Filtro = 'todos' | 'bajo' | 'agotado';

export default function InventarioScreen() {
  const { productos, categorias, config, ajustarStock } = useStore();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [ajustando, setAjustando] = useState<Producto | null>(null);

  const stockBajo = productos.filter((p) => p.stock > 0 && p.stock <= p.stockMinimo);
  const agotados = productos.filter((p) => p.stock <= 0);
  const valorTotal = productos.reduce((acc, p) => acc + p.precioCompra * p.stock, 0);

  const lista = useMemo(
    () =>
      productos
        .filter((p) => {
          if (filtro === 'bajo') return p.stock > 0 && p.stock <= p.stockMinimo;
          if (filtro === 'agotado') return p.stock <= 0;
          return true;
        })
        .filter(
          (p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo.includes(busqueda),
        ),
    [productos, filtro, busqueda],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Inventario" icon="cube-outline" />

      <FlatList
        data={lista}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 2 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <StatCard label="Productos" value={String(productos.length)} icon="cube-outline" />
              <StatCard label="Valor total" value={dinero(valorTotal, config.moneda)} icon="cash-outline" />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <StatCard label="Stock bajo" value={String(stockBajo.length)} icon="alert-circle-outline" color={colors.warning} />
              <StatCard label="Agotados" value={String(agotados.length)} icon="close-circle-outline" color={colors.danger} />
            </View>
            <Button
              label="Nuevo Producto"
              icon="add-circle-outline"
              onPress={() => router.push({ pathname: '/producto/[id]', params: { id: 'nuevo' } })}
            />
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Buscar por nombre o código..."
                placeholderTextColor="#9AA6A2"
                style={styles.searchInput}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip label={`Todos (${productos.length})`} active={filtro === 'todos'} onPress={() => setFiltro('todos')} />
              <Chip
                label={`Stock bajo (${stockBajo.length})`}
                active={filtro === 'bajo'}
                color={colors.warning}
                onPress={() => setFiltro('bajo')}
              />
              <Chip
                label={`Agotados (${agotados.length})`}
                active={filtro === 'agotado'}
                color={colors.danger}
                onPress={() => setFiltro('agotado')}
              />
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState icon="cube-outline" title="Sin productos" text="No hay productos en este filtro." />}
        renderItem={({ item }) => {
          const categoria = categorias.find((c) => c.id === item.categoriaId)?.nombre ?? 'Sin categoría';
          const estado =
            item.stock <= 0
              ? { label: 'Agotado', color: colors.danger, bg: colors.dangerLight }
              : item.stock <= item.stockMinimo
                ? { label: 'Stock bajo', color: colors.warning, bg: colors.warningLight }
                : { label: 'Disponible', color: colors.accent, bg: colors.primaryLight };
          return (
            <View style={styles.row}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <View style={styles.thumb}>
                  <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.nombre}
                  </Text>
                  <Text style={styles.meta}>
                    {categoria} · {item.codigo}
                  </Text>
                  <Text style={styles.meta}>
                    Compra {dinero(item.precioCompra, config.moneda)} · Venta {dinero(item.precioVenta, config.moneda)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[styles.estado, { backgroundColor: estado.bg }]}>
                    <Text style={{ color: estado.color, fontSize: 10, fontWeight: '700' }}>{estado.label}</Text>
                  </View>
                  <Text style={styles.stock}>
                    {item.stock} {item.unidad === 'kilo' ? 'kg' : 'und'}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable
                  style={styles.action}
                  onPress={() => router.push({ pathname: '/producto/[id]', params: { id: item.id } })}
                >
                  <Ionicons name="create-outline" size={15} color={colors.primary} />
                  <Text style={styles.actionText}>Editar</Text>
                </Pressable>
                <Pressable style={styles.action} onPress={() => setAjustando(item)}>
                  <Ionicons name="swap-vertical-outline" size={15} color={colors.primary} />
                  <Text style={styles.actionText}>Ajustar stock</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      <AjusteStockModal
        producto={ajustando}
        onClose={() => setAjustando(null)}
        onConfirm={(delta) => {
          if (ajustando) ajustarStock(ajustando.id, delta);
          setAjustando(null);
        }}
      />
    </View>
  );
}

function AjusteStockModal({
  producto,
  onClose,
  onConfirm,
}: {
  producto: Producto | null;
  onClose: () => void;
  onConfirm: (delta: number) => void;
}) {
  const [tipo, setTipo] = useState<'entrada' | 'salida'>('entrada');
  const [cantidad, setCantidad] = useState('');

  const cerrar = () => {
    setCantidad('');
    setTipo('entrada');
    onClose();
  };

  return (
    <Modal visible={!!producto} transparent animationType="slide" onRequestClose={cerrar}>
      <Pressable style={styles.backdrop} onPress={cerrar} />
      <View style={styles.sheet}>
        <Text style={styles.sheetTitle}>Ajustar stock</Text>
        <Text style={styles.meta}>
          {producto?.nombre} · Stock actual: {producto?.stock}
        </Text>
        <View style={{ marginVertical: 14 }}>
          <Segmented
            value={tipo}
            onChange={setTipo}
            options={[
              { value: 'entrada', label: 'Entrada', icon: 'arrow-down-outline' },
              { value: 'salida', label: 'Salida / merma', icon: 'arrow-up-outline' },
            ]}
          />
        </View>
        <Field label="Cantidad" keyboardType="decimal-pad" value={cantidad} onChangeText={setCantidad} placeholder="0" />
        <Button
          label="Guardar ajuste"
          icon="checkmark-circle-outline"
          disabled={parseNumero(cantidad) <= 0}
          onPress={() => {
            const n = parseNumero(cantidad);
            setCantidad('');
            onConfirm(tipo === 'entrada' ? n : -n);
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: colors.text },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 14, fontWeight: '700', color: colors.text },
  meta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  estado: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  stock: { fontSize: 14, fontWeight: '800', color: colors.text },
  actions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  action: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
  },
  actionText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.surface,
    padding: 20,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
});
