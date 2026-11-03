import { metodoInfo } from '@/constants/colors';
import { ConfigNegocio, Venta } from '@/infrastructure/interfaces';
import { dinero, fechaCorta, horaCorta } from '@/utils/format';

/** Convierte una venta en texto plano para compartir por WhatsApp u otras apps. */
export function ticketComoTexto(v: Venta, config: ConfigNegocio, cliente?: string) {
  const m = config.moneda;
  const lineas = [
    `*${config.nombre}*`,
    `RUC ${config.ruc}`,
    `Ticket #${v.codigo} - ${fechaCorta(v.fecha)} ${horaCorta(v.fecha)}`,
    '------------------------',
    ...v.items.map((i) => `${i.cantidad} x ${i.nombre}  ${dinero(i.precio * i.cantidad, m)}`),
    '------------------------',
    ...(v.descuento > 0 ? [`Descuento: -${dinero(v.descuento, m)}`] : []),
    `*TOTAL: ${dinero(v.total, m)}*`,
    `Pago: ${metodoInfo[v.metodo].label}${cliente ? ` - ${cliente}` : ''}`,
    '',
    config.mensajeTicket,
  ];
  return lineas.join('\n');
}
