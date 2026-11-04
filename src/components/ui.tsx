import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Variante = 'primario' | 'secundario' | 'peligro' | 'yape' | 'fantasma';

export function Boton({
  titulo,
  onPress,
  icono,
  variante = 'primario',
  cargando = false,
  deshabilitado = false,
  estilo,
  compacto = false,
}: {
  titulo: string;
  onPress: () => void;
  icono?: IconName;
  variante?: Variante;
  cargando?: boolean;
  deshabilitado?: boolean;
  estilo?: StyleProp<ViewStyle>;
  compacto?: boolean;
}) {
  const fondo = {
    primario: colors.primary,
    secundario: colors.surface,
    peligro: colors.danger,
    yape: colors.yape,
    fantasma: 'transparent',
  }[variante];
  const texto = variante === 'secundario' || variante === 'fantasma' ? colors.primary : '#fff';
  const inactivo = deshabilitado || cargando;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      style={({ pressed }) => [
        styles.boton,
        compacto && styles.botonCompacto,
        { backgroundColor: fondo, opacity: inactivo ? 0.5 : pressed ? 0.85 : 1 },
        variante === 'secundario' && { borderWidth: 1, borderColor: colors.border },
        estilo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={texto} />
      ) : (
        <>
          {icono && <Ionicons name={icono} size={compacto ? 16 : 20} color={texto} />}
          <Text style={[styles.botonTexto, compacto && { fontSize: 14 }, { color: texto }]}>{titulo}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Tarjeta({ children, estilo }: { children: ReactNode; estilo?: StyleProp<ViewStyle> }) {
  return <View style={[styles.tarjeta, estilo]}>{children}</View>;
}

export function Campo({
  etiqueta,
  ayuda,
  error,
  derecha,
  ...props
}: TextInputProps & { etiqueta: string; ayuda?: string; error?: string; derecha?: ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <View style={[styles.inputFila, error ? { borderColor: colors.danger } : null]}>
        <TextInput placeholderTextColor={colors.textMuted} {...props} style={[styles.input, props.style]} />
        {derecha}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : ayuda ? <Text style={styles.ayuda}>{ayuda}</Text> : null}
    </View>
  );
}

export function Buscador({ value, onChangeText, placeholder }: { value: string; onChangeText: (t: string) => void; placeholder: string }) {
  return (
    <View style={styles.buscador}>
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.buscadorInput}
        autoCorrect={false}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10}>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Chip({ texto, activo, onPress, icono }: { texto: string; activo: boolean; onPress: () => void; icono?: IconName }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, activo && styles.chipActivo]}>
      {icono && <Ionicons name={icono} size={14} color={activo ? '#fff' : colors.text} />}
      <Text style={[styles.chipTexto, activo && { color: '#fff' }]}>{texto}</Text>
    </Pressable>
  );
}

export function Kpi({ titulo, valor, icono, color = colors.primary }: { titulo: string; valor: string; icono: IconName; color?: string }) {
  return (
    <View style={styles.kpi}>
      <View style={[styles.kpiIcono, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icono} size={18} color={color} />
      </View>
      <Text style={styles.kpiValor} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
      <Text style={styles.kpiTitulo}>{titulo}</Text>
    </View>
  );
}

export function EstadoVacio({ icono, titulo, mensaje, children }: { icono: IconName; titulo: string; mensaje?: string; children?: ReactNode }) {
  return (
    <View style={styles.vacio}>
      <Ionicons name={icono} size={48} color={colors.textMuted} />
      <Text style={styles.vacioTitulo}>{titulo}</Text>
      {mensaje ? <Text style={styles.vacioMensaje}>{mensaje}</Text> : null}
      {children}
    </View>
  );
}

export function ErrorConexion({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <View style={styles.errorCaja}>
      <Ionicons name="cloud-offline-outline" size={22} color={colors.danger} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.danger, fontWeight: '700' }}>Sin conexión con el servidor</Text>
        <Text style={{ color: colors.text, fontSize: 13, marginTop: 2 }}>{mensaje}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
          <Boton titulo="Reintentar" icono="refresh" compacto onPress={onReintentar} />
          <Boton titulo="Ajustes" icono="settings-outline" compacto variante="secundario" onPress={() => router.push('/ajustes')} />
        </View>
      </View>
    </View>
  );
}

export function Seccion({ titulo, derecha }: { titulo: string; derecha?: ReactNode }) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.seccionTitulo}>{titulo}</Text>
      {derecha}
    </View>
  );
}

export function Insignia({ texto, color, fondo }: { texto: string; color: string; fondo: string }) {
  return (
    <View style={[styles.insignia, { backgroundColor: fondo }]}>
      <Text style={[styles.insigniaTexto, { color }]}>{texto}</Text>
    </View>
  );
}

/** Insignia de stock coloreada según el umbral. */
export function InsigniaStock({ stock, umbral }: { stock: number; umbral: number }) {
  if (stock === 0) return <Insignia texto="Agotado" color={colors.danger} fondo={colors.dangerSoft} />;
  const bajo = stock <= umbral;
  return (
    <Insignia
      texto={bajo ? `¡Quedan ${stock}!` : `Stock: ${stock}`}
      color={bajo ? colors.warning : colors.success}
      fondo={bajo ? colors.warningSoft : colors.successSoft}
    />
  );
}

export function Stepper({ valor, onCambiar, min = 1, max }: { valor: number; onCambiar: (n: number) => void; min?: number; max?: number }) {
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepperBtn} onPress={() => onCambiar(Math.max(min, valor - 1))} hitSlop={6}>
        <Ionicons name="remove" size={18} color={colors.primary} />
      </Pressable>
      <TextInput
        style={styles.stepperInput}
        keyboardType="number-pad"
        value={String(valor)}
        selectTextOnFocus
        onChangeText={(t) => {
          const n = parseInt(t.replace(/\D/g, ''), 10);
          onCambiar(Number.isNaN(n) ? min : n);
        }}
      />
      <Pressable
        style={styles.stepperBtn}
        onPress={() => onCambiar(max !== undefined ? Math.min(max, valor + 1) : valor + 1)}
        hitSlop={6}
      >
        <Ionicons name="add" size={18} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  boton: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  botonCompacto: { minHeight: 36, paddingHorizontal: spacing.md },
  botonTexto: { fontSize: 16, fontWeight: '700' },
  tarjeta: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  etiqueta: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  inputFila: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingRight: spacing.sm,
  },
  input: { flex: 1, minHeight: 46, paddingHorizontal: spacing.md, fontSize: 16, color: colors.text },
  ayuda: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  error: { fontSize: 12, color: colors.danger, marginTop: 4 },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  buscadorInput: { flex: 1, minHeight: 44, fontSize: 15, color: colors.text },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTexto: { fontSize: 13, fontWeight: '600', color: colors.text },
  kpi: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  kpiIcono: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  kpiValor: { fontSize: 20, fontWeight: '800', color: colors.text },
  kpiTitulo: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  vacio: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  vacioTitulo: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  vacioMensaje: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  errorCaja: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    margin: spacing.lg,
    marginBottom: 0,
  },
  seccion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  seccionTitulo: { fontSize: 15, fontWeight: '800', color: colors.text },
  insignia: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  insigniaTexto: { fontSize: 12, fontWeight: '700' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  stepperBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  stepperInput: { width: 46, height: 36, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.text, padding: 0 },
});
