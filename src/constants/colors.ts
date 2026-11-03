import { MetodoPago } from '@/infrastructure/interfaces';

export const colors = {
  primary: '#1B5E4B',
  primaryDark: '#123F33',
  primaryLight: '#E3F1EC',
  accent: '#22A06B',
  background: '#F4F6F5',
  surface: '#FFFFFF',
  border: '#E1E6E4',
  text: '#1C2421',
  textMuted: '#6B7A75',
  danger: '#D64545',
  dangerLight: '#FCE9E9',
  warning: '#E39B1B',
  warningLight: '#FDF3E1',
  fiado: '#7B3FE4',
  fiadoLight: '#F0E8FD',
};

export const metodoInfo: Record<MetodoPago, { label: string; color: string; icon: string }> = {
  efectivo: { label: 'Efectivo', color: '#22A06B', icon: 'cash-outline' },
  yape: { label: 'Yape', color: '#742284', icon: 'qr-code-outline' },
  plin: { label: 'Plin', color: '#00A3C4', icon: 'qr-code-outline' },
  tarjeta: { label: 'Tarjeta POS', color: '#2F6FED', icon: 'card-outline' },
  fiado: { label: 'Crédito (fiado)', color: '#7B3FE4', icon: 'book-outline' },
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 24 };
