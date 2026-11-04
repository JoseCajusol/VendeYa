import type { Periodo } from '@/types';

export function moneda(valor: number, simbolo = 'S/') {
  return `${simbolo} ${valor.toFixed(2)}`;
}

/** Fecha local en formato AAAA-MM-DD (lo que espera la API). */
export function fechaISO(d: Date = new Date()) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Convierte "AAAA-MM-DD" a Date local (sin problemas de zona horaria). */
export function parseFechaISO(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "2026-11-03 20:02:52" -> "03/11/2026 20:02" */
export function fechaHora(mysql: string) {
  const [f, h = ''] = mysql.split(' ');
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y} ${h.slice(0, 5)}`.trim();
}

export function hora(mysql: string) {
  return (mysql.split(' ')[1] ?? '').slice(0, 5);
}

export function fechaCorta(mysql: string) {
  const [y, m, d] = mysql.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** Mueve la fecha un periodo hacia adelante (+1) o atrás (-1). */
export function moverFecha(iso: string, periodo: Periodo, paso: 1 | -1) {
  const d = parseFechaISO(iso);
  if (periodo === 'diario') d.setDate(d.getDate() + paso);
  if (periodo === 'semanal') d.setDate(d.getDate() + 7 * paso);
  if (periodo === 'mensual') {
    d.setDate(1);
    d.setMonth(d.getMonth() + paso);
  }
  if (periodo === 'anual') d.setFullYear(d.getFullYear() + paso);
  return fechaISO(d);
}

/** Inicio del periodo actual, para filtros rápidos del historial. */
export function inicioDe(periodo: 'hoy' | 'semana' | 'mes') {
  const d = new Date();
  if (periodo === 'semana') {
    const dia = (d.getDay() + 6) % 7; // lunes = 0
    d.setDate(d.getDate() - dia);
  }
  if (periodo === 'mes') d.setDate(1);
  return fechaISO(d);
}

/** Acepta "12,50" o "12.50" y devuelve número o NaN. */
export function aNumero(texto: string) {
  const limpio = texto.replace(',', '.').trim();
  return limpio === '' ? NaN : Number(limpio);
}
