import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { colors, metodoInfo, radius } from '@/constants/colors';
import { dinero, fechaCorta, horaCorta } from '@/utils/format';
import { ticketComoTexto } from '@/utils/ticket';

export default function TicketScreen() {
  const { id, nuevo } = useLocalSearchParams<{ id: string; nuevo?: string }>();
  const { ventas, clientes, config } = useStore();
  const venta = ventas.find((v) => v.id === id);
  const m = config.moneda;

  if (!venta) {
    return <EmptyState icon="receipt-outline" title="Ticket no encontrado" text="Es posible que los datos se hayan restablecido." />;
  }

  const cliente = clientes.find((c) => c.id === venta.clienteId);

  const compartir = () => Share.share({ message: ticketComoTexto(venta, config, cliente?.nombre) });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {nuevo === '1' && (
        <View style={styles.success}>
          <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
          <Text style={styles.successText}>¡Venta registrada correctamente!</Text>
        </View>
      )}

      <View style={styles.ticket}>
        {config.logoUri ? <Image source={{ uri: config.logoUri }} style={styles.logo} /> : null}
        <Text style={styles.negocio}>{config.nombre}</Text>
        <Text style={styles.small}>RUC {config.ruc}</Text>
        <Text style={styles.small}>{config.direccion}</Text>
        <Text style={styles.small}>Tel. {config.telefono}</Text>

        <View style={styles.sep} />
        <View style={styles.rowBetween}>
          <Text style={styles.small}>Ticket #{venta.codigo}</Text>
          <Text style={styles.small}>
            {fechaCorta(venta.fecha)} {horaCorta(venta.fecha)}
          </Text>
        </View>
        <View style={styles.sep} />

        {venta.items.map((i) => (
          <View key={i.productoId} style={styles.item}>
            <Text style={styles.itemName}>{i.nombre}</Text>
            <View style={styles.rowBetween}>
              <Text style={styles.small}>
                {i.cantidad} {i.unidad === 'kilo' ? 'kg' : 'und'} × {dinero(i.precio, m)}
              </Text>
              <Text style={styles.itemTotal}>{dinero(i.precio * i.cantidad, m)}</Text>
            </View>
          </View>
        ))}

        <View style={styles.sep} />
        <Linea label="Subtotal" value={dinero(venta.subtotal, m)} />
        {venta.descuento > 0 && <Linea label="Descuento" value={`− ${dinero(venta.descuento, m)}`} />}
        <View style={styles.rowBetween}>
          <Text style={styles.total}>TOTAL</Text>
          <Text style={styles.total}>{dinero(venta.total, m)}</Text>
        </View>
        <View style={styles.sep} />
        <Linea label="Método de pago" value={metodoInfo[venta.metodo].label} />
        {venta.montoRecibido !== undefined && <Linea label="Recibido" value={dinero(venta.montoRecibido, m)} />}
        {venta.vuelto !== undefined && <Linea label="Vuelto" value={dinero(venta.vuelto, m)} />}
        {cliente && <Linea label="Cliente (fiado)" value={cliente.nombre} />}
        {venta.notas ? <Linea label="Notas" value={venta.notas} /> : null}
        <View style={styles.sep} />
        <Text style={[styles.small, { textAlign: 'center', fontStyle: 'italic' }]}>{config.mensajeTicket}</Text>
      </View>

      <Button label="Compartir ticket" icon="share-social-outline" variant="secondary" onPress={compartir} />
      <Button label="Nueva venta" icon="add-circle-outline" onPress={() => router.dismissTo('/')} />
    </ScrollView>
  );
}

function Linea({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.small}>{label}</Text>
      <Text style={[styles.small, { color: colors.text, fontWeight: '600' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  success: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: radius.md,
  },
  successText: { color: colors.primary, fontWeight: '700' },
  ticket: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  logo: { width: 56, height: 56, borderRadius: 12, alignSelf: 'center', marginBottom: 6 },
  negocio: { fontSize: 17, fontWeight: '800', textAlign: 'center', color: colors.text },
  small: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  sep: { borderBottomWidth: 1, borderStyle: 'dashed', borderColor: colors.border, marginVertical: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  item: { marginBottom: 6 },
  itemName: { fontSize: 13, fontWeight: '600', color: colors.text },
  itemTotal: { fontSize: 13, fontWeight: '700', color: colors.text },
  total: { fontSize: 18, fontWeight: '800', color: colors.text },
});
