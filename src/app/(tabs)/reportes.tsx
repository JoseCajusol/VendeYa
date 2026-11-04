import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GraficoBarras } from '@/components/GraficoBarras';
import { Boton, Chip, ErrorConexion, Insignia, Kpi, Seccion, Tarjeta } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { api, mensajeError } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import type { Periodo, ReporteInventario, ReporteVentas } from '@/types';
import { fechaISO, moneda, moverFecha } from '@/utils/format';
import { compartirReporteInventario, compartirReporteVentas } from '@/utils/pdf';

const PERIODOS: { valor: Periodo; texto: string }[] = [
  { valor: 'diario', texto: 'Diario' },
  { valor: 'semanal', texto: 'Semanal' },
  { valor: 'mensual', texto: 'Mensual' },
  { valor: 'anual', texto: 'Anual' },
];

type Tipo = 'ventas' | 'inventario';

export default function ReportesScreen() {
  const config = useAppStore((s) => s.config);
  const [tipo, setTipo] = useState<Tipo>('ventas');
  const [periodo, setPeriodo] = useState<Periodo>('diario');
  const [fecha, setFecha] = useState(fechaISO());
  const [ventas, setVentas] = useState<ReporteVentas | null>(null);
  const [inventario, setInventario] = useState<ReporteInventario | null>(null);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      if (tipo === 'ventas') setVentas(await api.reporteVentas(periodo, fecha));
      else setInventario(await api.reporteInventario(periodo, fecha));
      setError(null);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }, [tipo, periodo, fecha]);

  // Se recarga al entrar a la pestaña (después de vender, anular o mover stock) y al cambiar filtros
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const reporte = tipo === 'ventas' ? ventas : inventario;
  const esActual = moverFecha(fecha, periodo, 1) > fechaISO();
  const etiqueta = reporte?.rango.periodo === periodo ? reporte.rango.etiqueta : '...';

  const exportar = async () => {
    setExportando(true);
    try {
      if (tipo === 'ventas' && ventas) await compartirReporteVentas(ventas, config);
      if (tipo === 'inventario' && inventario) await compartirReporteInventario(inventario, config);
    } catch (e) {
      Alert.alert('No se pudo generar el PDF', mensajeError(e));
    } finally {
      setExportando(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 }}
      refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} colors={[colors.primary]} />}
    >
      <View style={styles.segmento}>
        {(['ventas', 'inventario'] as Tipo[]).map((t) => (
          <Pressable key={t} style={[styles.segmentoBtn, tipo === t && styles.segmentoActivo]} onPress={() => setTipo(t)}>
            <Ionicons name={t === 'ventas' ? 'cash-outline' : 'cube-outline'} size={18} color={tipo === t ? '#fff' : colors.text} />
            <Text style={[styles.segmentoTexto, tipo === t && { color: '#fff' }]}>{t === 'ventas' ? 'Ventas' : 'Inventario'}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {PERIODOS.map((p) => (
          <Chip
            key={p.valor}
            texto={p.texto}
            activo={periodo === p.valor}
            onPress={() => {
              setPeriodo(p.valor);
              setFecha(fechaISO());
            }}
          />
        ))}
      </View>

      <View style={styles.navFecha}>
        <Pressable onPress={() => setFecha(moverFecha(fecha, periodo, -1))} hitSlop={10} style={styles.flecha}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.navTexto}>{etiqueta}</Text>
        <Pressable onPress={() => !esActual && setFecha(moverFecha(fecha, periodo, 1))} hitSlop={10} style={[styles.flecha, esActual && { opacity: 0.3 }]}>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {error && <ErrorConexion mensaje={error} onReintentar={cargar} />}
      {!reporte && cargando && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />}

      {tipo === 'ventas' && ventas && <VistaVentas r={ventas} />}
      {tipo === 'inventario' && inventario && <VistaInventario r={inventario} />}

      {reporte && (
        <Boton titulo="Exportar / compartir PDF" icono="document-text-outline" cargando={exportando} onPress={exportar} estilo={{ marginTop: spacing.md }} />
      )}
    </ScrollView>
  );
}

