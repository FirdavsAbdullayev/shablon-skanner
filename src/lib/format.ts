/** Raqam, pul va sana formatlash (UZS, o'zbek tili) */

const UZS = /^UZS$/i;

function groupNumber(value: number): string {
  // 12500 -> "12 500" (bo'sh joy bilan ajratish - O'zbekistonda qabul qilingan)
  const rounded = Math.round(Math.abs(value));
  const str = String(rounded);
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** 12500 -> "12 500 so'm" */
export function formatMoney(value: number, currency = 'UZS'): string {
  const sign = value < 0 ? '-' : '';
  const body = groupNumber(value);
  return UZS.test(currency) ? `${sign}${body} so\u2019m` : `${sign}${body} ${currency}`;
}

/** Faqat raqam: 12500 -> "12 500" (kiritish maydonlari uchun) */
export function formatNumber(value: number): string {
  return groupNumber(value);
}

/** Miqdor: 2 -> "2", 1.5 -> "1,5", 0.25 -> "0,25" */
export function formatQty(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded).replace('.', ',');
}

const UNITS: Record<string, string> = {
  dona: 'dona',
  kg: 'kg',
  g: 'g',
  litr: 'litr',
  ml: 'ml',
  metr: 'metr',
  quti: 'quti',
  paket: 'paket',
  juft: 'juft',
};

export const UNIT_OPTIONS = Object.keys(UNITS);

export function formatUnit(unit?: string | null): string {
  if (!unit) return 'dona';
  return UNITS[unit] ?? unit;
}

export function formatPaymentMethod(method: string): string {
  if (method === 'CASH') return 'Naqd';
  if (method === 'CARD') return 'Karta';
  if (method === 'QR') return 'QR to\u2019lov';
  return method;
}

export function formatRole(role: string): string {
  return role === 'ADMIN' ? 'Administrator' : 'Kassir';
}

const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });

export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return dateFmt.format(d);
}

export function formatTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return timeFmt.format(d);
}

export function formatDateTime(value: string | Date): string {
  return `${formatDate(value)} ${formatTime(value)}`;
}

/** <input type="date"> uchun 'YYYY-MM-DD' */
export function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayInput(): string {
  return toInputDate(new Date());
}

export function daysAgoInput(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toInputDate(d);
}

/** Qisqa "3 kun oldin" ko'rinishi */
export function relativeTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'hozir';
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'kecha';
  if (days < 30) return `${days} kun oldin`;
  return formatDate(d);
}
