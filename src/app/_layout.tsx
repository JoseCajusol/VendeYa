import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { colors } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

export default function RootLayout() {
  const inicializar = useAppStore((s) => s.inicializar);

  useEffect(() => {
    inicializar();
  }, [inicializar]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="escaner" options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="cobrar" options={{ title: 'Cobrar' }} />
        <Stack.Screen name="producto/[id]" options={{ title: 'Producto' }} />
        <Stack.Screen name="movimiento/[id]" options={{ title: 'Movimiento de stock' }} />
        <Stack.Screen name="venta/[id]" options={{ title: 'Detalle de venta' }} />
        <Stack.Screen name="ajustes" options={{ title: 'Ajustes' }} />
      </Stack>
    </>
  );
}
