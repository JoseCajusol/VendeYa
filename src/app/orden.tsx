import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, Field, SectionTitle } from '@/components/ui';
import { saldoCliente, totalCarrito, useStore } from '@/store/useStore';
import { colors, metodoInfo, radius } from '@/constants/colors';
import { MetodoPago } from '@/infrastructure/interfaces';
import { dinero, parseNumero } from '@/utils/format';

export default function OrdenScreen() {
  const { carrito, productos, config, clientes, confirmarVenta } = useStore();
  const [descuento, setDescuento] = useState('');
  const [notas, setNotas] = useState('');
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo');
  const [recibido, setRecibido] = useState('');
  const [clienteId, setClienteId] = useState<string | undefined>();
  const [clienteNuevo, setClienteNuevo] = useState('');

  const subtotal = totalCarrito(carrito, productos);
  const desc = Math.min(parseNumero(descuento), subtotal);
  const total = Math.round((subtotal - desc) * 100) / 100;
  const montoRecibido = parseNumero(recibido);
  const vuelto = montoRecibido - total;
  const m = config.moneda;

  const metodos = (Object.keys(metodoInfo) as MetodoPago[]).filter((k) => {
    if (k === 'yape') return config.yape.activo;
    if (k === 'plin') return config.plin.activo;
    return config[k];
  });

  const cuentaDigital = metodo === 'yape' ? config.yape : metodo === 'plin' ? config.plin : null;

  const puedeConfirmar =
    carrito.length > 0 &&
    (metodo !== 'efectivo' || recibido === '' || montoRecibido >= total) &&
    (metodo !== 'fiado' || !!clienteId || clienteNuevo.trim().length > 1);

  const confirmar = () => {
    const venta = confirmarVenta({
      metodo,
      descuento: desc,
      notas,
      montoRecibido: metodo === 'efectivo' ? (recibido === '' ? total : montoRecibido) : undefined,
      clienteId,
      clienteNuevo,
    });
    if (venta) router.replace({ pathname: '/ticket/[id]', params: { id: venta.id, nuevo: '1' } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total a cobrar</Text>
          <Text style={styles.totalValue}>{dinero(total, m)}</Text>
          {desc > 0 && (
            <Text style={styles.totalSub}>
              Subtotal {dinero(subtotal, m)} − descuento {dinero(desc, m)}
            </Text>
          )}
        </View>

        <Card>
          <SectionTitle icon="list-outline" title={`Resumen (${carrito.length} productos)`} />
          {carrito.map((item) => {
            const p = productos.find((x) => x.id === item.productoId);
            if (!p) return null;
            return (
              <View key={item.productoId} style={styles.itemRow}>
                <Text style={styles.itemQty}>{item.cantidad}×</Text>
                <Text style={styles.itemName} numberOfLines={1}>
                  {p.nombre}
                </Text>
                <Text style={styles.itemTotal}>{dinero(p.precioVenta * item.cantidad, m)}</Text>
              </View>
            );
          })}
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field label={`Descuento (${m})`} icon="pricetag-outline" keyboardType="decimal-pad" value={descuento} onChangeText={setDescuento} placeholder="0.00" />
          </View>
          <Field
            label="Notas / Observaciones"
            icon="document-text-outline"
            value={notas}
            onChangeText={setNotas}
            placeholder="Ej. Entregar en tienda"
          />
        </Card>

        <Card>
          <SectionTitle icon="wallet-outline" title="Método de pago" />
          <View style={styles.metodos}>
            {metodos.map((k) => {
              const info = metodoInfo[k];
              const activo = metodo === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => setMetodo(k)}
                  style={[styles.metodo, activo && { borderColor: info.color, backgroundColor: info.color + '14' }]}
                >
                  <Ionicons name={info.icon as keyof typeof Ionicons.glyphMap} size={20} color={info.color} />
                  <Text style={[styles.metodoText, activo && { color: info.color }]}>{info.label}</Text>
                  {activo && <Ionicons name="checkmark-circle" size={16} color={info.color} style={styles.check} />}
                </Pressable>
              );
            })}
          </View>

          {metodo === 'efectivo' && (
            <View style={{ marginTop: 12 }}>
              <Field label={`Monto recibido (${m})`} icon="cash-outline" keyboardType="decimal-pad" value={recibido} onChangeText={setRecibido} placeholder={total.toFixed(2)} />
              {recibido !== '' && (
                <View style={[styles.vuelto, vuelto < 0 && { backgroundColor: colors.dangerLight }]}>
                  <Text style={{ color: vuelto < 0 ? colors.danger : colors.primary, fontWeight: '700' }}>
                    {vuelto < 0 ? `Faltan ${dinero(-vuelto, m)}` : `Vuelto: ${dinero(vuelto, m)}`}
                  </Text>
                </View>
              )}
            </View>
          )}

          {cuentaDigital && (
            <View style={styles.qrBox}>
              <Text style={styles.qrTitle}>Escanea para pagar</Text>
              {cuentaDigital.qrUri ? (
                <Image source={{ uri: cuentaDigital.qrUri }} style={styles.qr} />
              ) : (
                <View style={[styles.qr, styles.qrPlaceholder]}>
                  <Ionicons name="qr-code" size={90} color={colors.text} />
                  <Text style={styles.qrHint}>Sube tu QR en Ajustes</Text>
                </View>
              )}
              <Text style={styles.qrNumber}>
                {metodoInfo[metodo].label}: {cuentaDigital.numero}
              </Text>
              <Text style={styles.qrHint}>Titular: {cuentaDigital.titular}</Text>
            </View>
          )}

          {metodo === 'tarjeta' && (
            <Text style={styles.info}>Cobra {dinero(total, m)} en el terminal POS y confirma cuando el pago sea aprobado.</Text>
          )}

          {metodo === 'fiado' && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Cliente</Text>
              <View style={styles.chips}>
                {clientes.map((c) => (
                  <Chip
                    key={c.id}
                    label={`${c.nombre} (${dinero(saldoCliente(c), m)})`}
                    active={clienteId === c.id}
                    color={colors.fiado}
                    onPress={() => {
                      setClienteId(c.id);
                      setClienteNuevo('');
                    }}
                  />
                ))}
              </View>
              <Field
                label="O registra un cliente nuevo"
                icon="person-add-outline"
                value={clienteNuevo}
                onChangeText={(t) => {
                  setClienteNuevo(t);
                  setClienteId(undefined);
                }}
                placeholder="Nombre del cliente"
              />
            </View>
          )}
        </Card>

        <Button
          label="Confirmar venta y emitir ticket"
          icon="checkmark-done-outline"
          variant={metodo === 'fiado' ? 'fiado' : 'primary'}
          disabled={!puedeConfirmar}
          onPress={confirmar}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  totalBox: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: 18, alignItems: 'center' },
  totalLabel: { color: '#CFE3DC', fontSize: 13 },
  totalValue: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 2 },
  totalSub: { color: '#CFE3DC', fontSize: 12, marginTop: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  itemQty: { fontWeight: '700', color: colors.primary, width: 42 },
  itemName: { flex: 1, color: colors.text },
  itemTotal: { fontWeight: '700', color: colors.text },
  metodos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metodo: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  metodoText: { fontWeight: '700', color: colors.text, fontSize: 13 },
  check: { marginLeft: 'auto' },
  vuelto: { backgroundColor: colors.primaryLight, padding: 12, borderRadius: radius.md, alignItems: 'center' },
  qrBox: { alignItems: 'center', marginTop: 14, gap: 6 },
  qrTitle: { fontWeight: '700', color: colors.text },
  qr: { width: 180, height: 180, borderRadius: radius.md },
  qrPlaceholder: { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  qrNumber: { fontWeight: '800', color: colors.text },
  qrHint: { fontSize: 11, color: colors.textMuted },
  info: { marginTop: 12, color: colors.textMuted, fontSize: 13 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
});
