import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';

/** Gráfico de barras simple hecho con Views (sin librerías externas). */
export function GraficoBarras({ datos, alto = 140 }: { datos: { etiqueta: string; valor: number }[]; alto?: number }) {
  const max = Math.max(...datos.map((d) => d.valor), 0);
  if (max === 0) {
    return <Text style={styles.vacio}>Sin ventas para graficar en este periodo.</Text>;
  }
  const ancho = datos.length > 12 ? 22 : datos.length > 7 ? 26 : 38;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
      {datos.map((d, i) => (
        <View key={i} style={[styles.columna, { width: ancho }]}>
          <Text style={styles.valor} numberOfLines={1}>
            {d.valor > 0 ? Math.round(d.valor) : ''}
          </Text>
          <View style={{ height: alto, justifyContent: 'flex-end' }}>
            <View
              style={[
                styles.barra,
                { height: Math.max(2, (d.valor / max) * alto), backgroundColor: d.valor > 0 ? colors.primary : colors.border },
              ]}
            />
          </View>
          <Text style={styles.etiqueta} numberOfLines={1}>
            {d.etiqueta}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fila: { alignItems: 'flex-end', gap: 4, paddingVertical: spacing.sm },
  columna: { alignItems: 'center' },
  barra: { width: '70%', borderTopLeftRadius: 4, borderTopRightRadius: 4, alignSelf: 'center' },
  valor: { fontSize: 9, color: colors.textMuted, marginBottom: 2 },
  etiqueta: { fontSize: 9, color: colors.textMuted, marginTop: 4 },
  vacio: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
});
