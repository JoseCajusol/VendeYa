import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarcodeScanner } from '@/components/BarcodeScanner';
import { Button, Card, Chip, Field, SectionTitle, Segmented } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { colors } from '@/constants/colors';
import { Producto, UnidadVenta } from '@/infrastructure/interfaces';
import { generarCodigoBarras, parseNumero, uid } from '@/utils/format';

const EMOJIS = ['📦', '🍚', '🥤', '🍪', '🥛', '🧼', '🍅', '🧅', '🍞', '🥚', '🍫', '🧃', '🍺', '🧻'];

export default function ProductoScreen() {
  const { id, codigo: codigoParam } = useLocalSearchParams<{ id: string; codigo?: string }>();
  const { productos, categorias, guardarProducto, eliminarProducto } = useStore();
  const existente = productos.find((p) => p.id === id);
  const esNuevo = !existente;

  const [codigo, setCodigo] = useState(existente?.codigo ?? codigoParam ?? '');
  const [nombre, setNombre] = useState(existente?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(existente?.descripcion ?? '');
  const [categoriaId, setCategoriaId] = useState(existente?.categoriaId ?? categorias[0]?.id ?? '');
  const [unidad, setUnidad] = useState<UnidadVenta>(existente?.unidad ?? 'unidad');
  const [precioCompra, setPrecioCompra] = useState(existente ? String(existente.precioCompra) : '');
  const [precioVenta, setPrecioVenta] = useState(existente ? String(existente.precioVenta) : '');
  const [stock, setStock] = useState(existente ? String(existente.stock) : '');
  const [stockMinimo, setStockMinimo] = useState(existente ? String(existente.stockMinimo) : '5');
  const [emoji, setEmoji] = useState(existente?.emoji ?? '📦');
  const [escaneando, setEscaneando] = useState(false);

  const compra = parseNumero(precioCompra);
  const venta = parseNumero(precioVenta);
  const margen = compra > 0 ? ((venta - compra) / compra) * 100 : 0;

  const guardar = () => {
    if (!nombre.trim() || !codigo.trim() || venta <= 0) {
      Alert.alert('Datos incompletos', 'Ingresa el código, el nombre y el precio de venta.');
      return;
    }
    const duplicado = productos.find((p) => p.codigo === codigo.trim() && p.id !== existente?.id);
    if (duplicado) {
      Alert.alert('Código repetido', `El código ya pertenece a "${duplicado.nombre}".`);
      return;
    }
    const producto: Producto = {
      id: existente?.id ?? uid(),
      codigo: codigo.trim(),
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      categoriaId,
      unidad,
      precioCompra: compra,
      precioVenta: venta,
      stock: parseNumero(stock),
      stockMinimo: parseNumero(stockMinimo),
      emoji,
      creadoEn: existente?.creadoEn ?? new Date().toISOString(),
    };
    guardarProducto(producto);
    router.back();
  };

  const eliminar = () =>
    Alert.alert('Eliminar producto', `¿Eliminar "${existente?.nombre}" del inventario?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          if (existente) eliminarProducto(existente.id);
          router.back();
        },
      },
    ]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: esNuevo ? 'Nuevo Producto' : 'Editar Producto' }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Card>
          <SectionTitle icon="barcode-outline" title="Identificación" />
          {escaneando && (
            <View style={{ marginBottom: 12 }}>
              <BarcodeScanner
                activo
                alto={150}
                onScan={(c) => {
                  setCodigo(c);
                  setEscaneando(false);
                }}
              />
            </View>
          )}
          <Field
            label="Código de barras"
            icon="barcode-outline"
            value={codigo}
            onChangeText={setCodigo}
            keyboardType="number-pad"
            placeholder="Escanea o escribe el código"
            right={
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable hitSlop={6} onPress={() => setEscaneando((v) => !v)} style={styles.iconBtn}>
                  <Ionicons name="scan-outline" size={18} color="#fff" />
                </Pressable>
                <Pressable hitSlop={6} onPress={() => setCodigo(generarCodigoBarras())} style={[styles.iconBtn, styles.iconBtnAlt]}>
                  <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
                </Pressable>
              </View>
            }
          />
          <Text style={styles.help}>Usa ✨ para generar un código interno si el producto no tiene uno.</Text>
          <Field label="Nombre del producto" value={nombre} onChangeText={setNombre} placeholder="Ej. Arroz Costeño 1 kg" />
          <Field
            label="Descripción (opcional)"
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder="Marca, presentación, etc."
          />
          <Text style={styles.label}>Ícono</Text>
          <View style={styles.emojiRow}>
            {EMOJIS.map((e) => (
              <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.emoji, emoji === e && styles.emojiActive]}>
                <Text style={{ fontSize: 20 }}>{e}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card>
          <SectionTitle icon="pricetags-outline" title="Categoría y venta" />
          <View style={styles.chips}>
            {categorias.map((c) => (
              <Chip key={c.id} label={c.nombre} active={categoriaId === c.id} onPress={() => setCategoriaId(c.id)} />
            ))}
          </View>
          <Text style={[styles.label, { marginTop: 12 }]}>Se vende por</Text>
          <Segmented
            value={unidad}
            onChange={setUnidad}
            options={[
              { value: 'unidad', label: 'Unidad', icon: 'cube-outline' },
              { value: 'kilo', label: 'Kilo', icon: 'scale-outline' },
            ]}
          />
        </Card>

        <Card>
          <SectionTitle
            icon="cash-outline"
            title="Precios y stock"
            right={
              compra > 0 && venta > 0 ? (
                <Text style={{ color: margen >= 0 ? colors.accent : colors.danger, fontWeight: '700', fontSize: 12 }}>
                  Margen {margen.toFixed(0)}%
                </Text>
              ) : undefined
            }
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field label="Precio compra" keyboardType="decimal-pad" value={precioCompra} onChangeText={setPrecioCompra} placeholder="0.00" />
            <Field label="Precio venta" keyboardType="decimal-pad" value={precioVenta} onChangeText={setPrecioVenta} placeholder="0.00" />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field label="Stock actual" keyboardType="decimal-pad" value={stock} onChangeText={setStock} placeholder="0" />
            <Field label="Stock mínimo" keyboardType="decimal-pad" value={stockMinimo} onChangeText={setStockMinimo} placeholder="5" />
          </View>
        </Card>

        <Button label={esNuevo ? 'Registrar producto' : 'Guardar cambios'} icon="save-outline" onPress={guardar} />
        {!esNuevo && <Button label="Eliminar producto" icon="trash-outline" variant="danger" onPress={eliminar} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnAlt: { backgroundColor: colors.primaryLight },
  help: { fontSize: 11, color: colors.textMuted, marginTop: -6, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  emoji: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  emojiActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
