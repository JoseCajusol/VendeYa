import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/colors';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          headerStyle: { backgroundColor: colors.surface },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="orden" options={{ title: 'Revisar Orden' }} />
        <Stack.Screen name="producto/[id]" options={{ title: 'Producto' }} />
        <Stack.Screen name="ticket/[id]" options={{ title: 'Ticket de venta' }} />
      </Stack>
    </>
  );
}
