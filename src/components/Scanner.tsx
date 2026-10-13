import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
  type Html5QrcodeCameraScanConfig,
} from 'html5-qrcode';
import {
  AlertTriangle,
  Camera,
  CameraOff,
  Check,
  Flashlight,
  FlashlightOff,
  Loader2,
  Power,
  RefreshCw,
  ScanBarcode,
  ScanLine,
  ShieldAlert,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconButton } from './ui';

/**
 * JONLI SKANER
 *
 * html5-qrcode kutubxonasi ustidagi yupqa qatlam. Muhim jihatlar:
 *  - Kamera doim "environment" (orqa) kameradan olinadi
 *  - Faqat kerakli shtrix kod formatlari yoqiladi (tezlik uchun)
 *  - Android Chrome da Brauzerning o'z BarcodeDetector API sidan foydalanadi
 *  - Bir xil kod ketma-ket o'qilishida 1.4 sekund "debounce" (takroriy skan)
 *  - Muvaffaqiyatli skan: yashil "chaqnash" + belgi; xato skan: qizil chayqalish
 *  - Chiroq (torch) qo'llab-quvvatlansa ko'rsatiladi
 *  - Komponent yo'q qilinganda kamera to'g'ri to'xtatiladi (batareya tejaladi)
 */

/** Do'konlarda ishlatiladigan asosiy formatlar */
const FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
];

const REPEAT_GUARD_MS = 1400;

type Props = {
  onScan: (code: string) => void;
  /** Vaqtincha to'xtatish (masalan, to'lov oynasi ochilganda) */
  paused?: boolean;
  className?: string;
  /** Skanerdan tashqariga xato holatini bildirish (masalan, qidiruvga o'tish) */
  onStatusChange?: (status: ScannerStatus) => void;
  /** Tashqi "xato" signali: qiymat o'zgarsa skaner ramkasi qizarib chayqaladi */
  warnSignal?: number;
  /** Skaner yoqilgan/o'chirilgan. O'chirilgan bo'lsa kamera ham to'xtaydi (sukut bo'yicha YOQIQ) */
  enabled?: boolean;
  /** Quvvat tugmasi orqali kassir skanerni yoqadi/o'chiradi */
  onToggle?: () => void;
};

export type ScannerStatus = 'starting' | 'running' | 'error';

type FlashState = { kind: 'ok' | 'warn'; id: number } | null;

function describeError(err: unknown): string {
  const raw = typeof err === 'string' ? err : String((err as Error)?.message ?? err ?? '');
  const text = raw.toLowerCase();
  const name = ((err as DOMException)?.name ?? (err as Error)?.name ?? '').toLowerCase();

  if (
    text.includes('notallowed') ||
    name.includes('notallowed') ||
    text.includes('permission') ||
    text.includes('denied')
  ) {
    return "Kameraga ruxsat berilmadi. Brauzer manzil qatoridagi qulf (xavfsizlik) belgisidan kameraga ruxsat bering.";
  }
  if (
    text.includes('no camera') ||
    text.includes('not found') ||
    text.includes('notfound') ||
    text.includes('no front or back camera') ||
    text.includes('unable to find a camera') ||
    name.includes('notfound') ||
    name.includes('devicesnotfound')
  ) {
    return "Qurilmada kamera topilmadi. Web-kamera ulanganini tekshiring yoki telefondan foydalaning.";
  }
  if (
    text.includes('notreadable') ||
    text.includes('track start') ||
    text.includes('start video source') ||
    text.includes('in use') ||
    name.includes('notreadable')
  ) {
    return "Kamera boshqa ilovada ishlatilmoqda. Uni yopib, qayta urinib ko'ring.";
  }
  if (
    text.includes('overconstrained') ||
    text.includes('constraint') ||
    text.includes('exact') ||
    name.includes('overconstrainederror')
  ) {
    return "Bu kamerani ochib bo'lmadi. Qayta urinib ko'ring yoki qidiruvdan foydalaning.";
  }
  if (
    text.includes('security') ||
    text.includes('insecure') ||
    name.includes('securityerror')
  ) {
    return "Kamera faqat xavfsiz (https:// yoki localhost) sahifada ishlaydi.";
  }
  if (
    text.includes('not implemented') ||
    text.includes('unsupported') ||
    text.includes('getusermedia is not')
  ) {
    return "Brauzer kamerani qo'llab-quvvatlamaydi. Boshqa brauzer (Chrome/Safari) yoki qurilmadan foydalaning.";
  }
  return "Kamerani ishga tushirib bo'lmadi. Quyidagi tugmalardan tekshirib ko'ring.";
}

