import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root elementi topilmadi');

/**
 * DIQQAT: React StrictMode ataylab ishlatilmagan.
 * StrictMode dev rejimida effektlarni ikki marta ishga tushiradi va bu
 * kamera (html5-qrcode) kabi qurilmalarda "kamera allaqachon ishlatilmoqda"
 * kabi muammolarga olib keladi. Ishlab chiqarish uchun bu farq qilmaydi.
 */
createRoot(container).render(<App />);
