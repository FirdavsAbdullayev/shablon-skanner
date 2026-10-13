import { KeyRound, Save, Store as StoreIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Card, CardTitle, Input } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { toast } from '../../store/toast.store';
import { useAuthStore } from '../../store/auth.store';
import type { Store } from '../../types/api';

export function Settings() {
  const user = useAuthStore((s) => s.user);
  const refresh = useAuthStore((s) => s.refresh);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    currency: 'UZS',
    lowStockThreshold: '5',
  });
  const [saving, setSaving] = useState(false);

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user?.store) return;
    setForm({
      name: user.store.name,
      phone: user.store.phone ?? '',
      address: user.store.address ?? '',
      currency: user.store.currency,
      lowStockThreshold: String(user.store.lowStockThreshold),
    });
  }, [user?.store]);

  const saveStore = async () => {
    if (form.name.trim().length < 2) {
      toast.warn("Do'kon nomini kiriting");
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch<{ store: Store; message: string }>('/api/reports/store', {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        currency: form.currency.trim() || 'UZS',
        lowStockThreshold: Number(form.lowStockThreshold) || 0,
      });
      await refresh();
      toast.success(res.message);
    } catch (err) {
      toast.error(errorMessage(err), 'Saqlab bo\u2019lmadi');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (!passwords.current || !passwords.next) {
      toast.warn('Barcha maydonlarni to\u2019ldiring');
      return;
    }
    if (passwords.next.length < 4) {
      toast.warn("Yangi parol kamida 4 belgidan iborat bo'lsin");
      return;
    }
    if (passwords.next !== passwords.confirm) {
      toast.warn('Yangi parollar bir xil emas');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await api.post<{ message: string }>('/api/auth/change-password', {
        currentPassword: passwords.current,
        newPassword: passwords.next,
      });
      toast.success(res.message);
      setPasswords({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast.error(errorMessage(err), 'Parolni o\u2019zgartirib bo\u2019lmadi');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3.5">
        <CardTitle icon={<StoreIcon className="size-4" />}>Do&rsquo;kon ma&rsquo;lumotlari</CardTitle>

        <Input
          label="Do'kon nomi"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Shablon Do'kon"
        />
        <Input
          label="Telefon raqami"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+998 90 123 45 67"
          inputMode="tel"
          hint="Chekda ko'rsatiladi"
        />
        <Input
          label="Manzil"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="Toshkent sh., Chilonzor tumani"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Valyuta"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            placeholder="UZS"
          />
          <Input
            label="Kam qoldiq chegarasi"
            value={form.lowStockThreshold}
            onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
            inputMode="numeric"
            hint="Shu miqdordan kam qolsa ogohlantirish"
          />
        </div>

        <Button
          size="lg"
          fullWidth
          loading={saving}
          icon={<Save className="size-5" />}
          onClick={() => void saveStore()}
        >
          Saqlash
        </Button>
      </Card>

      <Card className="space-y-3.5">
        <CardTitle icon={<KeyRound className="size-4" />}>Parolni o&rsquo;zgartirish</CardTitle>

        <Input
          label="Joriy parol"
          type="password"
          value={passwords.current}
          onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
          autoComplete="current-password"
        />
        <Input
          label="Yangi parol"
          type="password"
          value={passwords.next}
          onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
          autoComplete="new-password"
          hint="Kamida 4 belgi"
        />
        <Input
          label="Yangi parolni takrorlang"
          type="password"
          value={passwords.confirm}
          onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
          autoComplete="new-password"
        />

        <Button
          size="lg"
          fullWidth
          variant="secondary"
          loading={savingPassword}
          icon={<Save className="size-5" />}
          onClick={() => void savePassword()}
        >
          Parolni yangilash
        </Button>

        <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3 text-xs text-slate-400">
          <p>
            Hisobingiz: <span className="font-mono text-slate-300">@{user?.username}</span>
          </p>
          <p className="mt-0.5">
            Rol: <span className="text-slate-300">{user?.role === 'ADMIN' ? 'Administrator' : 'Kassir'}</span>
          </p>
        </div>
      </Card>
    </div>
  );
}
