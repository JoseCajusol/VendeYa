import { StyleSheet, Text, View } from 'react-native';

import { QtyStepper } from '@/components/ui';
import { colors, radius } from '@/constants/colors';
import { Producto } from '@/infrastructure/interfaces';
import { dinero } from '@/utils/format';

export function CartItemRow({
  producto,
  cantidad,
  moneda,
  onChange,
}: {
  producto: Producto;
  cantidad: number;
  moneda: string;
  onChange: (cantidad: number) => void;
}) {
  const esKilo = producto.unidad === 'kilo';
  return (
    <View style={styles.row}>
      <View style={styles.thumb}>
        <Text style={{ fontSize: 22 }}>{producto.emoji}</Text>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={styles.name} numberOfLines={1}>
          {producto.nombre}
        </Text>
        <Text style={styles.price}>
          {dinero(producto.precioVenta, moneda)} {esKilo ? '/ kg' : 'c/u'}
        </Text>
        <QtyStepper value={cantidad} step={esKilo ? 0.25 : 1} onChange={onChange} />
      </View>
      <Text style={styles.total}>{dinero(producto.precioVenta * cantidad, moneda)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
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
  price: { fontSize: 12, color: colors.textMuted },
  total: { fontSize: 15, fontWeight: '800', color: colors.text, alignSelf: 'flex-start' },
});
