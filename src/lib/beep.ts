/**
 * Skaner ovozi va tebranish (vibratsiya).
 * Ovoz WebAudio orqali sintez qilinadi - audio fayl yuklash shart emas,
 * shuning uchun oflayn ham darhol ishlaydi.
 */

type FeedbackKind = 'ok' | 'error' | 'warn' | 'cash';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Brauzerlar ovozni faqat foydalanuvchi teginishidan keyin beradi.
 * Shuning uchun birinchi teginishda AudioContext ni "uyg'otamiz".
 */
export function unlockAudio(): void {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  gain.gain.value = 0.0001;
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.01);
}

function tone(freq: number, startAt: number, duration: number, volume = 0.18, type: OscillatorType = 'sine'): void {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + startAt);
  gain.gain.setValueAtTime(0.0001, c.currentTime + startAt);
  gain.gain.exponentialRampToValueAtTime(volume, c.currentTime + startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + startAt + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime + startAt);
  osc.stop(c.currentTime + startAt + duration + 0.02);
}

export function playSound(kind: FeedbackKind): void {
  switch (kind) {
    case 'ok':
      // Yuqoriga ko'tariluvchi qisqa "bip" - muvaffaqiyatli skan
      tone(1180, 0, 0.07, 0.22, 'square');
      tone(1620, 0.07, 0.09, 0.16, 'square');
      break;
    case 'error':
      // Past "buzz" - xato / topilmadi
      tone(320, 0, 0.16, 0.22, 'sawtooth');
      tone(240, 0.16, 0.2, 0.18, 'sawtooth');
      break;
    case 'warn':
      tone(760, 0, 0.1, 0.18, 'triangle');
      break;
    case 'cash':
      // Kassa yopildi - yoqimli uch nota
      tone(880, 0, 0.1, 0.2, 'sine');
      tone(1320, 0.09, 0.1, 0.2, 'sine');
      tone(1760, 0.18, 0.22, 0.18, 'sine');
      break;
  }
}

export function vibrate(pattern: number | number[]): void {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    /* iOS Safari qo'llamaydi - jim o'tamiz */
  }
}

/** Skan natijasiga qarab ovoz + tebranish berish */
export function feedback(kind: FeedbackKind): void {
  playSound(kind);
  switch (kind) {
    case 'ok':
      vibrate(60);
      break;
    case 'error':
      vibrate([90, 60, 90]);
      break;
    case 'warn':
      vibrate(120);
      break;
    case 'cash':
      vibrate([50, 40, 50, 40, 120]);
      break;
  }
}
