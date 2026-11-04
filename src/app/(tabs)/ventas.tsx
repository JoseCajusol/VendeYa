import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip, ErrorConexion, EstadoVacio, Insignia } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { api, mensajeError } from '@/services/api';
import type { MetodoPago, Venta } from '@/types';
import { fechaCorta, fechaISO, hora, inicioDe, moneda } from '@/utils/format';

type Rango = 'hoy' | 'semana' | 'mes' | 'todo';

export default function VentasScreen() {
  const [rango, setRango] = useState<Rango>('hoy');
  const [metodo, setMetodo] = useState<MetodoPago | null>(null);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await api.ventas({
        desde: rango === 'todo' ? undefined : inicioDe(rango),
        hasta: rango === 'todo' ? undefined : fechaISO(),
        metodo: metodo ?? undefined,
      });
      setVentas(datos);
      setError(null);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }, [rango, metodo]);

  // Se recarga al entrar a la pestaña (después de cada venta/anulación) y al cambiar filtros
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const completadas = ventas.filter((v) => v.estado === 'COMPLETADA');
  const total = completadas.reduce((t, v) => t + v.total, 0);

  return (
    <View style={{ flex: 1 }}>
      {error && <ErrorConexion mensaje={error} onReintentar={cargar} />}
      <View style={{ padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          <Chip texto="Hoy" activo={rango === 'hoy'} onPress={() => setRango('hoy')} />
          <Chip texto="Esta semana" activo={rango === 'semana'} onPress={() => setRango('semana')} />
          <Chip texto="Este mes" activo={rango === 'mes'} onPress={() => setRango('mes')} />
          <Chip texto="Todas" activo={rango === 'todo'} onPress={() => setRango('todo')} />
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <Chip texto="Efectivo" icono="cash-outline" activo={metodo === 'EFECTIVO'} onPress={() => setMetodo(metodo === 'EFECTIVO' ? null : 'EFECTIVO')} />
          <Chip texto="Yape" icono="qr-code-outline" activo={metodo === 'YAPE'} onPress={() => setMetodo(metodo === 'YAPE' ? null : 'YAPE')} />
        </ScrollView>
        <View style={styles.resumen}>
          <View>
            <Text style={{ color: colors.primarySoft, fontSize: 12 }}>Total vendido</Text>
            <Text style={styles.resumenTotal}>{moneda(total)}</Text>
          </View>
          <Text style={{ color: '#fff', fontWeight: '600' }}>
            {completadas.length} {completadas.length === 1 ? 'venta' : 'ventas'}
          </Text>
        </View>
      </View>

      <FlatList
        data={ventas}
        keyExtractor={(v) => String(v.id)}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} colors={[colors.primary]} />}
        renderItem={({ item: v }) => {
          const yape = v.metodo_pago === 'YAPE';
          const anulada = v.estado === 'ANULADA';
          return (
            <Pressable style={[styles.item, anulada && { opacity: 0.6 }]} onPress={() => router.push({ pathname: '/venta/[id]', params: { id: String(v.id) } })}>
              <View style={[styles.icono, { backgroundColor: yape ? colors.yapeSoft : colors.successSoft }]}>
                <Ionicons name={yape ? 'qr-code-outline' : 'cash-outline'} size={20} color={yape ? colors.yape : colors.efectivo} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.codigo}>{v.codigo}</Text>
                <Text style={styles.detalle}>
                  {rango === 'hoy' ? hora(v.fecha) : `${fechaCorta(v.fecha)} ${hora(v.fecha)}`} · {v.items_count} uds. · {yape ? 'Yape' : 'Efectivo'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={[styles.total, anulada && { textDecorationLine: 'line-through' }]}>{moneda(v.total)}</Text>
                {anulada && <Insignia texto="Anulada" color={colors.danger} fondo={colors.dangerSoft} />}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !cargando && !error ? (
            <EstadoVacio icono="receipt-outline" titulo="No hay ventas en este periodo" mensaje="Las ventas que registres aparecerán aquí." />
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  resumen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  resumenTotal: { color: '#fff', fontSize: 24, fontWeight: '900' },
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
  icono: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  codigo: { fontSize: 15, fontWeight: '700', color: colors.text },
  detalle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  total: { fontSize: 16, fontWeight: '800', color: colors.text },
});
