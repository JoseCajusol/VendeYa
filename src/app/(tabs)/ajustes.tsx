import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Button, Card, Field, ScreenHeader, SectionTitle } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { colors, radius } from '@/constants/colors';
import { ConfigNegocio, CuentaDigital } from '@/infrastructure/interfaces';

const MONEDAS = ['S/', '$', '€'];

const elegirImagen = async () => {
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  });
  return resultado.canceled ? undefined : resultado.assets[0].uri;
};

export default function AjustesScreen() {
  const { config, categorias, productos, guardarConfig, agregarCategoria, eliminarCategoria, restablecerDatos } =
    useStore();
  const [form, setForm] = useState<ConfigNegocio>(config);
  const [nuevaCategoria, setNuevaCategoria] = useState('');

  useEffect(() => setForm(config), [config]);

  const set = <K extends keyof ConfigNegocio>(k: K, v: ConfigNegocio[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setCuenta = (k: 'yape' | 'plin', v: Partial<CuentaDigital>) =>
    setForm((f) => ({ ...f, [k]: { ...f[k], ...v } }));

  const hayCambios = JSON.stringify(form) !== JSON.stringify(config);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Ajustes" icon="settings-outline" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Card>
          <SectionTitle icon="storefront-outline" title="Datos del negocio" />
          <View style={styles.logoRow}>
            <Pressable
              style={styles.logo}
              onPress={async () => {
                const uri = await elegirImagen();
                if (uri) set('logoUri', uri);
              }}
            >
              {form.logoUri ? (
                <Image source={{ uri: form.logoUri }} style={styles.logoImg} />
              ) : (
                <Ionicons name="image-outline" size={26} color={colors.textMuted} />
              )}
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.strong}>Logo del negocio</Text>
              <Text style={styles.muted}>Se muestra en los tickets emitidos. Toca para cambiarlo.</Text>
            </View>
          </View>
          <Field label="Nombre del negocio" icon="business-outline" value={form.nombre} onChangeText={(t) => set('nombre', t)} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field label="RUC" keyboardType="number-pad" value={form.ruc} onChangeText={(t) => set('ruc', t)} maxLength={11} />
            <Field label="Teléfono" keyboardType="phone-pad" value={form.telefono} onChangeText={(t) => set('telefono', t)} />
          </View>
          <Field label="Dirección" icon="location-outline" value={form.direccion} onChangeText={(t) => set('direccion', t)} />
          <Field
            label="Mensaje al pie del ticket"
            icon="chatbox-ellipses-outline"
            value={form.mensajeTicket}
            onChangeText={(t) => set('mensajeTicket', t)}
          />
          <Text style={styles.label}>Moneda de caja</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {MONEDAS.map((m) => (
              <Pressable key={m} onPress={() => set('moneda', m)} style={[styles.moneda, form.moneda === m && styles.monedaActiva]}>
                <Text style={[styles.strong, form.moneda === m && { color: '#fff' }]}>{m}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card>
          <SectionTitle icon="wallet-outline" title="Métodos de pago" />
          <Toggle label="Efectivo" value={form.efectivo} onChange={(v) => set('efectivo', v)} />
          <Toggle label="Tarjeta POS" value={form.tarjeta} onChange={(v) => set('tarjeta', v)} />
          <Toggle label="Crédito (fiado)" value={form.fiado} onChange={(v) => set('fiado', v)} />
          {(['yape', 'plin'] as const).map((k) => (
            <View key={k} style={styles.cuenta}>
              <Toggle label={k === 'yape' ? 'Yape' : 'Plin'} value={form[k].activo} onChange={(v) => setCuenta(k, { activo: v })} />
              {form[k].activo && (
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <Pressable
                    style={styles.qr}
                    onPress={async () => {
                      const uri = await elegirImagen();
                      if (uri) setCuenta(k, { qrUri: uri });
                    }}
                  >
                    {form[k].qrUri ? (
                      <Image source={{ uri: form[k].qrUri }} style={styles.logoImg} />
                    ) : (
                      <>
                        <Ionicons name="qr-code-outline" size={22} color={colors.textMuted} />
                        <Text style={{ fontSize: 9, color: colors.textMuted }}>Subir QR</Text>
                      </>
                    )}
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Field label="Número" keyboardType="phone-pad" value={form[k].numero} onChangeText={(t) => setCuenta(k, { numero: t })} />
                    <Field label="Titular" value={form[k].titular} onChangeText={(t) => setCuenta(k, { titular: t })} />
                  </View>
                </View>
              )}
            </View>
          ))}
        </Card>

        <Card>
          <SectionTitle icon="pricetags-outline" title="Categorías de productos" />
          {categorias.map((c) => (
            <View key={c.id} style={styles.catRow}>
              <Ionicons name="folder-outline" size={16} color={colors.textMuted} />
              <Text style={{ flex: 1, color: colors.text }}>{c.nombre}</Text>
              <Text style={styles.muted}>{productos.filter((p) => p.categoriaId === c.id).length} prod.</Text>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  Alert.alert('Eliminar categoría', `¿Eliminar "${c.nombre}"? Sus productos quedarán sin categoría.`, [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: () => eliminarCategoria(c.id) },
                  ])
                }
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </Pressable>
            </View>
          ))}
          <View style={styles.addCat}>
            <TextInput
              value={nuevaCategoria}
              onChangeText={setNuevaCategoria}
              placeholder="Nueva categoría"
              placeholderTextColor="#9AA6A2"
              style={{ flex: 1, paddingVertical: 10, color: colors.text }}
            />
            <Pressable
              style={styles.addBtn}
              onPress={() => {
                if (nuevaCategoria.trim()) agregarCategoria(nuevaCategoria);
                setNuevaCategoria('');
              }}
            >
              <Ionicons name="add" size={18} color="#fff" />
            </Pressable>
          </View>
        </Card>

        <Card>
          <SectionTitle icon="construct-outline" title="Avanzado" />
          <Button
            label="Restablecer datos de ejemplo"
            icon="refresh-outline"
            variant="danger"
            onPress={() =>
              Alert.alert('Restablecer datos', 'Se borrarán ventas, fiados y cambios del inventario. ¿Continuar?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Restablecer', style: 'destructive', onPress: restablecerDatos },
              ])
            }
          />
          <Text style={[styles.muted, { marginTop: 10, textAlign: 'center' }]}>VendeYa v1.0.0 · Datos guardados en el dispositivo</Text>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Guardar configuración"
          icon="save-outline"
          disabled={!hayCambios || !form.nombre.trim()}
          onPress={() => {
            guardarConfig(form);
            Alert.alert('Listo', 'La configuración se guardó correctamente.');
          }}
        />
      </View>
    </View>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent }} />
    </View>
  );
}

const styles = StyleSheet.create({
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: { width: '100%', height: '100%' },
  strong: { fontWeight: '700', color: colors.text },
  muted: { fontSize: 12, color: colors.textMuted },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  moneda: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monedaActiva: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  cuenta: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 6 },
  qr: {
    width: 76,
    height: 76,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  addCat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingLeft: 12,
    paddingRight: 6,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { padding: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
