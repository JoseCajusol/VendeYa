import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { Configuracion, ReporteInventario, ReporteVentas, Venta } from '@/types';
import { fechaCorta, fechaHora, moneda } from '@/utils/format';

const esc = (s: string | number | null | undefined) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const ESTILOS = `
  body { font-family: Helvetica, Arial, sans-serif; color: #0F172A; padding: 24px; font-size: 12px; }
  h1 { font-size: 20px; margin: 0; color: #0F766E; }
  h2 { font-size: 14px; margin: 22px 0 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; }
  .muted { color: #64748B; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; background: #F1F5F9; padding: 6px; font-size: 11px; }
  td { padding: 6px; border-bottom: 1px solid #F1F5F9; }
  .r { text-align: right; }
  .kpis { display: flex; flex-wrap: wrap; gap: 8px; }
  .kpi { border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 12px; min-width: 120px; }
  .kpi b { display: block; font-size: 16px; margin-top: 2px; }
  .bajo { color: #B45309; font-weight: bold; }
  .agotado { color: #DC2626; font-weight: bold; }
  .total { font-size: 16px; font-weight: bold; }
`;

function cabecera(config: Configuracion | null, titulo: string, subtitulo: string) {
  return `
    <h1>${esc(config?.nombre_negocio ?? 'VendeYa')}</h1>
    <div class="muted">${[config?.ruc && `RUC ${config.ruc}`, config?.direccion, config?.telefono && `Tel. ${config.telefono}`]
      .filter(Boolean)
      .map(esc)
      .join(' · ')}</div>
    <h2 style="border:none;margin-top:16px">${esc(titulo)}</h2>
    <div class="muted">${esc(subtitulo)}</div>`;
}

async function compartirHtml(html: string, titulo: string) {
  const { uri } = await Print.printToFileAsync({ html: `<html><head><meta charset="utf-8"><style>${ESTILOS}</style></head><body>${html}</body></html>` });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: titulo, UTI: 'com.adobe.pdf' });
  } else {
    await Print.printAsync({ uri });
  }
}

export function compartirTicket(venta: Venta, config: Configuracion | null) {
  const filas = (venta.items ?? [])
    .map(
      (i) => `<tr><td>${esc(i.nombre_producto)}</td><td class="r">${i.cantidad}</td>
        <td class="r">${moneda(i.precio_unitario)}</td><td class="r">${moneda(i.subtotal)}</td></tr>`,
    )
    .join('');
  const pago =
    venta.metodo_pago === 'EFECTIVO'
      ? `Efectivo · Recibido ${moneda(venta.monto_recibido ?? venta.total)} · Vuelto ${moneda(venta.vuelto ?? 0)}`
      : 'Yape';
  const html = `
    ${cabecera(config, `Ticket de venta ${venta.codigo}`, fechaHora(venta.fecha))}
    ${venta.estado === 'ANULADA' ? '<p class="agotado">VENTA ANULADA</p>' : ''}
    <table style="margin-top:12px"><tr><th>Producto</th><th class="r">Cant.</th><th class="r">P. unit.</th><th class="r">Subtotal</th></tr>${filas}</table>
    <p class="r total">TOTAL: ${moneda(venta.total)}</p>
    <p>Método de pago: ${esc(pago)}</p>
    <p class="muted" style="text-align:center;margin-top:24px">¡Gracias por su compra!</p>`;
  return compartirHtml(html, `Ticket ${venta.codigo}`);
}

const NOMBRE_PERIODO = { diario: 'diario', semanal: 'semanal', mensual: 'mensual', anual: 'anual' };

