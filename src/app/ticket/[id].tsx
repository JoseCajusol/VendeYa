import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Image, Platform, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { colors, metodoInfo, radius } from '@/constants/colors';
import { dinero, fechaCorta, horaCorta } from '@/utils/format';
import { ticketComoTexto } from '@/utils/ticket';

export default function TicketScreen() {
  const { id, nuevo } = useLocalSearchParams<{ id: string; nuevo?: string }>();
  const { ventas, clientes, config } = useStore();
  const [compartirResultado, setCompartirResultado] = useState<'copiado' | 'manual' | 'compartido' | null>(null);
  const venta = ventas.find((v) => v.id === id);
  const m = config.moneda;

  if (!venta) {
    return <EmptyState icon="receipt-outline" title="Ticket no encontrado" text="Es posible que los datos se hayan restablecido." />;
  }

  const cliente = clientes.find((c) => c.id === venta.clienteId);

  const compartir = async () => {
    const texto = ticketComoTexto(venta, config, cliente?.nombre);

    if (Platform.OS !== 'web') {
      await Share.share({ message: texto });
      return;
    }

    setCompartirResultado(null);

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `Ticket #${venta.codigo}`, text: texto });
        setCompartirResultado('compartido');
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }

    setCompartirResultado((await copiarTextoEnWeb(texto)) ? 'copiado' : 'manual');
  };

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
      {compartirResultado === 'copiado' && (
        <Text style={styles.shareMessage}>Ticket copiado. Ya puedes pegarlo para compartir.</Text>
      )}
      {compartirResultado === 'compartido' && <Text style={styles.shareMessage}>Ticket compartido.</Text>}
      {compartirResultado === 'manual' && (
        <View style={styles.shareFallback}>
          <Text style={styles.shareMessage}>No se pudo copiar automáticamente. Selecciona y copia el texto:</Text>
          <Text selectable style={styles.shareText}>
            {ticketComoTexto(venta, config, cliente?.nombre)}
          </Text>
        </View>
      )}
      <Button label="Nueva venta" icon="add-circle-outline" onPress={() => router.dismissTo('/')} />
    </ScrollView>
  );
}

async function copiarTextoEnWeb(texto: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // Fall through to the browser's legacy clipboard command.
    }
  }

  if (typeof document === 'undefined') return false;

  const campo = document.createElement('textarea');
  campo.value = texto;
  campo.setAttribute('readonly', '');
  campo.style.position = 'fixed';
  campo.style.top = '0';
  campo.style.left = '0';
  campo.style.opacity = '0';

  try {
    document.body.appendChild(campo);
    campo.focus();
    campo.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    if (campo.parentNode) campo.parentNode.removeChild(campo);
  }
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
  shareFallback: { padding: 12, backgroundColor: colors.surface, borderRadius: radius.md, gap: 8 },
  shareMessage: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  shareText: { color: colors.text, fontSize: 12 },
});
