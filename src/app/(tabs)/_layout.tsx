import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ColorValue } from 'react-native';

import { useStore } from '@/store/useStore';
import { colors } from '@/constants/colors';

type IconName = keyof typeof Ionicons.glyphMap;

const icono =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} size={size - 2} color={color} />;

export default function TabsLayout() {
  const itemsCarrito = useStore((s) => s.carrito.length);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Venta',
          tabBarIcon: icono('scan-outline'),
          tabBarBadge: itemsCarrito > 0 ? itemsCarrito : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent },
        }}
      />
      <Tabs.Screen name="catalogo" options={{ title: 'Catálogo', tabBarIcon: icono('grid-outline') }} />
      <Tabs.Screen name="inventario" options={{ title: 'Inventario', tabBarIcon: icono('cube-outline') }} />
      <Tabs.Screen name="historial" options={{ title: 'Historial', tabBarIcon: icono('receipt-outline') }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes', tabBarIcon: icono('settings-outline') }} />
    </Tabs>
  );
}
