import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '@/store/useStore';
import { colors, radius } from '@/constants/colors';

type IconName = keyof typeof Ionicons.glyphMap;

/** Encabezado superior de cada pestaña: título, nombre del negocio y acción opcional. */
export function ScreenHeader({ title, icon, right }: { title: string; icon: IconName; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const negocio = useStore((s) => s.config.nombre);
  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <View style={styles.headerIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSub}>
          <View style={styles.dot} />
          <Text style={styles.headerSubText} numberOfLines={1}>
            {negocio} · Caja abierta
          </Text>
        </View>
      </View>
      {right}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'fiado';

export function Button({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  loading,
  style,
  right,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  right?: ReactNode;
}) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border },
        (disabled || loading) && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={v.fg} />}
          <Text style={[styles.buttonText, { color: v.fg }]}>{label}</Text>
          {right}
        </>
      )}
    </Pressable>
  );
}

const buttonVariants: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: '#fff', border: colors.primary },
  secondary: { bg: colors.surface, fg: colors.primary, border: colors.border },
  danger: { bg: colors.surface, fg: colors.danger, border: colors.dangerLight },
  ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  fiado: { bg: colors.fiado, fg: '#fff', border: colors.fiado },
};

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ icon, title, right }: { icon?: IconName; title: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      {icon && <Ionicons name={icon} size={16} color={colors.textMuted} />}
      <Text style={styles.sectionTitleText}>{title}</Text>
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color = colors.primary,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
    >
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  icon,
  right,
  ...props
}: TextInputProps & { label: string; icon?: IconName; right?: ReactNode }) {
  return (
    <View style={{ marginBottom: 12, flex: 1 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldBox}>
        {icon && <Ionicons name={icon} size={18} color={colors.textMuted} />}
        <TextInput placeholderTextColor="#9AA6A2" style={styles.fieldInput} {...props} />
        {right}
      </View>
    </View>
  );
}

export function QtyStepper({
  value,
  onChange,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable hitSlop={8} onPress={() => onChange(Math.round((value - step) * 100) / 100)} style={styles.stepBtn}>
        <Ionicons name="remove" size={16} color={colors.text} />
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable hitSlop={8} onPress={() => onChange(Math.round((value + step) * 100) / 100)} style={styles.stepBtn}>
        <Ionicons name="add" size={16} color={colors.text} />
      </Pressable>
    </View>
  );
}

export function EmptyState({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export function StatCard({
  label,
  value,
  icon,
  color = colors.primary,
}: {
  label: string;
  value: string;
  icon: IconName;
  color?: string;
}) {
  return (
    <View style={styles.stat}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name={icon} size={13} color={color} />
        <Text style={styles.statLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.statValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segment, active && styles.segmentActive]}>
            {o.icon && <Ionicons name={o.icon} size={15} color={active ? colors.primary : colors.textMuted} />}
            <Text style={[styles.segmentText, active && { color: colors.primary }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  headerSub: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerSubText: { fontSize: 12, color: colors.textMuted },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  buttonText: { fontSize: 15, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitleText: { fontSize: 14, fontWeight: '700', color: colors.text },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 12,
  },
  fieldInput: { flex: 1, paddingVertical: 11, fontSize: 15, color: colors.text },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { minWidth: 22, textAlign: 'center', fontWeight: '700', color: colors.text },
  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: { fontSize: 11, color: colors.textMuted },
  statValue: { fontSize: 17, fontWeight: '800', marginTop: 4 },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
});
