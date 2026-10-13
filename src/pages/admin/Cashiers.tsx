import {
  Copy,
  KeyRound,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  Modal,
  Select,
  Spinner,
  Switch,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { copyText } from '../../lib/receipt';
import { formatDateTime, formatRole } from '../../lib/format';
import { toast } from '../../store/toast.store';
import { useAuthStore } from '../../store/auth.store';
import type { CreateUserResponse, ResetPasswordResponse, User, UsersResponse } from '../../types/api';

type Credentials = { username: string; password: string; title: string };

export function Cashiers() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'CASHIER', username: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const [renameTarget, setRenameTarget] = useState<User | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<UsersResponse>('/api/users');
      setUsers(res.items);
    } catch (err) {
      toast.error(errorMessage(err), 'Foydalanuvchilarni yuklab bo\u2019lmadi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (form.name.trim().length < 2) {
      toast.warn('Ismni kiriting');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post<CreateUserResponse>('/api/users', {
        name: form.name.trim(),
        role: form.role,
        ...(form.username.trim() ? { username: form.username.trim().toLowerCase() } : {}),
        ...(form.password.trim() ? { password: form.password.trim() } : {}),
      });
      setCreateOpen(false);
      setForm({ name: '', role: 'CASHIER', username: '', password: '' });
      setCredentials({
        username: res.credentials.username,
        password: res.credentials.password,
        title: 'Yangi hisob yaratildi',
      });
      void load();
    } catch (err) {
      toast.error(errorMessage(err), 'Hisob yaratilmadi');
    } finally {
      setCreating(false);
    }
  };

  const resetPassword = async (user: User) => {
    setBusyId(user.id);
    try {
      const res = await api.post<ResetPasswordResponse>(`/api/users/${user.id}/reset-password`);
      setCredentials({
        username: res.username,
        password: res.generatedPassword,
        title: `${user.name} uchun yangi parol`,
      });
    } catch (err) {
      toast.error(errorMessage(err), 'Parolni yangilab bo\u2019lmadi');
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (user: User, isActive: boolean) => {
    setBusyId(user.id);
    try {
      await api.patch(`/api/users/${user.id}`, { isActive });
      toast.success(isActive ? 'Hisob faollashtirildi' : 'Hisob bloklandi');
      void load();
    } catch (err) {
      toast.error(errorMessage(err), 'O\u2019zgartirib bo\u2019lmadi');
    } finally {
      setBusyId(null);
    }
  };

  const rename = async () => {
    if (!renameTarget || renameValue.trim().length < 2) return;
    setRenaming(true);
    try {
      await api.patch(`/api/users/${renameTarget.id}`, { name: renameValue.trim() });
      toast.success('Ism yangilandi');
      setRenameTarget(null);
      void load();
    } catch (err) {
      toast.error(errorMessage(err), 'Saqlab bo\u2019lmadi');
    } finally {
      setRenaming(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.del<{ message: string }>(`/api/users/${deleteTarget.id}`);
      toast.success(res.message);
      setDeleteTarget(null);
      void load();
    } catch (err) {
      toast.error(errorMessage(err), 'O\u2019chirib bo\u2019lmadi');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <Users className="size-5 text-brand-400" /> Xodimlar
            </h2>
            <p className="mt-0.5 text-sm text-slate-400">
              {users.length} ta hisob · {users.filter((u) => u.isActive).length} ta faol
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" icon={<RefreshCw className="size-4" />} onClick={() => void load()}>
              Yangilash
            </Button>
            <Button icon={<Plus className="size-5" />} onClick={() => setCreateOpen(true)}>
              Kassir qo&rsquo;shish
            </Button>
          </div>
        </div>
      </Card>

      {loading && users.length === 0 ? <Spinner label="Yuklanmoqda..." /> : null}

      {!loading && users.length === 0 ? (
        <EmptyState icon={<Users className="size-7" />} title="Xodimlar yo'q" />
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {users.map((user) => {
          const isSelf = user.id === currentUser?.id;
          return (
            <Card key={user.id} className="space-y-3">
              <div className="flex items-start gap-3">
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-xl ${
                    user.role === 'ADMIN'
                      ? 'bg-violet-500/15 text-violet-300'
                      : 'bg-brand-500/15 text-brand-300'
                  }`}
                >
                  {user.role === 'ADMIN' ? <ShieldCheck className="size-5" /> : <UserCog className="size-5" />}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-white">{user.name}</p>
                    {isSelf ? <Badge tone="sky">siz</Badge> : null}
                    {!user.isActive ? <Badge tone="rose">bloklangan</Badge> : null}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-400">
                    @{user.username} · {formatRole(user.role)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {user.salesCount ?? 0} ta sotuv · {formatDateTime(user.createdAt)} dan beri
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-slate-700/50 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<KeyRound className="size-4" />}
                  loading={busyId === user.id}
                  onClick={() => void resetPassword(user)}
                >
                  Parolni yangilash
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  icon={<UserCog className="size-4" />}
                  onClick={() => {
                    setRenameTarget(user);
                    setRenameValue(user.name);
                  }}
                >
                  Ismni o&rsquo;zgartirish
                </Button>

                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-slate-400">{user.isActive ? 'Faol' : 'Bloklangan'}</span>
                  <Switch
                    checked={user.isActive}
                    disabled={isSelf || busyId === user.id}
                    onChange={(next) => void toggleActive(user, next)}
                    label="Hisobni faollashtirish"
                  />
                  <IconButton
                    label="O'chirish"
                    size="sm"
                    disabled={isSelf}
                    className="hover:bg-rose-500/10 hover:text-rose-400"
                    onClick={() => setDeleteTarget(user)}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Yangi hisob yaratish */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        sheet
        size="sm"
        title="Yangi xodim"
        description="Foydalanuvchi nomi va parolni bo'sh qoldirsangiz, tizim o'zi yaratadi"
        footer={
          <Button size="lg" fullWidth loading={creating} onClick={() => void create()} icon={<UserPlus className="size-5" />}>
            Hisob yaratish
          </Button>
        }
      >
        <div className="space-y-3.5">
          <Input
            label="Ism-familiya *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Aziza Karimova"
            autoFocus
          />
          <Select
            label="Rol"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            options={[
              { value: 'CASHIER', label: 'Kassir' },
              { value: 'ADMIN', label: 'Administrator' },
            ]}
          />
          <Input
            label="Foydalanuvchi nomi"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="aziza (ixtiyoriy)"
            autoCapitalize="none"
            spellCheck={false}
          />
          <Input
            label="Parol"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="ixtiyoriy — bo'sh qolsa yaratiladi"
          />
        </div>
      </Modal>

      {/* Yaratilgan parolni ko'rsatish */}
      <Modal
        open={Boolean(credentials)}
        onClose={() => setCredentials(null)}
        sheet
        size="sm"
        title={credentials?.title ?? ''}
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="lg"
              icon={<Copy className="size-4" />}
              onClick={async () => {
                if (!credentials) return;
                const ok = await copyText(
                  `Foydalanuvchi nomi: ${credentials.username}\nParol: ${credentials.password}`,
                );
                toast[ok ? 'success' : 'error'](
                  ok ? 'Ma\u2019lumotlar nusxalandi' : 'Nusxalab bo\u2019lmadi',
                );
              }}
            >
              Nusxa olish
            </Button>
            <Button size="lg" onClick={() => setCredentials(null)}>
              Tushundim
            </Button>
          </div>
        }
      >
        {credentials ? (
          <div className="space-y-3">
            <p className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 text-sm text-amber-200">
              Bu parol <b>faqat hozir</b> ko&rsquo;rsatiladi. Uni xodimga yetkazing yoki nusxa olib saqlang.
            </p>
            <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-900/60 p-3 font-mono text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Login</span>
                <span className="font-semibold text-white">{credentials.username}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Parol</span>
                <span className="font-semibold text-brand-400">{credentials.password}</span>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Ismni o'zgartirish */}
      <Modal
        open={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        sheet
        size="sm"
        title="Ismni o'zgartirish"
        footer={
          <Button size="lg" fullWidth loading={renaming} onClick={() => void rename()}>
            Saqlash
          </Button>
        }
      >
        <Input label="Ism-familiya" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
      </Modal>

      {/* O'chirish */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        sheet
        size="sm"
        title="Xodimni o'chirish"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="lg" onClick={() => setDeleteTarget(null)}>
              Bekor qilish
            </Button>
            <Button variant="danger" size="lg" loading={deleting} onClick={() => void remove()}>
              O&rsquo;chirish
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-white">{deleteTarget?.name}</span> hisobini o&rsquo;chirmoqchimisiz?
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Sotuvlari mavjud bo&rsquo;lsa, hisob o&rsquo;chirilmaydi — faolsizlantiriladi (tarix saqlanadi).
        </p>
      </Modal>
    </div>
  );
}
