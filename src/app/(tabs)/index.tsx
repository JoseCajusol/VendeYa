import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BarcodeScanner } from '@/components/BarcodeScanner';
import { CartItemRow } from '@/components/CartItemRow';
import { Button, EmptyState, ScreenHeader } from '@/components/ui';
import { totalCarrito, useStore } from '@/store/useStore';
import { colors, radius } from '@/constants/colors';
import { dinero } from '@/utils/format';

export default function VentaScreen() {
  const { carrito, productos, config, agregarAlCarrito, cambiarCantidad, vaciarCarrito } = useStore();
  const [enFoco, setEnFoco] = useState(false);
  const [codigoManual, setCodigoManual] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);

  // La cámara solo se mantiene activa mientras esta pestaña está visible.
  useFocusEffect(
    useCallback(() => {
      setEnFoco(true);
      return () => setEnFoco(false);
    }, []),
  );

  const procesarCodigo = (codigo: string) => {
    const producto = productos.find((p) => p.codigo === codigo.trim());
    if (!producto) {
      Alert.alert('Producto no registrado', `No existe un producto con el código ${codigo}.`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Registrar',
          onPress: () => router.push({ pathname: '/producto/[id]', params: { id: 'nuevo', codigo } }),
        },
      ]);
      return;
    }
    agregarAlCarrito(producto.id);
    setAviso(
      producto.stock <= 0 ? `⚠ ${producto.nombre} figura sin stock` : `✓ ${producto.nombre} agregado`,
    );
    setTimeout(() => setAviso(null), 1800);
  };

  const total = totalCarrito(carrito, productos);
  const unidades = carrito.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Venta" icon="storefront-outline" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BarcodeScanner activo={enFoco} onScan={procesarCodigo} />

        <View style={styles.manual}>
          <Ionicons name="barcode-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={codigoManual}
            onChangeText={setCodigoManual}
            placeholder="Ingresar código manualmente"
            placeholderTextColor="#9AA6A2"
            keyboardType="number-pad"
            style={styles.manualInput}
            onSubmitEditing={() => {
              if (codigoManual) procesarCodigo(codigoManual);
              setCodigoManual('');
            }}
          />
          <Pressable
            style={styles.manualBtn}
            onPress={() => {
              if (codigoManual) procesarCodigo(codigoManual);
              setCodigoManual('');
            }}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </Pressable>
        </View>

        {aviso && <Text style={styles.aviso}>{aviso}</Text>}

        <View style={styles.cartHeader}>
          <Text style={styles.cartTitle}>Carrito actual</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{unidades} ítems</Text>
          </View>
          <View style={{ flex: 1 }} />
          {unidades > 0 && (
            <Pressable onPress={vaciarCarrito} style={styles.vaciar}>
              <Ionicons name="trash-outline" size={14} color={colors.danger} />
              <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 13 }}>Vaciar</Text>
            </Pressable>
          )}
        </View>

        {unidades === 0 ? (
          <EmptyState
            icon="bag-handle-outline"
            title="Lista vacía"
            text="Los productos escaneados con la cámara o elegidos en el Catálogo aparecerán en esta lista."
          />
        ) : (
          <View style={{ gap: 10 }}>
            {carrito.map((item) => {
              const producto = productos.find((p) => p.id === item.productoId);
              if (!producto) return null;
              return (
                <CartItemRow
                  key={item.productoId}
                  producto={producto}
                  cantidad={item.cantidad}
                  moneda={config.moneda}
                  onChange={(c) => cambiarCantidad(producto.id, c)}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Revisar Orden"
          icon="receipt-outline"
          disabled={unidades === 0}
          onPress={() => router.push('/orden')}
          style={{ justifyContent: 'flex-start' }}
          right={
            <View style={styles.totalPill}>
              <Text style={styles.totalPillText}>{dinero(total, config.moneda)}</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  manual: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingLeft: 12,
    paddingRight: 6,
  },
  manualInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: colors.text },
  manualBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aviso: {
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    padding: 10,
    borderRadius: radius.sm,
    fontWeight: '600',
    fontSize: 13,
  },
  cartHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  cartTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  pill: { backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  pillText: { fontSize: 11, color: colors.primary, fontWeight: '700' },
  vaciar: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footer: {
    padding: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalPill: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  totalPillText: { color: colors.primary, fontWeight: '800' },
});
