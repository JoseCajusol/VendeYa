import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { Pressable, type ColorValue } from 'react-native';

import { useStockBajo } from '@/components/AlertaStock';
import type { IconName } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

type ColorIcono = ComponentProps<typeof Ionicons>['color'];

function icono(name: IconName) {
  return function TabBarIcon({ color, size }: { color: ColorValue; size: number }) {
    // La barra de pestañas siempre entrega colores en texto (#0F766E), así que la conversión es segura
    return <Ionicons name={name} size={size} color={color as ColorIcono} />;
  };
}

export default function TabsLayout() {
  const unidadesCarrito = useAppStore((s) => s.carrito.reduce((t, i) => t + i.cantidad, 0));
  const stockBajo = useStockBajo().length;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
        headerRight: () => (
          <Pressable onPress={() => router.push('/ajustes')} hitSlop={12} style={{ marginRight: 16 }}>
            <Ionicons name="settings-outline" size={22} color="#fff" />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Vender',
          tabBarIcon: icono('cart-outline'),
          tabBarBadge: unidadesCarrito > 0 ? unidadesCarrito : undefined,
        }}
      />
      <Tabs.Screen name="productos" options={{ title: 'Productos', tabBarIcon: icono('pricetags-outline') }} />
      <Tabs.Screen
        name="inventario"
        options={{
          title: 'Inventario',
          tabBarIcon: icono('cube-outline'),
          tabBarBadge: stockBajo > 0 ? stockBajo : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.warning },
        }}
      />
      <Tabs.Screen name="ventas" options={{ title: 'Ventas', tabBarIcon: icono('receipt-outline') }} />
      <Tabs.Screen name="reportes" options={{ title: 'Reportes', tabBarIcon: icono('bar-chart-outline') }} />
    </Tabs>
  );
}