/** Brauzer kamerasi holatini to'g'ridan-to'g'ri tekshiradigan diagnostika */
type ProbeResult =
  | { ok: true; label: string }
  | { ok: false; label: string; hint?: string };

async function probeCamera(): Promise<ProbeResult> {
  try {
    let cameras: MediaDeviceInfo[] = [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      cameras = devices.filter((d) => d.kind === 'videoinput');
    } catch {
      cameras = [];
    }

    if (cameras.length === 0) {
      return {
        ok: false,
        label: 'Brauzer hech qanday kamera ko\u2019rmayapti.',
        hint: 'Qurilmada web-kamera yo\u2019q yoki u o\u2019chirilgan/band. USB web-kamera ulab ko\u2019ring yoki telefondan foydalaning.',
      };
    }

    // Ruxsat so'rash va kamerani ochishga urinish — aynan shu ruxsat oynasini chiqaradi
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    stream.getTracks().forEach((t) => t.stop());
    return { ok: true, label: `${cameras.length} ta kamera topildi va ruxsat berildi — skaner ishga tushmoqda...` };
  } catch (err) {
    const name = (err as DOMException)?.name ?? '';
    const msg = String((err as Error)?.message ?? err ?? '').toLowerCase();
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || msg.includes('denied')) {
      return {
        ok: false,
        label: 'Kamera ruxsati rad etildi.',
        hint: 'Manzil qatoridagi qulf belgisidan saytga KAMERA ruxsatini bering, so\u2019ng yana bu tugmani bosing.',
      };
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || msg.includes('not found')) {
      return {
        ok: false,
        label: 'Kamera qurilmasi topilmadi.',
        hint: 'Web-kamera ulanganini tekshiring, boshqa qurilmadan sinang.',
      };
    }
    if (name === 'NotReadableError' || msg.includes('start video source') || msg.includes('in use')) {
      return {
        ok: false,
        label: 'Kamera hozir band.',
        hint: 'Boshqa ilova (Zoom, Telegram, Google Meet...) kamerani ishlatayotgan bo\u2019lsa, uni yoping va qayta bosing.',
      };
    }
    if (name === 'SecurityError' || msg.includes('insecure')) {
      return {
        ok: false,
        label: 'Xavfsiz kontekst yo\u2019q.',
        hint: 'Kamera faqat https:// yoki localhost da ishlaydi. Telefonda: npm run dev:https.',
      };
    }
    if (name === 'OverconstrainedError') {
      return { ok: false, label: 'Kamera so\u2019rovga mos kelmadi.', hint: 'Qayta urinib ko\u2019ring.' };
    }
    if (msg.includes('not implemented') || msg.includes('unsupported')) {
      return { ok: false, label: 'Brauzer kamerani qo\u2019llab-quvvatlamaydi.', hint: 'Chrome yoki Safari\u2019dan foydalaning.' };
    }
    return { ok: false, label: `Kamera ochilmadi (${name || 'noma\u2019lum xato'}).`, hint: msg };
  }
}

function isPermissionError(err: unknown): boolean {
  const raw =
    typeof err === 'string' ? err.toLowerCase() : String((err as Error)?.message ?? err ?? '').toLowerCase();
  return raw.includes('notallowed') || raw.includes('permission') || raw.includes('denied');
}

