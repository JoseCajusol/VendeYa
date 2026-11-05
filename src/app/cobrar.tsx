import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Boton, Campo, EstadoVacio, Tarjeta } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { api, mensajeError } from '@/services/api';
import { totalCarrito, useAppStore } from '@/store/useAppStore';
import type { Cliente, MetodoPago, TipoDocumento } from '@/types';
import { aNumero, moneda } from '@/utils/format';

const BILLETES = [10, 20, 50, 100, 200];

export default function CobrarScreen() {
  const carrito = useAppStore((s) => s.carrito);
  const config = useAppStore((s) => s.config);
  const vaciarCarrito = useAppStore((s) => s.vaciarCarrito);
  const datosCambiaron = useAppStore((s) => s.datosCambiaron);
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');
  const [recibido, setRecibido] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('DNI');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [consultando, setConsultando] = useState(false);

  const total = totalCarrito(carrito);
  const montoRecibido = recibido.trim() === '' ? total : aNumero(recibido);
  const vuelto = Number.isFinite(montoRecibido) ? Math.round((montoRecibido - total) * 100) / 100 : NaN;
  const efectivoInvalido = metodo === 'EFECTIVO' && (!Number.isFinite(montoRecibido) || vuelto < 0);

  const consultarCliente = async () => {
    const esperado = tipoDocumento === 'DNI' ? 8 : 11;
    if (!new RegExp(`^\\d{${esperado}}$`).test(numeroDocumento.trim())) {
      Alert.alert('Documento inválido', `Ingresa un ${tipoDocumento} de ${esperado} dígitos.`);
      return;
    }
    setConsultando(true);
    try {
      const resultado = await api.consultarDocumento(tipoDocumento, numeroDocumento.trim());
      const d = resultado.data;
      const datos: Omit<Cliente, 'id'> = {
        tipo_documento: tipoDocumento,
        numero_documento: numeroDocumento.trim(),
        nombres: typeof d.nombres === 'string' ? d.nombres : null,
        apellido_paterno: typeof d.apellido_paterno === 'string' ? d.apellido_paterno : null,
        apellido_materno: typeof d.apellido_materno === 'string' ? d.apellido_materno : null,
        razon_social: typeof d.nombre_o_razon_social === 'string' ? d.nombre_o_razon_social : null,
        direccion: typeof d.direccion_completa === 'string' ? d.direccion_completa : typeof d.direccion === 'string' ? d.direccion : null,
        estado: typeof d.estado === 'string' ? d.estado : null,
        condicion: typeof d.condicion === 'string' ? d.condicion : null,
      };
      const guardado = await api.guardarCliente(datos);
      setCliente(guardado);
      Alert.alert('Cliente encontrado', guardado.razon_social ?? [guardado.nombres, guardado.apellido_paterno, guardado.apellido_materno].filter(Boolean).join(' '));
    } catch (e) {
      Alert.alert('No se pudo consultar', mensajeError(e));
    } finally {
      setConsultando(false);
    }
  };

  if (carrito.length === 0) {
    return (
      <EstadoVacio icono="cart-outline" titulo="No hay productos para cobrar">
        <Boton titulo="Volver" onPress={() => router.back()} />
      </EstadoVacio>
    );
  }

  const confirmar = async () => {
    setEnviando(true);
    try {
      const venta = await api.registrarVenta({
        items: carrito.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
        metodo_pago: metodo,
        monto_recibido: metodo === 'EFECTIVO' ? montoRecibido : undefined,
        cliente_id: cliente?.id,
      });
      vaciarCarrito();
      await datosCambiaron();
      router.replace({ pathname: '/venta/[id]', params: { id: String(venta.id), nueva: '1' } });
      const alertas = venta.alertas_stock ?? [];
      if (alertas.length > 0) {
        Alert.alert(
          '⚠️ Stock bajo',
          `Debes comprar más de:\n\n${alertas.map((a) => `• ${a.nombre}: quedan ${a.stock}`).join('\n')}`,
        );
      }
    } catch (e) {
      Alert.alert('No se pudo registrar la venta', mensajeError(e));
      datosCambiaron();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Tarjeta>
          <Text style={styles.subtitulo}>Cliente (opcional)</Text>
          <View style={styles.documentos}>
            {(['DNI', 'RUC'] as TipoDocumento[]).map((tipo) => (
              <Pressable key={tipo} style={[styles.documento, tipoDocumento === tipo && styles.documentoActivo]} onPress={() => { setTipoDocumento(tipo); setNumeroDocumento(''); setCliente(null); }}>
                <Text style={[styles.documentoTexto, tipoDocumento === tipo && { color: colors.primary }]}>{tipo}</Text>
              </Pressable>
            ))}
          </View>
          <Campo etiqueta={`Número de ${tipoDocumento}`} value={numeroDocumento} onChangeText={(v) => { setNumeroDocumento(v.replace(/\D/g, '')); setCliente(null); }} keyboardType="number-pad" placeholder={tipoDocumento === 'DNI' ? '8 dígitos' : '11 dígitos'} />
          <Boton titulo={`Consultar ${tipoDocumento}`} icono="search-outline" variante="secundario" cargando={consultando} onPress={consultarCliente} />
          {cliente && <Text style={styles.clienteEncontrado}>{cliente.razon_social ?? [cliente.nombres, cliente.apellido_paterno, cliente.apellido_materno].filter(Boolean).join(' ')}</Text>}
        </Tarjeta>
        <Tarjeta estilo={{ alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted }}>Total a cobrar</Text>
          <Text style={styles.total}>{moneda(total)}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            {carrito.reduce((t, i) => t + i.cantidad, 0)} unidades · {carrito.length} productos
          </Text>
        </Tarjeta>

        <View>
          <Text style={styles.subtitulo}>Método de pago</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <OpcionPago
              activo={metodo === 'EFECTIVO'}
              color={colors.efectivo}
              icono="cash-outline"
              titulo="Efectivo"
              onPress={() => setMetodo('EFECTIVO')}
            />
            <OpcionPago
              activo={metodo === 'YAPE'}
              color={colors.yape}
              icono="qr-code-outline"
              titulo="Yape"
              onPress={() => setMetodo('YAPE')}
            />
          </View>
        </View>

        {metodo === 'EFECTIVO' ? (
          <Tarjeta>
            <Campo
              etiqueta="¿Con cuánto paga el cliente?"
              placeholder={total.toFixed(2)}
              keyboardType="decimal-pad"
              value={recibido}
              onChangeText={setRecibido}
              ayuda="Déjalo vacío si paga el monto exacto."
              error={efectivoInvalido ? 'El monto recibido es menor que el total.' : undefined}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <Pressable style={styles.billete} onPress={() => setRecibido(total.toFixed(2))}>
                <Text style={styles.billeteTexto}>Exacto</Text>
              </Pressable>
              {BILLETES.filter((b) => b >= total).map((b) => (
                <Pressable key={b} style={styles.billete} onPress={() => setRecibido(String(b))}>
                  <Text style={styles.billeteTexto}>S/ {b}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.vuelto}>
              <Text style={{ fontSize: 16, color: colors.text }}>Vuelto</Text>
              <Text style={[styles.vueltoMonto, efectivoInvalido && { color: colors.danger }]}>
                {Number.isFinite(vuelto) ? moneda(Math.max(0, vuelto)) : '—'}
              </Text>
            </View>
          </Tarjeta>
        ) : (
          <Tarjeta estilo={{ alignItems: 'center', borderColor: colors.yape }}>
            <Text style={[styles.subtitulo, { color: colors.yape }]}>Muestra este QR al cliente</Text>
            {config?.yape_qr_url ? (
              <Image source={{ uri: config.yape_qr_url }} style={styles.qr} resizeMode="contain" />
            ) : (
              <View style={styles.sinQr}>
                <Ionicons name="qr-code-outline" size={56} color={colors.yape} />
                <Text style={{ textAlign: 'center', color: colors.text }}>
                  Aún no subiste el QR de tu Yape. Puedes subirlo en Ajustes.
                </Text>
                <Boton titulo="Ir a Ajustes" variante="yape" compacto onPress={() => router.push('/ajustes')} />
              </View>
            )}
            <Text style={styles.yapeMonto}>{moneda(total)}</Text>
            {config?.yape_titular ? <Text style={styles.yapeDato}>A nombre de: {config.yape_titular}</Text> : null}
            {config?.yape_numero ? <Text style={styles.yapeDato}>Celular: {config.yape_numero}</Text> : null}
            <Text style={styles.yapeNota}>Confirma la venta solo cuando veas la notificación del Yape recibido en tu celular.</Text>
          </Tarjeta>
        )}

        <Boton
          titulo={metodo === 'YAPE' ? 'Ya recibí el Yape — Confirmar' : 'Confirmar venta'}
          icono="checkmark-circle"
          variante={metodo === 'YAPE' ? 'yape' : 'primario'}
          cargando={enviando}
          deshabilitado={efectivoInvalido}
          onPress={confirmar}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function OpcionPago({
  activo,
  color,
  icono,
  titulo,
  onPress,
}: {
  activo: boolean;
  color: string;
  icono: 'cash-outline' | 'qr-code-outline';
  titulo: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.opcion, activo && { borderColor: color, backgroundColor: color + '14' }]}
    >
      <Ionicons name={icono} size={30} color={activo ? color : colors.textMuted} />
      <Text style={[styles.opcionTexto, { color: activo ? color : colors.text }]}>{titulo}</Text>
      {activo && <Ionicons name="checkmark-circle" size={18} color={color} style={{ position: 'absolute', top: 8, right: 8 }} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  total: { fontSize: 40, fontWeight: '900', color: colors.text, marginVertical: 4 },
  subtitulo: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  opcion: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  opcionTexto: { fontSize: 16, fontWeight: '800' },
  billete: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
  },
  billeteTexto: { color: colors.success, fontWeight: '700' },
  vuelto: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  vueltoMonto: { fontSize: 26, fontWeight: '900', color: colors.success },
  qr: { width: 240, height: 240, borderRadius: radius.md, marginVertical: spacing.sm },
  sinQr: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  yapeMonto: { fontSize: 30, fontWeight: '900', color: colors.yape },
  yapeDato: { color: colors.text, fontSize: 14 },
  yapeNota: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: spacing.sm },
  documentos: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  documento: { flex: 1, alignItems: 'center', padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  documentoActivo: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  documentoTexto: { fontWeight: '800', color: colors.textMuted },
  clienteEncontrado: { color: colors.success, fontWeight: '700', textAlign: 'center', marginTop: spacing.sm },
});
