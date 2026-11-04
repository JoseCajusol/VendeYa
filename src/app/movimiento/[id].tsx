import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Boton, Campo, Chip, EstadoVacio, InsigniaStock, Seccion, Tarjeta, type IconName } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { api, mensajeError } from '@/services/api';
import { useAppStore, useUmbral } from '@/store/useAppStore';
import type { Movimiento, TipoMovimiento } from '@/types';
import { aNumero, fechaHora } from '@/utils/format';

type TipoManual = 'ENTRADA' | 'SALIDA' | 'AJUSTE';

const TIPOS: { tipo: TipoManual; titulo: string; icono: IconName; color: string; ayuda: string }[] = [
  { tipo: 'ENTRADA', titulo: 'Entrada', icono: 'arrow-down-circle-outline', color: colors.success, ayuda: 'Compraste mercadería: suma al stock.' },
  { tipo: 'SALIDA', titulo: 'Salida', icono: 'arrow-up-circle-outline', color: colors.danger, ayuda: 'Merma, vencido o consumo: resta del stock.' },
  { tipo: 'AJUSTE', titulo: 'Ajuste', icono: 'create-outline', color: colors.primary, ayuda: 'Contaste el stock real: queda exactamente ese número.' },
];

const MOTIVOS: Record<TipoManual, string[]> = {
  ENTRADA: ['Compra a proveedor', 'Devolución de cliente'],
  SALIDA: ['Producto vencido', 'Producto dañado', 'Consumo interno'],
  AJUSTE: ['Conteo físico'],
};

const ESTILO_MOV: Record<TipoMovimiento, { texto: string; color: string }> = {
  ENTRADA: { texto: 'Entrada', color: colors.success },
  SALIDA: { texto: 'Salida', color: colors.danger },
  AJUSTE: { texto: 'Ajuste', color: colors.primary },
  VENTA: { texto: 'Venta', color: colors.warning },
  ANULACION: { texto: 'Anulación', color: colors.yape },
};

