import { formatDateTime, formatMoney, formatNumber, formatPaymentMethod, formatQty } from './format';

/** Chek tarkibi - matn ko'rinishida (WhatsApp/Telegram/print uchun bir xil manba) */
export type ReceiptLine = {
  name: string;
  quantity: number;
  unit: string;
  price: number;
  lineTotal: number;
};

export type ReceiptData = {
  storeName: string;
  storePhone?: string | null;
  storeAddress?: string | null;
  saleId: string;
  createdAt: string;
  cashierName: string;
  items: ReceiptLine[];
  total: number;
  paymentMethod: string;
  amountPaid?: number | null;
  changeAmount?: number | null;
  currency?: string;
};

const WIDTH = 32;

function line(char = '-'): string {
  return char.repeat(WIDTH);
}

function center(text: string): string {
  if (text.length >= WIDTH) return text.slice(0, WIDTH);
  const left = Math.floor((WIDTH - text.length) / 2);
  return `${' '.repeat(left)}${text}`;
}

/** Uzun nomni ikki tomondan qisqartiradigan "label ....... value" qatori */
function kv(label: string, value: string): string {
  const space = WIDTH - label.length - value.length;
  if (space <= 0) return `${label}\n${value.padStart(WIDTH)}`;
  return `${label}${' '.repeat(space)}${value}`;
}

function wrap(text: string, width = WIDTH): string[] {
  const out: string[] = [];
  let current = '';
  for (const word of text.split(' ')) {
    if ((current + (current ? ' ' : '') + word).length > width) {
      if (current) out.push(current);
      current = word.length > width ? word.slice(0, width) : word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) out.push(current);
  return out.length ? out : [text.slice(0, width)];
}

export function shortId(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`;
}

/** Chekni oddiy matn ko'rinishida yasash (termal printer va messenjerlar uchun) */
export function buildReceiptText(data: ReceiptData): string {
  const currency = data.currency ?? 'UZS';
  const out: string[] = [];

  out.push(center(data.storeName.toUpperCase()));
  if (data.storePhone) out.push(center(`Tel: ${data.storePhone}`));
  if (data.storeAddress) wrap(data.storeAddress).forEach((l) => out.push(center(l)));
  out.push(line('='));
  out.push(kv('Chek:', shortId(data.saleId)));
  out.push(kv('Sana:', formatDateTime(data.createdAt)));
  out.push(kv('Kassir:', data.cashierName));
  out.push(line());
  out.push('Mahsulot'.padEnd(20) + 'Summa'.padStart(12));
  out.push(line());

  for (const item of data.items) {
    for (const l of wrap(item.name, 30)) out.push(l);
    const left = `${formatQty(item.quantity)} ${item.unit} x ${formatNumber(item.price)}`;
    const right = formatNumber(item.lineTotal);
    out.push(kv(`  ${left}`, right));
  }

  out.push(line());
  out.push(kv('JAMI:', formatMoney(data.total, currency)));
  out.push(kv(`To'lov turi:`, formatPaymentMethod(data.paymentMethod)));
  if (data.amountPaid !== null && data.amountPaid !== undefined) {
    out.push(kv('To\u2019langan:', formatMoney(data.amountPaid, currency)));
  }
  if (data.changeAmount !== null && data.changeAmount !== undefined && data.changeAmount > 0) {
    out.push(kv('Qaytim:', formatMoney(data.changeAmount, currency)));
  }
  out.push(line('='));
  out.push(center('Xaridingiz uchun rahmat!'));
  out.push(center('Yana kelib turing :)'));
  out.push('');

  return out.join('\n');
}

export function whatsappUrl(text: string, phone?: string | null): string {
  const base = phone ? `https://wa.me/${phone.replace(/[^\d]/g, '')}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function telegramUrl(text: string): string {
  return `https://t.me/share/url?text=${encodeURIComponent(text)}`;
}

/**
 * Ulashish: birinchi navbatda qurilmaning o'z "Share" oynasini
 * (mobil brauzerlarda WhatsApp/Telegram ham chiqadi), bo'lmasa WhatsApp.
 */
export async function shareReceiptText(text: string): Promise<'shared' | 'whatsapp'> {
  const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
  if (typeof nav.share === 'function') {
    try {
      await nav.share({ title: 'Xarid cheki', text });
      return 'shared';
    } catch (err) {
      // Foydalanuvchi bekor qildi - boshqa kanalga o'tmaymiz
      if ((err as Error)?.name === 'AbortError') return 'shared';
    }
  }
  window.open(whatsappUrl(text), '_blank', 'noopener');
  return 'whatsapp';
}

/** Brauzerning "Chop etish" oynasi (chek ko'rinishi @media print orqali chiqadi) */
export function printReceipt(): void {
  window.print();
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
      return true;
    } catch {
      return false;
    }
  }
}
