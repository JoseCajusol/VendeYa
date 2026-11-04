import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { useAppStore, useUmbral } from '@/store/useAppStore';

/** Productos activos con stock menor o igual al umbral (5 por defecto). */
export function useStockBajo() {
  const productos = useAppStore((s) => s.productos);
  const umbral = useUmbral();
  return useMemo(() => productos.filter((p) => p.stock <= umbral).sort((a, b) => a.stock - b.stock), [productos, umbral]);
}

/** Aviso que se muestra cuando hay productos por reponer. */
export function AlertaStock({ irAInventario = true }: { irAInventario?: boolean }) {
  const bajos = useStockBajo();
  const umbral = useUmbral();
  if (bajos.length === 0) return null;
  const nombres = bajos
    .slice(0, 3)
    .map((p) => `${p.nombre} (${p.stock})`)
    .join(', ');
  return (
    <Pressable
      disabled={!irAInventario}
      onPress={() => router.navigate({ pathname: '/inventario', params: { filtro: 'bajo' } })}
      style={styles.caja}
    >
      <Ionicons name="warning" size={22} color={colors.warning} />
      <View style={{ flex: 1 }}>
        <Text style={styles.titulo}>
          {bajos.length === 1 ? '1 producto necesita reposición' : `${bajos.length} productos necesitan reposición`}
        </Text>
        <Text style={styles.texto} numberOfLines={2}>
          Stock ≤ {umbral}: {nombres}
          {bajos.length > 3 ? ` y ${bajos.length - 3} más` : ''}. Compra más para llenar tu inventario.
        </Text>
      </View>
      {irAInventario && <Ionicons name="chevron-forward" size={18} color={colors.warning} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  titulo: { fontWeight: '800', color: colors.warning, fontSize: 14 },
  texto: { color: colors.text, fontSize: 13, marginTop: 2 },
});