export function compartirReporteVentas(r: ReporteVentas, config: Configuracion | null) {
  const s = r.resumen;
  const metodos = r.por_metodo
    .map((m) => `<tr><td>${m.metodo === 'YAPE' ? 'Yape' : 'Efectivo'}</td><td class="r">${m.ventas}</td><td class="r">${moneda(m.total)}</td></tr>`)
    .join('');
  const top = r.top_productos.length
    ? r.top_productos
        .map((t, i) => `<tr><td>${i + 1}. ${esc(t.nombre)}</td><td class="r">${t.cantidad}</td><td class="r">${moneda(t.total)}</td></tr>`)
        .join('')
    : '<tr><td colspan="3" class="muted">Sin ventas en este periodo</td></tr>';
  const detalle = r.serie
    .filter((p) => p.ventas > 0)
    .map((p) => `<tr><td>${esc(p.etiqueta)}</td><td class="r">${p.ventas}</td><td class="r">${moneda(p.total)}</td></tr>`)
    .join('');
  const html = `
    ${cabecera(config, `Reporte ${NOMBRE_PERIODO[r.rango.periodo]} de ventas`, `${r.rango.etiqueta} (${fechaCorta(r.rango.desde)} – ${fechaCorta(r.rango.hasta)})`)}
    <div class="kpis" style="margin-top:12px">
      <div class="kpi">Total vendido<b>${moneda(s.total)}</b></div>
      <div class="kpi">N.º de ventas<b>${s.ventas}</b></div>
      <div class="kpi">Ticket promedio<b>${moneda(s.ticket_promedio)}</b></div>
      <div class="kpi">Unidades vendidas<b>${s.unidades}</b></div>
      <div class="kpi">Ganancia estimada<b>${moneda(s.ganancia)}</b></div>
      <div class="kpi">Ventas anuladas<b>${s.anuladas}</b></div>
    </div>
    <h2>Por método de pago</h2>
    <table><tr><th>Método</th><th class="r">Ventas</th><th class="r">Total</th></tr>${metodos}</table>
    <h2>Productos más vendidos</h2>
    <table><tr><th>Producto</th><th class="r">Unidades</th><th class="r">Total</th></tr>${top}</table>
    ${detalle ? `<h2>Detalle</h2><table><tr><th>Periodo</th><th class="r">Ventas</th><th class="r">Total</th></tr>${detalle}</table>` : ''}`;
  return compartirHtml(html, 'Reporte de ventas');
}

export function compartirReporteInventario(r: ReporteInventario, config: Configuracion | null) {
  const s = r.resumen;
  const filas = r.productos
    .map((p) => {
      const clase = p.estado === 'AGOTADO' ? 'agotado' : p.estado === 'BAJO' ? 'bajo' : '';
      return `<tr><td>${esc(p.nombre)}<br><span class="muted">${esc(p.codigo_barras ?? 'Sin código')}</span></td>
        <td class="r ${clase}">${p.stock}</td><td class="r">${p.entradas}</td><td class="r">${p.vendidos}</td>
        <td class="r">${p.salidas}</td><td class="r">${moneda(p.stock * p.precio_compra)}</td></tr>`;
    })
    .join('');
  const html = `
    ${cabecera(config, `Reporte ${NOMBRE_PERIODO[r.rango.periodo]} de inventario`, `${r.rango.etiqueta} (${fechaCorta(r.rango.desde)} – ${fechaCorta(r.rango.hasta)})`)}
    <div class="kpis" style="margin-top:12px">
      <div class="kpi">Productos<b>${s.productos}</b></div>
      <div class="kpi">Unidades en stock<b>${s.unidades}</b></div>
      <div class="kpi">Valor (costo)<b>${moneda(s.valor_costo)}</b></div>
      <div class="kpi">Valor (venta)<b>${moneda(s.valor_venta)}</b></div>
      <div class="kpi">Stock bajo (≤ ${r.umbral})<b>${s.stock_bajo}</b></div>
      <div class="kpi">Agotados<b>${s.agotados}</b></div>
    </div>
    <p class="muted">Movimientos del periodo: ${s.entradas} entradas · ${s.vendidos} vendidas · ${s.salidas} salidas. El stock mostrado es el actual.</p>
    <h2>Productos</h2>
    <table><tr><th>Producto</th><th class="r">Stock</th><th class="r">Entradas</th><th class="r">Vendidos</th><th class="r">Salidas</th><th class="r">Valor costo</th></tr>${filas}</table>`;
  return compartirHtml(html, 'Reporte de inventario');
}
