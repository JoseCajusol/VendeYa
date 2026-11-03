import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/constants/colors';

const TIPOS = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] as const;

/**
 * Lector de códigos de barras con la cámara trasera.
 * Evita lecturas repetidas del mismo código durante 1.5 s.
 */
export function BarcodeScanner({
  onScan,
  activo,
  alto = 170,
}: {
  onScan: (codigo: string) => void;
  activo: boolean;
  alto?: number;
}) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [pausado, setPausado] = useState(false);
  const [linterna, setLinterna] = useState(false);
  const ultimo = useRef({ codigo: '', t: 0 });

  const manejarLectura = (codigo: string) => {
    const ahora = Date.now();
    if (ultimo.current.codigo === codigo && ahora - ultimo.current.t < 1500) return;
    ultimo.current = { codigo, t: ahora };
    onScan(codigo);
  };

  if (!permiso?.granted) {
    return (
      <View style={[styles.box, styles.center, { height: alto }]}>
        <Ionicons name="camera-outline" size={28} color="#fff" />
        <Text style={styles.msg}>Permite el acceso a la cámara para escanear productos</Text>
        <Pressable style={styles.permBtn} onPress={pedirPermiso}>
          <Text style={styles.permText}>Permitir cámara</Text>
        </Pressable>
      </View>
    );
  }

  const mostrarCamara = activo && !pausado;

  return (
    <View style={[styles.box, { height: alto }]}>
      {mostrarCamara ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={linterna}
          barcodeScannerSettings={{ barcodeTypes: [...TIPOS] }}
          onBarcodeScanned={({ data }) => manejarLectura(data)}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Ionicons name="videocam-off-outline" size={26} color="#9AA6A2" />
          <Text style={styles.msg}>Cámara en pausa</Text>
          <Text style={styles.msgSmall}>Presiona el botón para reanudar</Text>
        </View>
      )}

      <View style={styles.badge}>
        <View style={[styles.badgeDot, { backgroundColor: mostrarCamara ? colors.accent : colors.warning }]} />
        <Text style={styles.badgeText}>{mostrarCamara ? 'Cámara lista para escanear' : 'En pausa'}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={() => setLinterna((v) => !v)}>
          <Ionicons name={linterna ? 'flash' : 'flash-off'} size={16} color="#fff" />
        </Pressable>
        <Pressable style={styles.action} onPress={() => setPausado((v) => !v)}>
          <Ionicons name={pausado ? 'play' : 'pause'} size={16} color="#fff" />
        </Pressable>
      </View>

      {mostrarCamara && (
        <>
          <View style={styles.frame} pointerEvents="none" />
          <Text style={styles.hint}>Alinea el código de barras en el marco</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#1E2623',
  },
  center: { alignItems: 'center', justifyContent: 'center', padding: 16, gap: 6 },
  msg: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  msgSmall: { color: '#9AA6A2', fontSize: 12 },
  permBtn: {
    marginTop: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  permText: { color: '#fff', fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  actions: { position: 'absolute', top: 8, right: 8, gap: 8 },
  action: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    top: '32%',
    bottom: '26%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: radius.md,
  },
  hint: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    color: '#fff',
    fontSize: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
});
