import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, EmptyState, Field, ScreenHeader, SectionTitle, Segmented, StatCard } from '@/components/ui';
import { saldoCliente, useStore } from '@/store/useStore';
import { colors, metodoInfo, radius } from '@/constants/colors';
import { ClienteFiado, MetodoPago } from '@/infrastructure/interfaces';
import { dinero, enPeriodo, fechaCorta, horaCorta, parseNumero, Periodo } from '@/utils/format';

type Vista = 'tickets' | 'fiados';

export default function HistorialScreen() {
  const [vista, setVista] = useState<Vista>('tickets');
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Historial" icon="receipt-outline" />
      <View style={{ padding: 12, backgroundColor: colors.surface }}>
        <Segmented
          value={vista}
          onChange={setVista}
          options={[
            { value: 'tickets', label: 'Historial de tickets', icon: 'receipt-outline' },
            { value: 'fiados', label: 'Cuaderno de fiados', icon: 'book-outline' },
          ]}
        />
      </View>
      {vista === 'tickets' ? <Tickets /> : <Fiados />}
    </View>
  );
}

function Tickets() {
  const { ventas, config } = useStore();
  const [periodo, setPeriodo] = useState<Periodo>('hoy');
  const [busqueda, setBusqueda] = useState('');
  const [metodo, setMetodo] = useState<MetodoPago | 'todos'>('todos');
  const m = config.moneda;

  const delPeriodo = useMemo(() => ventas.filter((v) => enPeriodo(v.fecha, periodo)), [ventas, periodo]);
  const total = delPeriodo.reduce((acc, v) => acc + v.total, 0);
  const promedio = delPeriodo.length ? total / delPeriodo.length : 0;

  const desglose = (Object.keys(metodoInfo) as MetodoPago[])
    .map((k) => ({ metodo: k, monto: delPeriodo.filter((v) => v.metodo === k).reduce((a, v) => a + v.total, 0) }))
    .filter((d) => d.monto > 0);

  const lista = delPeriodo.filter(
    (v) =>
      (metodo === 'todos' || v.metodo === metodo) &&
      (v.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
        v.items.some((i) => i.nombre.toLowerCase().includes(busqueda.toLowerCase()))),
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card>
        <SectionTitle icon="calculator-outline" title="Cuadre de caja" />
        <Text style={styles.label}>Venta total acumulada</Text>
        <Text style={styles.big}>{dinero(total, m)}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <StatCard label="Transacciones" value={`${delPeriodo.length} tickets`} icon="swap-horizontal-outline" />
          <StatCard label="Ticket promedio" value={dinero(promedio, m)} icon="trending-up-outline" />
        </View>

        <Text style={[styles.label, { marginTop: 14 }]}>Desglose por método de pago</Text>
        <View style={styles.bar}>
          {desglose.map((d) => (
            <View key={d.metodo} style={{ flex: d.monto, backgroundColor: metodoInfo[d.metodo].color }} />
          ))}
          {desglose.length === 0 && <View style={{ flex: 1, backgroundColor: colors.border }} />}
        </View>
        <View style={styles.legend}>
          {desglose.map((d) => (
            <View key={d.metodo} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: metodoInfo[d.metodo].color }]} />
              <Text style={styles.legendText}>{metodoInfo[d.metodo].label}</Text>
              <Text style={styles.legendValue}>{dinero(d.monto, m)}</Text>
              <Text style={styles.legendPct}>{Math.round((d.monto / total) * 100)}%</Text>
            </View>
          ))}
        </View>
      </Card>

      <Segmented
        value={periodo}
        onChange={setPeriodo}
        options={[
          { value: 'hoy', label: 'Hoy' },
          { value: 'semana', label: 'Semana' },
          { value: 'mes', label: 'Mes' },
          { value: 'todo', label: 'Todo' },
        ]}
      />

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por N° de ticket o producto..."
          placeholderTextColor="#9AA6A2"
          style={{ flex: 1, paddingVertical: 10, color: colors.text }}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label={`Todos (${delPeriodo.length})`} active={metodo === 'todos'} onPress={() => setMetodo('todos')} />
        {(Object.keys(metodoInfo) as MetodoPago[]).map((k) => (
          <Chip key={k} label={metodoInfo[k].label} active={metodo === k} color={metodoInfo[k].color} onPress={() => setMetodo(k)} />
        ))}
      </ScrollView>

      {lista.length === 0 ? (
        <EmptyState icon="receipt-outline" title="Sin ventas" text="Las ventas confirmadas en este periodo aparecerán aquí." />
      ) : (
        lista.map((v) => (
          <Pressable
            key={v.id}
            style={styles.ticket}
            onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: v.id } })}
          >
            <View style={[styles.ticketIcon, { backgroundColor: metodoInfo[v.metodo].color + '1A' }]}>
              <Ionicons name="receipt-outline" size={18} color={metodoInfo[v.metodo].color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.ticketCode}>#{v.codigo}</Text>
                <Text style={[styles.tag, { color: metodoInfo[v.metodo].color }]}>{metodoInfo[v.metodo].label}</Text>
              </View>
              <Text style={styles.meta}>
                {fechaCorta(v.fecha)} {horaCorta(v.fecha)} · {v.items.length} prod.
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {v.items.map((i) => i.nombre).join(', ')}
              </Text>
            </View>
            <Text style={styles.ticketTotal}>{dinero(v.total, m)}</Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function Fiados() {
  const { clientes, config, registrarAbono } = useStore();
  const [abonando, setAbonando] = useState<ClienteFiado | null>(null);
  const [monto, setMonto] = useState('');
  const m = config.moneda;

  const totalPendiente = clientes.reduce((acc, c) => acc + saldoCliente(c), 0);
  const ordenados = [...clientes].sort((a, b) => saldoCliente(b) - saldoCliente(a));

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={styles.fiadoResumen}>
        <Ionicons name="book" size={22} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#E5D8FB', fontSize: 12 }}>Total por cobrar</Text>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>{dinero(totalPendiente, m)}</Text>
        </View>
        <Text style={{ color: '#E5D8FB', fontSize: 12 }}>
          {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}
        </Text>
      </View>

      {ordenados.length === 0 ? (
        <EmptyState
          icon="book-outline"
          title="Cuaderno vacío"
          text="Cuando registres una venta con el método 'Crédito (fiado)', el cliente aparecerá aquí."
        />
      ) : (
        ordenados.map((c) => {
          const saldo = saldoCliente(c);
          const cargos = c.movimientos.filter((x) => x.tipo === 'cargo').reduce((a, x) => a + x.monto, 0);
          const abonos = c.movimientos.filter((x) => x.tipo === 'abono').reduce((a, x) => a + x.monto, 0);
          const ultimo = c.movimientos[c.movimientos.length - 1];
          return (
            <Card key={c.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.avatar}>
                  <Text style={{ color: colors.fiado, fontWeight: '800' }}>{c.nombre.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ticketCode}>{c.nombre}</Text>
                  {ultimo && <Text style={styles.meta}>Último movimiento: {fechaCorta(ultimo.fecha)}</Text>}
                </View>
                {saldo <= 0 && <Text style={[styles.tag, { color: colors.accent }]}>Al día</Text>}
              </View>
              <View style={styles.fiadoRow}>
                <Text style={styles.meta}>Vendido al crédito</Text>
                <Text style={styles.meta}>{dinero(cargos, m)}</Text>
              </View>
              <View style={styles.fiadoRow}>
                <Text style={styles.meta}>Abonado</Text>
                <Text style={styles.meta}>{dinero(abonos, m)}</Text>
              </View>
              <View style={styles.fiadoRow}>
                <Text style={{ fontWeight: '700', color: colors.text }}>Saldo pendiente</Text>
                <Text style={{ fontWeight: '800', color: saldo > 0 ? colors.fiado : colors.accent, fontSize: 16 }}>
                  {dinero(saldo, m)}
                </Text>
              </View>
              {saldo > 0 && (
                <Button label="Registrar abono" icon="cash-outline" variant="fiado" style={{ marginTop: 10 }} onPress={() => setAbonando(c)} />
              )}
            </Card>
          );
        })
      )}

      <Modal visible={!!abonando} transparent animationType="slide" onRequestClose={() => setAbonando(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={() => setAbonando(null)} />
        <View style={styles.sheet}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Registrar abono</Text>
          <Text style={[styles.meta, { marginBottom: 14 }]}>
            {abonando?.nombre} · Debe {abonando ? dinero(saldoCliente(abonando), m) : ''}
          </Text>
          <Field label={`Monto del abono (${m})`} keyboardType="decimal-pad" value={monto} onChangeText={setMonto} placeholder="0.00" />
          <Button
            label="Guardar abono"
            icon="checkmark-circle-outline"
            variant="fiado"
            disabled={!abonando || parseNumero(monto) <= 0 || parseNumero(monto) > saldoCliente(abonando)}
            onPress={() => {
              if (abonando) registrarAbono(abonando.id, parseNumero(monto));
              setMonto('');
              setAbonando(null);
            }}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: colors.textMuted },
  big: { fontSize: 30, fontWeight: '800', color: colors.text },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 8 },
  legend: { marginTop: 10, gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { flex: 1, fontSize: 13, color: colors.text },
  legendValue: { fontSize: 13, fontWeight: '700', color: colors.text },
  legendPct: { width: 40, textAlign: 'right', fontSize: 12, color: colors.textMuted },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
  },
  ticket: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ticketIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  ticketCode: { fontWeight: '700', color: colors.text, fontSize: 14 },
  tag: { fontSize: 11, fontWeight: '700' },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  ticketTotal: { fontWeight: '800', color: colors.text, fontSize: 15 },
  fiadoResumen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.fiado,
    borderRadius: radius.lg,
    padding: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.fiadoLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fiadoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  sheet: {
    backgroundColor: colors.surface,
    padding: 20,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
});
