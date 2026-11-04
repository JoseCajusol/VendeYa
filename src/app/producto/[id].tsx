import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Boton, Campo, Chip, InsigniaStock, Tarjeta } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { api, mensajeError } from '@/services/api';
import { useAppStore, useUmbral } from '@/store/useAppStore';
import type { Producto } from '@/types';
import { aNumero, moneda } from '@/utils/format';

const UNIDADES = ['unidad', 'paquete', 'bolsa', 'botella', 'lata', 'caja', 'kg', 'litro'];

function formDesde(p?: Producto | null, codigo?: string) {
  return {
    codigo_barras: p?.codigo_barras ?? codigo ?? '',
    nombre: p?.nombre ?? '',
    descripcion: p?.descripcion ?? '',
    categoria_id: p?.categoria_id ?? (null as number | null),
    precio_compra: p?.precio_compra ? String(p.precio_compra) : '',
    precio_venta: p ? String(p.precio_venta) : '',
    unidad: p?.unidad ?? 'unidad',
    stock: p ? String(p.stock) : '',
  };
}

export default function ProductoFormScreen() {
  const { id, codigo } = useLocalSearchParams<{ id: string; codigo?: string }>();
  const esNuevo = id === 'nuevo';
  const productos = useAppStore((s) => s.productos);
  const categorias = useAppStore((s) => s.categorias);
  const datosCambiaron = useAppStore((s) => s.datosCambiaron);
  const cargarCategorias = useAppStore((s) => s.cargarCategorias);
  const codigoEscaneado = useAppStore((s) => s.codigoEscaneado);
  const setCodigoEscaneado = useAppStore((s) => s.setCodigoEscaneado);
  const umbral = useUmbral();

  // Se lee del store: así el stock mostrado se actualiza solo tras ventas y movimientos
  const productoLocal = esNuevo ? undefined : productos.find((p) => p.id === Number(id));
  const [productoRemoto, setProductoRemoto] = useState<Producto | null>(null);
  const producto = productoLocal ?? productoRemoto;
  const [form, setForm] = useState(() => formDesde(productoLocal, codigo));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState<string | null>(null);

  // Si el producto no estaba en memoria, traerlo del servidor
  const faltaCargar = !esNuevo && !productoLocal;
  useEffect(() => {
    if (!faltaCargar) return;
    api
      .producto(Number(id))
      .then((p) => {
        setProductoRemoto(p);
        setForm(formDesde(p));
      })
      .catch((e) => Alert.alert('Error', mensajeError(e)));
  }, [faltaCargar, id]);

  // Recibir el código leído por el escáner
  useFocusEffect(
    useCallback(() => {
      if (codigoEscaneado) {
        setForm((f) => ({ ...f, codigo_barras: codigoEscaneado }));
        setCodigoEscaneado(null);
      }
    }, [codigoEscaneado, setCodigoEscaneado]),
  );

  const set = (campo: keyof typeof form) => (valor: string) => setForm((f) => ({ ...f, [campo]: valor }));

  const compra = aNumero(form.precio_compra);
  const venta = aNumero(form.precio_venta);
  const margen = Number.isFinite(compra) && Number.isFinite(venta) && compra > 0 ? ((venta - compra) / compra) * 100 : null;

  const validar = () => {
    const e: Record<string, string> = {};
    if (!form.nombre.trim()) e.nombre = 'Escribe el nombre del producto.';
    if (!Number.isFinite(venta) || venta <= 0) e.precio_venta = 'Ingresa un precio de venta válido.';
    if (form.precio_compra.trim() && (!Number.isFinite(compra) || compra < 0)) e.precio_compra = 'Precio de compra inválido.';
    if (Number.isFinite(compra) && Number.isFinite(venta) && compra > venta) e.precio_venta = 'El precio de venta es menor que el de compra.';
    if (esNuevo && form.stock.trim() && !/^\d+$/.test(form.stock.trim())) e.stock = 'El stock debe ser un número entero.';
    const repetido = productos.find((p) => form.codigo_barras.trim() && p.codigo_barras === form.codigo_barras.trim() && p.id !== producto?.id);
    if (repetido) e.codigo_barras = `Este código ya pertenece a "${repetido.nombre}".`;
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    const datos = {
      codigo_barras: form.codigo_barras.trim() || null,
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      categoria_id: form.categoria_id,
      precio_compra: Number.isFinite(compra) ? compra : 0,
      precio_venta: venta,
      unidad: form.unidad,
      ...(esNuevo ? { stock: form.stock.trim() ? parseInt(form.stock, 10) : 0 } : {}),
    };
    try {
      const guardado = esNuevo ? await api.crearProducto(datos) : await api.actualizarProducto(Number(id), datos);
      await datosCambiaron();
      router.back();
      if (esNuevo && codigo) {
        Alert.alert('Producto registrado', `¿Agregar "${guardado.nombre}" al carrito?`, [
          { text: 'No', style: 'cancel' },
          {
            text: 'Agregar',
            onPress: () => {
              const r = useAppStore.getState().agregarAlCarrito(guardado, 1);
              if (!r.ok) Alert.alert('No se pudo agregar', r.mensaje);
            },
          },
        ]);
      }
    } catch (e) {
      Alert.alert('No se pudo guardar', mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = () =>
    Alert.alert('Eliminar producto', `¿Eliminar "${form.nombre}"? Si tiene ventas, se ocultará pero se conservará el historial.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.eliminarProducto(Number(id));
            useAppStore.getState().quitarDelCarrito(Number(id));
            await datosCambiaron();
            router.back();
          } catch (e) {
            Alert.alert('No se pudo eliminar', mensajeError(e));
          }
        },
      },
    ]);

  const crearCategoria = async () => {
    const nombre = (nuevaCategoria ?? '').trim();
    if (!nombre) return setNuevaCategoria(null);
    try {
      const c = await api.crearCategoria(nombre);
      await cargarCategorias();
      setForm((f) => ({ ...f, categoria_id: c.id }));
      setNuevaCategoria(null);
    } catch (e) {
      Alert.alert('No se pudo crear la categoría', mensajeError(e));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Stack.Screen options={{ title: esNuevo ? 'Nuevo producto' : 'Editar producto' }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Tarjeta>
          <Campo
            etiqueta="Código de barras"
            placeholder="Escanéalo o escríbelo"
            value={form.codigo_barras}
            onChangeText={set('codigo_barras')}
            keyboardType="number-pad"
            error={errores.codigo_barras}
            ayuda="Opcional. Si el producto no tiene código, podrás buscarlo por nombre al vender."
            derecha={
              <Pressable
                style={styles.botonEscanear}
                onPress={() => router.push({ pathname: '/escaner', params: { modo: 'codigo' } })}
              >
                <Ionicons name="barcode-outline" size={22} color="#fff" />
              </Pressable>
            }
          />
          <Campo etiqueta="Nombre *" placeholder="Ej: Gaseosa 500 ml" value={form.nombre} onChangeText={set('nombre')} error={errores.nombre} />
          <Campo etiqueta="Descripción" placeholder="Opcional" value={form.descripcion} onChangeText={set('descripcion')} />

          <Text style={styles.etiqueta}>Categoría</Text>
          <View style={styles.chips}>
            <Chip texto="Sin categoría" activo={form.categoria_id === null} onPress={() => setForm((f) => ({ ...f, categoria_id: null }))} />
            {categorias.map((c) => (
              <Chip key={c.id} texto={c.nombre} activo={form.categoria_id === c.id} onPress={() => setForm((f) => ({ ...f, categoria_id: c.id }))} />
            ))}
            {nuevaCategoria === null && <Chip texto="Nueva" icono="add" activo={false} onPress={() => setNuevaCategoria('')} />}
          </View>
          {nuevaCategoria !== null && (
            <View style={styles.nuevaCategoria}>
              <TextInput
                autoFocus
                value={nuevaCategoria}
                onChangeText={setNuevaCategoria}
                placeholder="Nombre de la categoría"
                placeholderTextColor={colors.textMuted}
                style={styles.nuevaCategoriaInput}
                onSubmitEditing={crearCategoria}
              />
              <Boton titulo="Crear" compacto onPress={crearCategoria} />
            </View>
          )}
        </Tarjeta>

        <Tarjeta>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Campo
                etiqueta="Precio de compra"
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={form.precio_compra}
                onChangeText={set('precio_compra')}
                error={errores.precio_compra}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Campo
                etiqueta="Precio de venta *"
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={form.precio_venta}
                onChangeText={set('precio_venta')}
                error={errores.precio_venta}
              />
            </View>
          </View>
          {margen !== null && Number.isFinite(margen) && (
            <Text style={{ color: margen >= 0 ? colors.success : colors.danger, marginTop: -4, marginBottom: spacing.md }}>
              Ganancia por unidad: {moneda(venta - compra)} ({margen.toFixed(0)}%)
            </Text>
          )}

          <Text style={styles.etiqueta}>Unidad de venta</Text>
          <View style={styles.chips}>
            {UNIDADES.map((u) => (
              <Chip key={u} texto={u} activo={form.unidad === u} onPress={() => setForm((f) => ({ ...f, unidad: u }))} />
            ))}
          </View>
        </Tarjeta>

        <Tarjeta>
          {esNuevo ? (
            <Campo
              etiqueta="Stock inicial"
              placeholder="0"
              keyboardType="number-pad"
              value={form.stock}
              onChangeText={set('stock')}
              error={errores.stock}
              ayuda={`Te avisaremos cuando queden ${umbral} unidades o menos.`}
            />
          ) : (
            producto && (
              <View style={{ gap: spacing.sm }}>
                <Text style={styles.etiqueta}>Stock actual</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text }}>{producto.stock}</Text>
                  <InsigniaStock stock={producto.stock} umbral={umbral} />
                </View>
                <Boton
                  titulo="Registrar entrada / ajustar stock"
                  icono="swap-vertical"
                  variante="secundario"
                  onPress={() => router.push({ pathname: '/movimiento/[id]', params: { id: String(producto.id) } })}
                />
              </View>
            )
          )}
        </Tarjeta>

        <Boton titulo={esNuevo ? 'Registrar producto' : 'Guardar cambios'} icono="save-outline" cargando={guardando} onPress={guardar} />
        {!esNuevo && <Boton titulo="Eliminar producto" icono="trash-outline" variante="fantasma" onPress={eliminar} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  etiqueta: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  botonEscanear: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 6 },
  nuevaCategoria: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  nuevaCategoriaInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    color: colors.text,
  },
});