export function Scanner({
  onScan,
  paused = false,
  className = '',
  onStatusChange,
  warnSignal = 0,
  enabled = true,
  onToggle,
}: Props) {
  const containerIdRef = useRef<string>(`pos-scanner-${Math.random().toString(36).slice(2, 9)}`);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const lastDecodeRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const startedRef = useRef(false);
  const wasPausedRef = useRef(false);
  const warnRef = useRef(0);

  const [status, setStatus] = useState<ScannerStatus>('starting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<ProbeResult | null>(null);
  const [probing, setProbing] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [detected, setDetected] = useState<string | null>(null);
  const [flash, setFlash] = useState<FlashState>(null);

  onScanRef.current = onScan;

  const insecureContext =
    typeof window !== 'undefined' &&
    window.location.protocol !== 'https:' &&
    !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

  const reportStatus = useCallback(
    (next: ScannerStatus) => {
      setStatus(next);
      onStatusChange?.(next);
    },
    [onStatusChange],
  );

  const stop = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    startedRef.current = false;
    wasPausedRef.current = false;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch {
      /* allaqachon to'xtagan */
    }
  }, []);

  const start = useCallback(async () => {
    if (scannerRef.current || startedRef.current) return;
    startedRef.current = true;

    reportStatus('starting');
    setErrorMessage(null);
    setPermissionDenied(false);
    setTorchOn(false);
    setHasTorch(false);
    setFlash(null);

    const scanner = new Html5Qrcode(containerIdRef.current, {
      formatsToSupport: FORMATS,
      verbose: false,
      useBarCodeDetectorIfSupported: true,
    });
    scannerRef.current = scanner;

    // DIQQAT: Html5Qrcode.start() ning BIRINCHI argumenti to'liq MediaTrackConstraints
    // EMAS — u faqat kamera tanlash uchun ({ facingMode } / { deviceId } / cameraId).
    // To'liq cheklovlar (kenglik/balandlik) ikkinchi argumentdagi videoConstraints'ga beriladi.
    // (Aks holda kutubxona "object should have exactly 1 key" deb runtime xato tashlaydi.)
    const cameraConfig: MediaTrackConstraints = { facingMode: 'environment' };

    const scanConfig: Html5QrcodeCameraScanConfig = {
      fps: 10,
      // Shtrix kod uzun va yupqa bo'ladi -> keng to'rtburchak maydon
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => ({
        width: Math.floor(viewfinderWidth * 0.88),
        height: Math.floor(viewfinderHeight * 0.42),
      }),
      aspectRatio: 1.7778,
      disableFlip: false,
      videoConstraints: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    try {
      await scanner.start(
        cameraConfig,
        scanConfig,
        (decodedText) => {
          const code = decodedText.trim();
          if (!code) return;

          // Takroriy skan himoyasi (kamera bir kodni sekundiga 10 marta o'qiydi)
          const now = Date.now();
          const last = lastDecodeRef.current;
          if (last.code === code && now - last.at < REPEAT_GUARD_MS) return;
          lastDecodeRef.current = { code, at: now };

          // Yashil chaqnash + kod belgisi
          setDetected(code);
          const flashId = now;
          setFlash({ kind: 'ok', id: flashId });
          window.setTimeout(
            () => setFlash((f) => (f && f.id === flashId ? null : f)),
            700,
          );
          window.setTimeout(() => setDetected((prev) => (prev === code ? null : prev)), 1000);

          onScanRef.current(code);
        },
        // Har bir kadrda "kod topilmadi" xatosi keladi - bu normal holat
        () => undefined,
      );

      reportStatus('running');

      // Chiroq (torch) qo'llab-quvvatlanishini tekshirish
      try {
        const capabilities = scanner.getRunningTrackCameraCapabilities();
        setHasTorch(capabilities.torchFeature().isSupported());
      } catch {
        setHasTorch(false);
      }
    } catch (err) {
      // Resurslarni tozalash: video oqimi va DOM elementlar
      try {
        await scanner.stop();
      } catch {
        /* boshlanmagan bo'lishi mumkin */
      }
      try {
        scanner.clear();
      } catch {
        /* bo'sh */
      }
      if (scannerRef.current === scanner) scannerRef.current = null;
      startedRef.current = false;
      setPermissionDenied(isPermissionError(err));
      setRawError(typeof err === 'string' ? err : String((err as Error)?.message ?? err ?? ''));
      setErrorMessage(describeError(err));
      reportStatus('error');
    }
  }, [reportStatus]);

  const retry = useCallback(async () => {
    await stop();
    await start();
  }, [start, stop]);

  // To'g'ridan-to'g'ri kamera diagnostikasi: ruxsat so'raydi va nima xato ekanini aniq ko'rsatadi
  const handleProbe = useCallback(async () => {
    if (probing) return;
    setProbing(true);
    setDiagnostic(null);
    const result = await probeCamera();
    setDiagnostic(result);
    setProbing(false);
    if (result.ok) {
      // Ruxsat berildi — skanerni darhol qayta ishga tushiramiz
      await stop();
      await start();
    }
  }, [probing, start, stop]);

  const toggleTorch = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      const feature = scanner.getRunningTrackCameraCapabilities().torchFeature();
      await feature.apply(!torchOn);
      setTorchOn((prev) => !prev);
    } catch {
      setHasTorch(false);
    }
  }, [torchOn]);

  // Mount/unmount va yoqish/o'chirish: kamerani ochish/to'g'ri yopish
  useEffect(() => {
    if (enabled) void start();
    else void stop();
    return () => {
      void stop();
    };
  }, [enabled, start, stop]);

  // Pauza: to'lov oynasi ochilganda kamerani to'xtatib turamiz.
  // Faqat haqiqatan ham pauza holatida o'zgartirish kiritamiz (xato otishni oldini olish).
  useEffect(() => {
    const scanner = scannerRef.current;
    if (!scanner || status !== 'running') return;
    try {
      if (paused && !wasPausedRef.current) {
        scanner.pause(true);
        wasPausedRef.current = true;
      } else if (!paused && wasPausedRef.current) {
        scanner.resume();
        wasPausedRef.current = false;
      }
    } catch {
      wasPausedRef.current = false;
    }
  }, [paused, status]);

  // Tashqi "xato" signali - qidiruv/skan xato bo'lganda qizil chayqalish
  useEffect(() => {
    if (warnSignal === warnRef.current) return;
    warnRef.current = warnSignal;
    if (warnSignal === 0) return;
    const flashId = warnSignal;
    setFlash({ kind: 'warn', id: flashId });
    const t = window.setTimeout(
      () => setFlash((f) => (f && f.id === flashId ? null : f)),
      750,
    );
    return () => window.clearTimeout(t);
  }, [warnSignal]);

  const dimmed = paused && status === 'running';

  return (
    <div
      className={`pos-scanner-root relative overflow-hidden rounded-2xl bg-black transition-[filter,opacity] duration-300 ${dimmed ? 'opacity-80' : ''} ${className}`}
    >
      {/* Kamera oqimi shu yerga joylashadi */}
      <div
        id={containerIdRef.current}
        className="pos-scanner size-full [&_video]:size-full [&_video]:object-cover"
      />

      {/* Skanerlash ramkasi */}
      {status === 'running' ? (
        <div className="pointer-events-none absolute inset-0">
          {/* Chiziq qoraytirish ramkasi + chayqalish */}
          <div className={`absolute inset-x-[6%] inset-y-[29%] ${flash?.kind === 'warn' ? 'animate-shake' : ''}`}>
            <div className="animate-breathe absolute inset-0 rounded-xl border-2 border-brand-400/70">
              <span className="absolute -left-px -top-px size-6 rounded-tl-xl border-l-4 border-t-4 border-brand-400" />
              <span className="absolute -right-px -top-px size-6 rounded-tr-xl border-r-4 border-t-4 border-brand-400" />
              <span className="absolute -bottom-px -left-px size-6 rounded-bl-xl border-b-4 border-l-4 border-brand-400" />
              <span className="absolute -bottom-px -right-px size-6 rounded-br-xl border-b-4 border-r-4 border-brand-400" />
              <span className="scan-line absolute inset-x-3 h-0.5 rounded-full bg-brand-400/90 shadow-[0_0_12px_2px_rgba(16,185,129,0.7)]" />
            </div>
          </div>
        </div>
      ) : null}

      {/* Skan natijasi chaqnashi */}
      {flash ? (
        <div
          key={flash.id}
          className={`pointer-events-none absolute inset-0 z-10 grid place-items-center ${
            flash.kind === 'ok' ? 'animate-flash-ok bg-brand-500/20' : 'animate-flash-warn bg-rose-500/25'
          }`}
        >
          <span
            className={`animate-pop-in grid size-16 place-items-center rounded-2xl shadow-2xl ${
              flash.kind === 'ok'
                ? 'bg-brand-500 text-slate-950 shadow-brand-500/40'
                : 'bg-rose-500 text-white shadow-rose-500/40'
            }`}
          >
            {flash.kind === 'ok' ? (
              <Check className="size-8" strokeWidth={3} />
            ) : (
              <AlertTriangle className="size-8" />
            )}
          </span>
        </div>
      ) : null}

      {/* Skaner o'chirilgan ekrani */}
      {!enabled ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/85 p-4">
          <div className="animate-in flex flex-col items-center gap-3 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-slate-800 text-slate-400">
              <ScanBarcode className="size-7" />
            </span>
            <p className="text-sm font-medium text-slate-200">Skaner o&rsquo;chirilgan</p>
            <p className="max-w-[240px] text-xs text-slate-400">
              Shtrix kodlarni skanerlash uchun kamerani yoqing. Bunda brauzer kamera ruxsatini so&rsquo;raydi.
            </p>
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-slate-950 transition-transform hover:bg-brand-400 active:scale-95"
            >
              <Power className="size-4" /> Skanerni yoqish
            </button>
          </div>
        </div>
      ) : null}

      {/* Holat ko'rsatkichlari */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3">
        <div className="flex items-center gap-2">
          {onToggle && enabled && status === 'running' ? (
            <button
              type="button"
              aria-label="Skanerni o\u2019chirish"
              title="Skanerni o\u2019chirish"
              onClick={onToggle}
              className="pointer-events-auto grid size-8 place-items-center rounded-full bg-slate-950/70 text-slate-300 backdrop-blur transition-transform hover:bg-slate-900/80 active:scale-90"
            >
              <Power className="size-4" />
            </button>
          ) : null}
          <span className="flex items-center gap-1.5 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur">
          {status === 'starting' ? (
            <Loader2 className="size-3.5 animate-spin text-brand-400" />
          ) : status === 'running' ? (
            <ScanBarcode className="size-3.5 text-brand-400" />
          ) : (
            <CameraOff className="size-3.5 text-rose-400" />
          )}
          {status === 'starting'
            ? 'Kamera ochilmoqda...'
            : status === 'running'
              ? 'Shtrix kodni ramkaga tuting'
              : 'Kamera ishlamayapti'}
        </span>
        </div>
        {detected ? (
          <span
            key={detected}
            className="animate-pop-in flex max-w-[55%] items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-slate-950"
          >
            <Check className="size-3.5 shrink-0" strokeWidth={3} />
            <span className="truncate font-mono">{detected}</span>
          </span>
        ) : null}
      </div>

      {/* O'rtadagi maslahat */}
      {status === 'running' ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-14 z-20 flex justify-center">
          <span className="rounded-full bg-slate-950/70 px-3 py-1 text-[11px] font-medium text-slate-300 backdrop-blur">
            Kodni keng ramka ichiga tuting
          </span>
        </div>
      ) : null}

      {/* Boshqaruv tugmalari */}
      {status === 'running' ? (
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-end gap-2 p-3">
          {hasTorch ? (
            <IconButton
              label={torchOn ? 'Chiroqni o\u2019chirish' : 'Chiroqni yoqish'}
              onClick={() => void toggleTorch()}
              size="md"
              className="bg-slate-950/70 text-amber-300 backdrop-blur transition-transform hover:bg-slate-900/80 active:scale-95"
            >
              {torchOn ? <FlashlightOff className="size-5" /> : <Flashlight className="size-5" />}
            </IconButton>
          ) : null}
          <IconButton
            label="Kamerani qayta yoqish"
            onClick={() => void retry()}
            size="md"
            className="bg-slate-950/70 text-slate-200 backdrop-blur transition-transform hover:bg-slate-900/80 active:scale-95"
          >
            <RefreshCw className="size-5" />
          </IconButton>
        </div>
      ) : null}

      {/* Boshlanmoqda */}
      {status === 'starting' ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/80">
          <div className="animate-in flex flex-col items-center gap-2 text-slate-300">
            <span className="grid size-14 place-items-center rounded-2xl bg-brand-500/15 text-brand-400">
              <Loader2 className="size-7 animate-spin" />
            </span>
            <p className="text-sm">Kamera tayyorlanmoqda...</p>
          </div>
        </div>
      ) : null}

      {/* Xato holati */}
      {status === 'error' ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/90 p-4">
          <div className="animate-in flex max-w-sm flex-col items-center gap-3 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-rose-500/15 text-rose-400">
              <CameraOff className="size-6" />
            </span>
            <p className="text-sm text-slate-200">{errorMessage ?? 'Kamera xatosi'}</p>

            {insecureContext ? (
              <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-950/40 p-2.5 text-left text-xs text-amber-200">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  Brauzerlar kamerani faqat <b>https://</b> yoki <b>localhost</b> da beradi. Telefonda sinash
                  uchun kompyuterda <code className="rounded bg-black/30 px-1">npm run dev:https</code> buyrug&rsquo;ini
                  ishlatib, chiqqan manzilni telefonda oching.
                </span>
              </p>
            ) : null}

            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                disabled={probing}
                onClick={() => void handleProbe()}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 text-sm font-semibold text-brand-300 transition-transform hover:bg-brand-500/20 active:scale-95 disabled:cursor-wait disabled:opacity-60"
              >
                {probing ? <Loader2 className="size-5 animate-spin" /> : <ScanLine className="size-5" />}
                {probing ? 'Tekshirilmoqda...' : 'Kamerani tekshirish'}
              </button>
              <button
                type="button"
                onClick={() => void retry()}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-slate-950 transition-transform hover:bg-brand-400 active:scale-95"
              >
                <Camera className="size-5" />
                {permissionDenied ? 'Kameraga ruxsat berish' : 'Qayta urinish'}
              </button>
            </div>

            {diagnostic ? (
              <div
                role="status"
                className={`w-full rounded-xl border p-2.5 text-left text-xs ${
                  diagnostic.ok
                    ? 'border-brand-500/30 bg-brand-500/10 text-brand-200'
                    : 'border-rose-500/30 bg-rose-950/40 text-rose-200'
                }`}
              >
                <p className="font-semibold">
                  {diagnostic.ok ? <Check className="mr-1 inline size-3.5" strokeWidth={3} /> : <AlertTriangle className="mr-1 inline size-3.5" />}
                  {diagnostic.label}
                </p>
                {'hint' in diagnostic && diagnostic.hint ? (
                  <p className="mt-1 text-slate-400">{diagnostic.hint}</p>
                ) : null}
              </div>
            ) : null}

            {rawError ? (
              <details className="w-full rounded-xl bg-slate-900/80 p-2.5 text-left">
                <summary className="cursor-pointer select-none text-xs font-medium text-slate-500">
                  Texnik ma&rsquo;lumot
                </summary>
                <code className="mt-1.5 block break-words rounded-lg bg-slate-950/80 p-2 text-[11px] leading-relaxed text-slate-400">
                  {rawError}
                </code>
              </details>
            ) : null}

            <p className="text-xs text-slate-500">
              {permissionDenied
                ? 'Ruxsat berilgach kamera avtomatik ishga tushadi. Agar ruxsat so\u2019ralmasa, brauzer parametrlaridan saytga kamerani ruxsat bering.'
                : "Kamera ishlamasa, pastdagi qidiruv maydonidan mahsulotni qo'lda toping."}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}