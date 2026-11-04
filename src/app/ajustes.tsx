import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Boton, Campo, Tarjeta } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { api, mensajeError, urlPorDefecto } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import type { Configuracion } from '@/types';

function formDesde(config: Configuracion | null) {
  return {
    nombre_negocio: config?.nombre_negocio ?? '',
    ruc: config?.ruc ?? '',
    direccion: config?.direccion ?? '',
    telefono: config?.telefono ?? '',
    yape_numero: config?.yape_numero ?? '',
    yape_titular: config?.yape_titular ?? '',
    umbral_stock: String(config?.umbral_stock ?? 5),
  };
}

export default function AjustesScreen() {
  const config = useAppStore((s) => s.config);
  const apiUrl = useAppStore((s) => s.apiUrl);
  const errorConexion = useAppStore((s) => s.errorConexion);
  const cambiarApiUrl = useAppStore((s) => s.cambiarApiUrl);
  const setConfig = useAppStore((s) => s.setConfig);

  const [url, setUrl] = useState(apiUrl);
  const [probando, setProbando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [subiendoQr, setSubiendoQr] = useState(false);
  const [form, setForm] = useState(() => formDesde(config));

  // Si la configuración llega o cambia desde el servidor, refrescar el formulario
  const [configPrevia, setConfigPrevia] = useState(config);
  if (config !== configPrevia) {
    setConfigPrevia(config);
    setForm(formDesde(config));
  }

  const set = (campo: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [campo]: v }));

  const probarConexion = async () => {
    setProbando(true);
    await cambiarApiUrl(url);
    setProbando(false);
    const err = useAppStore.getState().errorConexion;
    if (err) Alert.alert('Sin conexión', err);
    else Alert.alert('¡Conectado!', 'La app se conectó correctamente al servidor de XAMPP.');
  };

  const guardar = async () => {
    if (!form.nombre_negocio.trim()) return Alert.alert('Datos', 'Escribe el nombre de tu negocio.');
    const umbral = parseInt(form.umbral_stock, 10);
    if (!Number.isInteger(umbral) || umbral < 0) return Alert.alert('Datos', 'El aviso de stock debe ser un número entero.');
    setGuardando(true);
    try {
      setConfig(
        await api.guardarConfig({
          nombre_negocio: form.nombre_negocio.trim(),
          ruc: form.ruc.trim() || null,
          direccion: form.direccion.trim() || null,
          telefono: form.telefono.trim() || null,
          yape_numero: form.yape_numero.trim() || null,
          yape_titular: form.yape_titular.trim() || null,
          umbral_stock: umbral,
        }),
      );
      Alert.alert('Guardado', 'Los datos del negocio se actualizaron.');
    } catch (e) {
      Alert.alert('No se pudo guardar', mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const elegirQr = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return Alert.alert('Permiso', 'Necesitamos acceso a tus fotos para elegir la imagen del QR.');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (r.canceled || !r.assets?.[0]) return;
    const asset = r.assets[0];
    setSubiendoQr(true);
    try {
      setConfig(await api.subirQrYape(asset.uri, asset.mimeType ?? 'image/jpeg'));
      Alert.alert('QR guardado', 'Ahora se mostrará al cobrar con Yape.');
    } catch (e) {
      Alert.alert('No se pudo subir el QR', mensajeError(e));
    } finally {
      setSubiendoQr(false);
    }
  };

  const quitarQr = () =>
    Alert.alert('Quitar QR', '¿Quitar la imagen del QR de Yape?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          try {
            setConfig(await api.quitarQrYape());
          } catch (e) {
            Alert.alert('Error', mensajeError(e));
          }
        },
      },
    ]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Tarjeta>
          <Titulo icono="server-outline" texto="Conexión con el servidor (XAMPP)" />
          <View style={[styles.estado, { backgroundColor: errorConexion ? colors.dangerSoft : colors.successSoft }]}>
            <Ionicons name={errorConexion ? 'close-circle' : 'checkmark-circle'} size={18} color={errorConexion ? colors.danger : colors.success} />
            <Text style={{ color: errorConexion ? colors.danger : colors.success, fontWeight: '700' }}>
              {errorConexion ? 'Sin conexión' : 'Conectado'}
            </Text>
          </View>
          <Campo
            etiqueta="URL de la API"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            ayuda="Ej: http://192.168.1.50/vendeya/api — usa la IP de tu PC (comando ipconfig)."
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Boton titulo="Guardar y probar" icono="flash-outline" cargando={probando} onPress={probarConexion} estilo={{ flex: 1 }} />
            <Boton titulo="Por defecto" variante="secundario" onPress={() => setUrl(urlPorDefecto())} />
          </View>
        </Tarjeta>

        <Tarjeta>
          <Titulo icono="storefront-outline" texto="Datos del negocio" />
          <Campo etiqueta="Nombre del negocio *" value={form.nombre_negocio} onChangeText={set('nombre_negocio')} />
          <Campo etiqueta="RUC" value={form.ruc} onChangeText={set('ruc')} keyboardType="number-pad" maxLength={11} placeholder="Opcional" />
          <Campo etiqueta="Dirección" value={form.direccion} onChangeText={set('direccion')} placeholder="Opcional" />
          <Campo etiqueta="Teléfono" value={form.telefono} onChangeText={set('telefono')} keyboardType="phone-pad" placeholder="Opcional" />
          <Campo
            etiqueta="Avisar cuando el stock llegue a"
            value={form.umbral_stock}
            onChangeText={set('umbral_stock')}
            keyboardType="number-pad"
            ayuda="Se mostrará una alerta para reponer el producto cuando queden estas unidades o menos."
          />
        </Tarjeta>

        <Tarjeta estilo={{ borderColor: colors.yape }}>
          <Titulo icono="qr-code-outline" texto="Pagos con Yape" color={colors.yape} />
          <Campo etiqueta="Número de Yape" value={form.yape_numero} onChangeText={set('yape_numero')} keyboardType="phone-pad" maxLength={15} />
          <Campo etiqueta="Titular" value={form.yape_titular} onChangeText={set('yape_titular')} placeholder="Nombre que aparece en Yape" />
          <Text style={styles.etiqueta}>Código QR de Yape</Text>
          {config?.yape_qr_url ? (
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <Image source={{ uri: config.yape_qr_url }} style={styles.qr} resizeMode="contain" />
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Boton titulo="Cambiar" icono="image-outline" variante="yape" compacto cargando={subiendoQr} onPress={elegirQr} />
                <Boton titulo="Quitar" icono="trash-outline" variante="fantasma" compacto onPress={quitarQr} />
              </View>
            </View>
          ) : (
            <View style={styles.sinQr}>
              <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
                En la app de Yape ve a &quot;Mi QR&quot;, toma una captura de pantalla y súbela aquí.
              </Text>
              <Boton titulo="Subir imagen del QR" icono="cloud-upload-outline" variante="yape" cargando={subiendoQr} onPress={elegirQr} />
            </View>
          )}
        </Tarjeta>

        <Boton titulo="Guardar datos" icono="save-outline" cargando={guardando} onPress={guardar} deshabilitado={!config} />
        <Text style={{ textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>VendeYa v1.0.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Titulo({ icono, texto, color = colors.primary }: { icono: 'server-outline' | 'storefront-outline' | 'qr-code-outline'; texto: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
      <Ionicons name={icono} size={20} color={color} />
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
  },
  etiqueta: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  qr: { width: 200, height: 200, borderRadius: radius.md, backgroundColor: colors.background },
  sinQr: { alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.yapeSoft, borderRadius: radius.md },
});
