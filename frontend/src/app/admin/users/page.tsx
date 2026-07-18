"use client";
import { useState, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Search, Filter, UserCheck, UserX, Shield,
  ChevronDown, Plus, X, Eye, EyeOff, RefreshCw, AlertCircle,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useToast } from "@/components/ToastProvider";
import { ROLE_LABELS } from "@/lib/roles";
import { UserRole } from "@/types";

const ROLE_BADGE: Record<string, string> = {
  student:         "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  teacher:         "bg-violet-500/10 text-violet-400 border-violet-500/20",
  methodist:       "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  department_head: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  proctor:         "bg-red-500/10 text-red-400 border-red-500/20",
  admin:           "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  superadmin:      "bg-rose-500/10 text-rose-400 border-rose-500/20",
  audit_inspector: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  is_active: boolean;
  phone?: string;
  student_id?: string;
  hemis_id?: string;
  faculty_name?: string;
  created_at: string;
}

interface CreateForm {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role: string;
}

export default function AdminUsersPage() {
  const { user } = useRoleGuard(["staff"]);
  const qc = useQueryClient();
  const { showSuccess, showError } = useToast();

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterActive, setFilterActive] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<Record<string, string>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({
    email: "", first_name: "", last_name: "", password: "", role: "teacher",
  });
  const [showPwd, setShowPwd] = useState(false);

  const isSuperadmin = ["superadmin", "audit_inspector"].includes(user?.role ?? "");
  const isAdminRole  = ["admin", "superadmin", "audit_inspector"].includes(user?.role ?? "");

  const params: Record<string, string> = { page: String(page), page_size: "30" };
  if (filterRole !== "all")   params.role      = filterRole;
  if (filterActive !== "all") params.is_active = filterActive;
  if (search)                 params.search    = search;

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users", params],
    queryFn: async () => {
      const res = await adminApi.users(params);
      const payload = res.data?.data ?? res.data ?? {};
      const rows = payload?.data ?? payload?.results ?? payload ?? [];
      return {
        data: Array.isArray(rows) ? rows : [],
        meta: payload?.meta ?? { total: 0, page: 1, page_size: 30 },
      };
    },
    staleTime: 30_000,
    enabled: isAdminRole,
  });

  const users: UserRow[] = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, page_size: 30 };
  const totalPages = Math.ceil(meta.total / meta.page_size) || 1;

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminApi.updateUser(id, { is_active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); showSuccess("Holat yangilandi"); },
    onError: () => showError("Xatolik", "Holat o'zgartirish muvaffaqiyatsiz"),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      adminApi.updateUser(id, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      showSuccess("Rol yangilandi");
      setExpandedId(null);
    },
    onError: () => showError("Xatolik", "Rol o'zgartirish muvaffaqiyatsiz"),
  });

  const createUser = useMutation({
    mutationFn: () => adminApi.createUser(createForm as unknown as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      showSuccess("Foydalanuvchi yaratildi");
      setShowCreate(false);
      setCreateForm({ email: "", first_name: "", last_name: "", password: "", role: "teacher" });
    },
    onError: () => showError("Xatolik", "Foydalanuvchi yaratib bo'lmadi"),
  });

  if (!user) return null;

  if (!isAdminRole) {
    return (
      <div className="glass rounded-2xl py-16 text-center border border-amber-500/20">
        <Shield className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <p className="text-slate-300 font-medium">Ruxsat yo'q</p>
        <p className="text-slate-500 text-sm mt-1">Bu sahifa faqat admin uchun</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" /> Foydalanuvchilar
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Jami {meta.total} ta foydalanuvchi</p>
        </div>
        {isSuperadmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
          >
            <Plus className="w-4 h-4" /> Yangi foydalanuvchi
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="input-dark pl-9 py-2 text-sm w-full"
            placeholder="Ism, email yoki ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <select
            className="input-dark pl-8 py-2 text-sm appearance-none pr-8"
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
          >
            <option value="all">Barcha rollar</option>
            {Object.entries(ROLE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <select
          className="input-dark py-2 text-sm appearance-none px-3"
          value={filterActive}
          onChange={(e) => { setFilterActive(e.target.value); setPage(1); }}
        >
          <option value="all">Barcha holat</option>
          <option value="true">Faol</option>
          <option value="false">Nofaol</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="glass rounded-2xl py-12 text-center border border-red-500/20">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">Backend API ga ulanib bo'lmadi</p>
          <p className="text-slate-500 text-sm mt-1">/api/v1/auth/users/ endpointi mavjudligini tekshiring</p>
        </div>
      )}

      {/* Table */}
      {!error && (
        <div className="glass rounded-2xl overflow-hidden border border-white/[0.05]">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 bg-white/[0.02] animate-pulse rounded-lg" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">Foydalanuvchi topilmadi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-slate-400 bg-white/[0.02]">
                    <th className="px-5 py-3.5 font-medium">Foydalanuvchi</th>
                    <th className="px-5 py-3.5 font-medium">Rol</th>
                    <th className="px-5 py-3.5 font-medium">Holat</th>
                    <th className="px-5 py-3.5 font-medium hidden sm:table-cell">Sana</th>
                    <th className="px-5 py-3.5 font-medium text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {users.map((u) => (
                    <Fragment key={u.id}>
                      <tr
                        className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                        onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
                              {(u.first_name || u.email).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-white text-sm">
                                {u.full_name || `${u.first_name} ${u.last_name}`.trim() || u.email}
                              </p>
                              <p className="text-xs text-slate-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${ROLE_BADGE[u.role] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}>
                            {ROLE_LABELS[u.role as UserRole] ?? u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${u.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                            {u.is_active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                            {u.is_active ? "Faol" : "Nofaol"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 text-xs hidden sm:table-cell">
                          {new Date(u.created_at).toLocaleDateString("uz-UZ")}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <ChevronDown className={`w-4 h-4 text-slate-500 inline transition-transform ${expandedId === u.id ? "rotate-180" : ""}`} />
                        </td>
                      </tr>

                      {expandedId === u.id && (
                        <tr key={`${u.id}-exp`} className="bg-white/[0.015]">
                          <td colSpan={5} className="px-5 py-4">
                            <div className="flex flex-wrap gap-6 items-start">
                              <div className="text-xs text-slate-400 space-y-1 min-w-48">
                                {u.student_id && <p>ID: <span className="text-white">{u.student_id}</span></p>}
                                {u.hemis_id   && <p>HEMIS ID: <span className="text-white">{u.hemis_id}</span></p>}
                                {u.phone      && <p>Tel: <span className="text-white">{u.phone}</span></p>}
                                {u.faculty_name && <p>Fakultet: <span className="text-white">{u.faculty_name}</span></p>}
                              </div>

                              <button
                                onClick={() => toggleActive.mutate({ id: u.id, is_active: !u.is_active })}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${u.is_active ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20"}`}
                                disabled={toggleActive.isPending}
                              >
                                {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                {u.is_active ? "Deaktiv qilish" : "Aktivlashtirish"}
                              </button>

                              {isSuperadmin && (
                                <div className="flex items-center gap-2">
                                  <Shield className="w-4 h-4 text-slate-500" />
                                  <select
                                    className="input-dark py-1.5 text-sm"
                                    value={editRole[u.id] ?? u.role}
                                    onChange={(e) => setEditRole((prev) => ({ ...prev, [u.id]: e.target.value }))}
                                  >
                                    {Object.entries(ROLE_LABELS).map(([v, l]) => (
                                      <option key={v} value={v}>{l}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => changeRole.mutate({ id: u.id, role: editRole[u.id] ?? u.role })}
                                    className="btn-primary text-xs px-3 py-1.5"
                                    disabled={changeRole.isPending || (editRole[u.id] ?? u.role) === u.role}
                                  >
                                    Saqlash
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
              <p className="text-xs text-slate-500">
                {meta.total} tadan {(page - 1) * meta.page_size + 1}–{Math.min(page * meta.page_size, meta.total)}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 disabled:opacity-40 text-sm transition-colors">
                  ← Oldingi
                </button>
                <span className="px-3 py-1.5 text-slate-400 text-sm">{page}/{totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 disabled:opacity-40 text-sm transition-colors">
                  Keyingi →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      {showCreate && isSuperadmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl w-full max-w-md border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" /> Yangi foydalanuvchi
              </h2>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Ism</label>
                  <input className="input-dark w-full text-sm py-2" placeholder="Ism"
                    value={createForm.first_name}
                    onChange={(e) => setCreateForm((p) => ({ ...p, first_name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Familiya</label>
                  <input className="input-dark w-full text-sm py-2" placeholder="Familiya"
                    value={createForm.last_name}
                    onChange={(e) => setCreateForm((p) => ({ ...p, last_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email</label>
                <input type="email" className="input-dark w-full text-sm py-2" placeholder="email@example.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Parol</label>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"} className="input-dark w-full text-sm py-2 pr-10"
                    placeholder="Kamida 8 belgi"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} />
                  <button type="button" onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Rol</label>
                <select className="input-dark w-full text-sm py-2" value={createForm.role}
                  onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}>
                  {Object.entries(ROLE_LABELS)
                    .filter(([v]) => v !== "student")
                    .map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 btn-secondary text-sm py-2">
                  Bekor qilish
                </button>
                <button
                  onClick={() => createUser.mutate()}
                  disabled={createUser.isPending || !createForm.email || !createForm.password}
                  className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-2"
                >
                  {createUser.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Yaratish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