function VistaVentas({ r }: { r: ReporteVentas }) {
  const s = r.resumen;
  const totalMetodos = r.por_metodo.reduce((t, m) => t + m.total, 0);
  return (
    <>
      <View style={styles.kpis}>
        <Kpi titulo="Total vendido" valor={moneda(s.total)} icono="cash-outline" />
        <Kpi titulo="N.º de ventas" valor={String(s.ventas)} icono="receipt-outline" color={colors.yape} />
        <Kpi titulo="Ticket promedio" valor={moneda(s.ticket_promedio)} icono="pricetag-outline" color={colors.warning} />
        <Kpi titulo="Ganancia estimada" valor={moneda(s.ganancia)} icono="trending-up-outline" color={colors.success} />
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
        {s.unidades} unidades vendidas{s.anuladas ? ` · ${s.anuladas} ventas anuladas (no se suman)` : ''}
      </Text>

      <Tarjeta>
        <Text style={styles.titulo}>Ventas en el periodo (S/)</Text>
        <GraficoBarras datos={r.serie.map((p) => ({ etiqueta: p.etiqueta, valor: p.total }))} />
      </Tarjeta>

      <Tarjeta>
        <Text style={styles.titulo}>Por método de pago</Text>
        {r.por_metodo.map((m) => {
          const yape = m.metodo === 'YAPE';
          const pct = totalMetodos > 0 ? (m.total / totalMetodos) * 100 : 0;
          return (
            <View key={m.metodo} style={{ marginTop: spacing.md }}>
              <View style={styles.fila}>
                <Text style={{ fontWeight: '700', color: yape ? colors.yape : colors.efectivo }}>
                  {yape ? 'Yape' : 'Efectivo'} · {m.ventas} ventas
                </Text>
                <Text style={{ fontWeight: '800', color: colors.text }}>{moneda(m.total)}</Text>
              </View>
              <View style={styles.barraFondo}>
                <View style={[styles.barra, { width: `${pct}%`, backgroundColor: yape ? colors.yape : colors.efectivo }]} />
              </View>
            </View>
          );
        })}
      </Tarjeta>

      <Seccion titulo="Productos más vendidos" />
      {r.top_productos.length === 0 ? (
        <Text style={{ color: colors.textMuted }}>Sin ventas en este periodo.</Text>
      ) : (
        r.top_productos.map((t, i) => (
          <View key={t.producto_id} style={styles.filaLista}>
            <Text style={styles.posicion}>{i + 1}</Text>
            <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }} numberOfLines={1}>
              {t.nombre}
            </Text>
            <Text style={{ color: colors.textMuted }}>{t.cantidad} uds.</Text>
            <Text style={{ fontWeight: '800', color: colors.text, minWidth: 80, textAlign: 'right' }}>{moneda(t.total)}</Text>
          </View>
        ))
      )}
    </>
  );
}

function VistaInventario({ r }: { r: ReporteInventario }) {
  const s = r.resumen;
  return (
    <>
      <View style={styles.kpis}>
        <Kpi titulo="Valor a costo" valor={moneda(s.valor_costo)} icono="wallet-outline" />
        <Kpi titulo="Valor a precio de venta" valor={moneda(s.valor_venta)} icono="trending-up-outline" color={colors.success} />
        <Kpi titulo="Unidades en stock" valor={String(s.unidades)} icono="cube-outline" color={colors.yape} />
        <Kpi titulo={`Stock bajo (≤ ${r.umbral})`} valor={`${s.stock_bajo} · ${s.agotados} agotados`} icono="warning-outline" color={colors.warning} />
      </View>

      <Tarjeta>
        <Text style={styles.titulo}>Movimientos del periodo</Text>
        <View style={[styles.fila, { marginTop: spacing.md }]}>
          <Movs texto="Entradas" valor={s.entradas} color={colors.success} />
          <Movs texto="Vendidas" valor={s.vendidos} color={colors.warning} />
          <Movs texto="Salidas" valor={s.salidas} color={colors.danger} />
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing.md }}>El stock mostrado es el stock actual de cada producto.</Text>
      </Tarjeta>

      <Seccion titulo={`Por reponer (${r.stock_bajo.length})`} />
      {r.stock_bajo.length === 0 ? (
        <Text style={{ color: colors.textMuted }}>Ningún producto con stock bajo. 👍</Text>
      ) : (
        r.stock_bajo.map((p) => (
          <View key={p.id} style={styles.filaLista}>
            <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }} numberOfLines={1}>
              {p.nombre}
            </Text>
            {p.estado === 'AGOTADO' ? (
              <Insignia texto="Agotado" color={colors.danger} fondo={colors.dangerSoft} />
            ) : (
              <Insignia texto={`Quedan ${p.stock}`} color={colors.warning} fondo={colors.warningSoft} />
            )}
          </View>
        ))
      )}

      <Seccion titulo="Detalle por producto" />
      <View style={[styles.filaLista, { backgroundColor: colors.background }]}>
        <Text style={[styles.cabecera, { flex: 1, width: undefined, textAlign: 'left' }]}>Producto</Text>
        <Text style={styles.cabecera}>Stock</Text>
        <Text style={styles.cabecera}>Entr.</Text>
        <Text style={styles.cabecera}>Vend.</Text>
      </View>
      {r.productos.map((p) => (
        <View key={p.id} style={styles.filaLista}>
          <Text style={{ flex: 1, color: colors.text }} numberOfLines={1}>
            {p.nombre}
          </Text>
          <Text style={[styles.celda, { color: p.estado === 'OK' ? colors.text : p.estado === 'BAJO' ? colors.warning : colors.danger, fontWeight: '800' }]}>
            {p.stock}
          </Text>
          <Text style={styles.celda}>{p.entradas}</Text>
          <Text style={styles.celda}>{p.vendidos}</Text>
        </View>
      ))}
    </>
  );
}

function Movs({ texto, valor, color }: { texto: string; valor: number; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: 22, fontWeight: '900', color }}>{valor}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  segmento: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: 4, borderWidth: 1, borderColor: colors.border },
  segmentoBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: radius.sm },
  segmentoActivo: { backgroundColor: colors.primary },
  segmentoTexto: { fontWeight: '700', color: colors.text },
  navFecha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  flecha: { padding: 4 },
  navTexto: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  titulo: { fontSize: 15, fontWeight: '800', color: colors.text },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barraFondo: { height: 8, borderRadius: 4, backgroundColor: colors.background, marginTop: 6, overflow: 'hidden' },
  barra: { height: 8, borderRadius: 4 },
  filaLista: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  posicion: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '800',
    fontSize: 12,
  },
  cabecera: { fontSize: 12, fontWeight: '700', color: colors.textMuted, width: 48, textAlign: 'right' },
  celda: { width: 48, textAlign: 'right', color: colors.text },
});
