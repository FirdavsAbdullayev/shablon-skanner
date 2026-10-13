import { CheckCircle2, CloudOff, Copy, MessageCircle, Printer, Send, Share2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatMoney, formatPaymentMethod, formatQty } from '../lib/format';
import {
  buildReceiptText,
  copyText,
  printReceipt,
  shareReceiptText,
  shortId,
  telegramUrl,
  whatsappUrl,
  type ReceiptData,
} from '../lib/receipt';
import { toast } from '../store/toast.store';
import { Button, Modal } from './ui';

type Props = {
  open: boolean;
  onClose: () => void;
  data: ReceiptData | null;
  offline: boolean;
  onNewSale: () => void;
};

export function ReceiptModal({ open, onClose, data, offline, onNewSale }: Props) {
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => (data ? buildReceiptText(data) : ''), [data]);

  if (!data) return null;

  const handleShare = async () => {
    const result = await shareReceiptText(text);
    if (result === 'shared') toast.success('Chek ulashildi');
  };

  const handleCopy = async () => {
    const ok = await copyText(text);
    setCopied(ok);
    if (ok) toast.success('Chek matni nusxalandi');
    else toast.error('Nusxalab bo\u2019lmadi');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      sheet
      size="sm"
      title="Chek tayyor"
      description={`Chek raqami: ${shortId(data.saleId)}`}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="lg" onClick={onClose}>
            Yopish
          </Button>
          <Button size="lg" onClick={onNewSale}>
            Yangi sotuv
          </Button>
        </div>
      }
    >
      {/* Holat banneri */}
      <div
        className={[
          'flex items-center gap-3 rounded-xl border p-3',
          offline ? 'border-amber-500/40 bg-amber-950/40' : 'border-brand-500/40 bg-brand-950/40',
        ].join(' ')}
      >
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-full ${
            offline ? 'bg-amber-500/15 text-amber-400' : 'bg-brand-500/15 text-brand-400'
          }`}
        >
          {offline ? <CloudOff className="size-5" /> : <CheckCircle2 className="size-5" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            {offline ? 'Chek saqlandi (oflayn)' : 'Sotuv muvaffaqiyatli yakunlandi'}
          </p>
          <p className="text-xs text-slate-300">
            {offline
              ? 'Internet qaytganda chek avtomatik yuboriladi.'
              : `Ombordagi miqdorlar yangilandi.`}
          </p>
        </div>
      </div>

      {/* Chek ko'rinishi - chop etishda faqat shu qism chiqadi */}
      <div className="receipt-print mt-3 rounded-xl border border-slate-300 bg-white p-4 font-mono text-[12px] leading-relaxed text-slate-900">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wide">{data.storeName}</p>
          {data.storePhone ? <p>Tel: {data.storePhone}</p> : null}
          {data.storeAddress ? <p>{data.storeAddress}</p> : null}
        </div>

        <p className="my-2 border-t border-dashed border-slate-400" />

        <div className="space-y-0.5">
          <div className="flex justify-between gap-2">
            <span>Chek:</span>
            <span>{shortId(data.saleId)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Sana:</span>
            <span>{new Date(data.createdAt).toLocaleString('ru-RU')}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Kassir:</span>
            <span>{data.cashierName}</span>
          </div>
        </div>

        <p className="my-2 border-t border-dashed border-slate-400" />

        <table className="w-full">
          <tbody>
            {data.items.map((item, index) => (
              <tr key={`${item.name}-${index}`} className="align-top">
                <td className="pr-1">
                  <span className="block">{item.name}</span>
                  <span className="text-[11px] text-slate-600">
                    {formatQty(item.quantity)} {item.unit} × {formatMoney(item.price)}
                  </span>
                </td>
                <td className="whitespace-nowrap text-right font-semibold">
                  {formatMoney(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="my-2 border-t border-dashed border-slate-400" />

        <div className="space-y-0.5">
          <div className="flex justify-between text-sm font-bold">
            <span>JAMI</span>
            <span>{formatMoney(data.total, data.currency ?? 'UZS')}</span>
          </div>
          <div className="flex justify-between">
            <span>To&rsquo;lov turi:</span>
            <span>{formatPaymentMethod(data.paymentMethod)}</span>
          </div>
          {data.paymentMethod === 'CASH' && data.amountPaid != null ? (
            <>
              <div className="flex justify-between">
                <span>To&rsquo;langan:</span>
                <span>{formatMoney(data.amountPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span>Qaytim:</span>
                <span>{formatMoney(data.changeAmount ?? 0)}</span>
              </div>
            </>
          ) : null}
        </div>

        <p className="my-2 border-t border-dashed border-slate-400" />
        <p className="text-center">Xaridingiz uchun rahmat!</p>
      </div>

      {/* Ulashish tugmalari */}
      <div className="no-print mt-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" icon={<Printer className="size-4" />} onClick={() => printReceipt()}>
          Chop etish
        </Button>
        <Button
          variant="secondary"
          icon={<Share2 className="size-4" />}
          onClick={() => void handleShare()}
        >
          Ulashish
        </Button>
        <Button
          variant="outline"
          icon={<MessageCircle className="size-4 text-brand-400" />}
          onClick={() => window.open(whatsappUrl(text, data.storePhone), '_blank', 'noopener')}
        >
          WhatsApp
        </Button>
        <Button
          variant="outline"
          icon={<Send className="size-4 text-sky-400" />}
          onClick={() => window.open(telegramUrl(text), '_blank', 'noopener')}
        >
          Telegram
        </Button>
        <Button
          variant="ghost"
          className="col-span-2"
          icon={<Copy className="size-4" />}
          onClick={() => void handleCopy()}
        >
          {copied ? 'Nusxalandi!' : 'Chek matnidan nusxa olish'}
        </Button>
      </div>
    </Modal>
  );
}