export default function MovimientoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productoId = Number(id);
  const producto = useAppStore((s) => s.productos.find((p) => p.id === productoId));
  const datosCambiaron = useAppStore((s) => s.datosCambiaron);
  const umbral = useUmbral();

  const [tipo, setTipo] = useState<TipoManual>('ENTRADA');
  const [cantidad, setCantidad] = useState('');
  const [precioCompra, setPrecioCompra] = useState('');
  const [motivo, setMotivo] = useState(MOTIVOS.ENTRADA[0]);
  const [guardando, setGuardando] = useState(false);
  const [movimientos, setMovimientos] = useState<Movimiento[] | null>(null);

  const cargarKardex = useCallback(async () => {
    try {
      setMovimientos(await api.movimientos({ producto_id: productoId }));
    } catch {
      setMovimientos([]);
    }
  }, [productoId]);

  useFocusEffect(
    useCallback(() => {
      cargarKardex();
    }, [cargarKardex]),
  );

  if (!producto) {
    return (
      <EstadoVacio icono="cube-outline" titulo="Producto no encontrado">
        <Boton titulo="Volver" onPress={() => router.back()} />
      </EstadoVacio>
    );
  }

  const n = cantidad.trim() ? parseInt(cantidad, 10) : NaN;
  const valido = Number.isInteger(n) && (tipo === 'AJUSTE' ? n >= 0 : n > 0);
  const stockNuevo = !valido ? null : tipo === 'ENTRADA' ? producto.stock + n : tipo === 'SALIDA' ? producto.stock - n : n;
  const info = TIPOS.find((t) => t.tipo === tipo)!;

  const cambiarTipo = (t: TipoManual) => {
    setTipo(t);
    setMotivo(MOTIVOS[t][0]);
    setCantidad('');
  };

  const guardar = async () => {
    if (!valido || stockNuevo === null) return Alert.alert('Cantidad', 'Ingresa una cantidad válida.');
    if (stockNuevo < 0) return Alert.alert('Stock insuficiente', `Solo hay ${producto.stock} unidades.`);
    const pc = aNumero(precioCompra);
    setGuardando(true);
    try {
      await api.registrarMovimiento({
        producto_id: productoId,
        tipo,
        cantidad: n,
        motivo: motivo.trim() || undefined,
        precio_compra: tipo === 'ENTRADA' && Number.isFinite(pc) ? pc : undefined,
      });
      await Promise.all([datosCambiaron(), cargarKardex()]);
      setCantidad('');
      setPrecioCompra('');
      Alert.alert('Listo', `Stock actualizado: ${stockNuevo} ${producto.unidad}.`);
    } catch (e) {
      Alert.alert('No se pudo registrar', mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
        <Tarjeta>
          <Text style={styles.nombre}>{producto.nombre}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 6 }}>
            <Text style={styles.stock}>{producto.stock}</Text>
            <Text style={{ color: colors.textMuted }}>{producto.unidad} en stock</Text>
            <View style={{ flex: 1 }} />
            <InsigniaStock stock={producto.stock} umbral={umbral} />
          </View>
          <Pressable onPress={() => router.push({ pathname: '/producto/[id]', params: { id: String(producto.id) } })}>
            <Text style={{ color: colors.primary, fontWeight: '600', marginTop: spacing.sm }}>Editar datos del producto</Text>
          </Pressable>
        </Tarjeta>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {TIPOS.map((t) => (
            <Pressable
              key={t.tipo}
              onPress={() => cambiarTipo(t.tipo)}
              style={[styles.tipo, tipo === t.tipo && { borderColor: t.color, backgroundColor: t.color + '14' }]}
            >
              <Ionicons name={t.icono} size={24} color={tipo === t.tipo ? t.color : colors.textMuted} />
              <Text style={{ fontWeight: '700', color: tipo === t.tipo ? t.color : colors.text }}>{t.titulo}</Text>
            </Pressable>
          ))}
        </View>

        <Tarjeta>
          <Text style={{ color: colors.textMuted, marginBottom: spacing.md }}>{info.ayuda}</Text>
          <Campo
            etiqueta={tipo === 'AJUSTE' ? 'Stock real contado' : 'Cantidad'}
            placeholder="0"
            keyboardType="number-pad"
            value={cantidad}
            onChangeText={(t) => setCantidad(t.replace(/\D/g, ''))}
          />
          {tipo === 'ENTRADA' && (
            <Campo
              etiqueta="Nuevo precio de compra (opcional)"
              placeholder={producto.precio_compra.toFixed(2)}
              keyboardType="decimal-pad"
              value={precioCompra}
              onChangeText={setPrecioCompra}
            />
          )}
          <Text style={styles.etiqueta}>Motivo</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm }}>
            {MOTIVOS[tipo].map((m) => (
              <Chip key={m} texto={m} activo={motivo === m} onPress={() => setMotivo(m)} />
            ))}
          </View>
          <Campo etiqueta="Otro motivo" placeholder="Escribe un motivo" value={motivo} onChangeText={setMotivo} />

          {stockNuevo !== null && (
            <View style={styles.preview}>
              <Text style={{ color: colors.text }}>Stock: {producto.stock}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
              <Text style={{ fontWeight: '900', fontSize: 18, color: stockNuevo < 0 ? colors.danger : stockNuevo <= umbral ? colors.warning : colors.success }}>
                {stockNuevo}
              </Text>
            </View>
          )}
          <Boton titulo="Registrar movimiento" icono="checkmark" cargando={guardando} deshabilitado={!valido} onPress={guardar} />
        </Tarjeta>

        <Seccion titulo="Historial de movimientos (kardex)" />
        {movimientos === null ? (
          <Text style={{ color: colors.textMuted }}>Cargando...</Text>
        ) : movimientos.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>Sin movimientos todavía.</Text>
        ) : (
          movimientos.map((m) => {
            const e = ESTILO_MOV[m.tipo];
            return (
              <View key={m.id} style={styles.mov}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: e.color }}>{e.texto}</Text>
                  <Text style={styles.movDetalle}>
                    {fechaHora(m.fecha)}
                    {m.motivo ? ` · ${m.motivo}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: '800', color: m.cantidad >= 0 ? colors.success : colors.danger }}>
                    {m.cantidad >= 0 ? '+' : ''}
                    {m.cantidad}
                  </Text>
                  <Text style={styles.movDetalle}>
                    {m.stock_anterior} → {m.stock_nuevo}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  nombre: { fontSize: 18, fontWeight: '800', color: colors.text },
  stock: { fontSize: 32, fontWeight: '900', color: colors.text },
  etiqueta: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  tipo: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  mov: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  movDetalle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
