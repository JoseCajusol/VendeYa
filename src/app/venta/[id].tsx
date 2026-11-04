import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Boton, EstadoVacio, Insignia, Tarjeta } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { api, mensajeError } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import type { Venta } from '@/types';
import { fechaHora, moneda } from '@/utils/format';
import { compartirTicket } from '@/utils/pdf';

export default function VentaDetalleScreen() {
  const { id, nueva } = useLocalSearchParams<{ id: string; nueva?: string }>();
  const config = useAppStore((s) => s.config);
  const datosCambiaron = useAppStore((s) => s.datosCambiaron);
  const [venta, setVenta] = useState<Venta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setVenta(await api.venta(Number(id)));
      setError(null);
    } catch (e) {
      setError(mensajeError(e));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  if (error) {
    return (
      <EstadoVacio icono="alert-circle-outline" titulo="No se pudo cargar la venta" mensaje={error}>
        <Boton titulo="Reintentar" onPress={cargar} />
      </EstadoVacio>
    );
  }
  if (!venta) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;

  const anulada = venta.estado === 'ANULADA';

  const compartir = async () => {
    try {
      await compartirTicket(venta, config);
    } catch (e) {
      Alert.alert('No se pudo generar el PDF', mensajeError(e));
    }
  };

  const anular = () =>
    Alert.alert(
      'Anular venta',
      `¿Seguro que deseas anular la venta ${venta.codigo}? Los productos volverán al inventario.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, anular',
          style: 'destructive',
          onPress: async () => {
            setProcesando(true);
            try {
              setVenta(await api.anularVenta(venta.id));
              await datosCambiaron();
            } catch (e) {
              Alert.alert('No se pudo anular', mensajeError(e));
            } finally {
              setProcesando(false);
            }
          },
        },
      ],
    );

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      {nueva === '1' && !anulada && (
        <View style={styles.exito}>
          <Ionicons name="checkmark-circle" size={40} color={colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.success }}>¡Venta registrada!</Text>
            <Text style={{ color: colors.text }}>El inventario ya fue actualizado.</Text>
          </View>
        </View>
      )}

      <Tarjeta>
        <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
          <Text style={styles.negocio}>{config?.nombre_negocio ?? 'VendeYa'}</Text>
          {config?.ruc ? <Text style={styles.muted}>RUC {config.ruc}</Text> : null}
          {config?.direccion ? <Text style={styles.muted}>{config.direccion}</Text> : null}
        </View>
        <View style={styles.fila}>
          <Text style={styles.codigo}>{venta.codigo}</Text>
          {anulada ? (
            <Insignia texto="ANULADA" color={colors.danger} fondo={colors.dangerSoft} />
          ) : (
            <Insignia texto="COMPLETADA" color={colors.success} fondo={colors.successSoft} />
          )}
        </View>
        <Text style={styles.muted}>{fechaHora(venta.fecha)}</Text>

        <View style={styles.separador} />
        {(venta.items ?? []).map((i) => (
          <View key={i.id} style={[styles.fila, { marginBottom: spacing.sm }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: colors.text }}>{i.nombre_producto}</Text>
              <Text style={styles.muted}>
                {i.cantidad} × {moneda(i.precio_unitario)}
              </Text>
            </View>
            <Text style={{ fontWeight: '700', color: colors.text }}>{moneda(i.subtotal)}</Text>
          </View>
        ))}
        <View style={styles.separador} />

        <View style={styles.fila}>
          <Text style={styles.totalTexto}>TOTAL</Text>
          <Text style={styles.totalTexto}>{moneda(venta.total)}</Text>
        </View>
        <View style={[styles.fila, { marginTop: spacing.sm }]}>
          <Text style={styles.muted}>Método de pago</Text>
          <Text style={{ fontWeight: '700', color: venta.metodo_pago === 'YAPE' ? colors.yape : colors.efectivo }}>
            {venta.metodo_pago === 'YAPE' ? 'Yape' : 'Efectivo'}
          </Text>
        </View>
        {venta.metodo_pago === 'EFECTIVO' && (
          <>
            <View style={styles.fila}>
              <Text style={styles.muted}>Recibido</Text>
              <Text style={{ color: colors.text }}>{moneda(venta.monto_recibido ?? venta.total)}</Text>
            </View>
            <View style={styles.fila}>
              <Text style={styles.muted}>Vuelto</Text>
              <Text style={{ color: colors.text }}>{moneda(venta.vuelto ?? 0)}</Text>
            </View>
          </>
        )}
        {anulada && venta.anulada_en ? (
          <Text style={[styles.muted, { marginTop: spacing.sm, color: colors.danger }]}>Anulada el {fechaHora(venta.anulada_en)}</Text>
        ) : null}
      </Tarjeta>

      <Boton titulo="Compartir ticket (PDF)" icono="share-social-outline" variante="secundario" onPress={compartir} />
      {nueva === '1' && <Boton titulo="Nueva venta" icono="cart-outline" onPress={() => router.back()} />}
      {!anulada && (
        <Boton titulo="Anular venta" icono="close-circle-outline" variante="fantasma" cargando={procesando} onPress={anular} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  exito: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.successSoft,
    padding: spacing.lg,
    borderRadius: 16,
  },
  negocio: { fontSize: 18, fontWeight: '800', color: colors.text },
  muted: { color: colors.textMuted, fontSize: 13 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codigo: { fontSize: 16, fontWeight: '800', color: colors.text },
  separador: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  totalTexto: { fontSize: 20, fontWeight: '900', color: colors.text },
});
