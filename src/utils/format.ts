export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const codigoTicket = () => Math.random().toString(16).slice(2, 8).toUpperCase();

/** Genera un código EAN-13 interno (prefijo 20, reservado para uso interno de tiendas). */
export const generarCodigoBarras = () => {
  const base = '20' + Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
  const suma = base
    .split('')
    .reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return base + ((10 - (suma % 10)) % 10);
};

export const dinero = (monto: number, moneda = 'S/') => `${moneda} ${monto.toFixed(2)}`;

export const parseNumero = (texto: string) => {
  const n = parseFloat(texto.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export const fechaCorta = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
};

export const horaCorta = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
};

export type Periodo = 'hoy' | 'semana' | 'mes' | 'todo';

export const enPeriodo = (iso: string, periodo: Periodo) => {
  if (periodo === 'todo') return true;
  const fecha = new Date(iso);
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  if (periodo === 'semana') inicio.setDate(inicio.getDate() - 6);
  if (periodo === 'mes') inicio.setDate(1);
  return fecha >= inicio;
};
