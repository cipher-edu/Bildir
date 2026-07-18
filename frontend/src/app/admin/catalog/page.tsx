"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Database, Plus, Pencil, Trash2, X, RefreshCw,
  Building2, BookOpen, Layers, Users2, ChevronRight,
  AlertCircle, CheckCircle,
} from "lucide-react";
import { catalogApi, catalogAdminApi } from "@/lib/api";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useToast } from "@/components/ToastProvider";

type Tab = "universities" | "faculties" | "specialties" | "subjects";

function ConfirmModal({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl border border-white/10 p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">O&apos;chirishni tasdiqlang</h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-[200px] truncate">{name}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 text-sm transition-colors">
            Bekor
          </button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors">
            O&apos;chirish
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Universities ──────────────────────────────────────────────
function UniversitiesTab({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({ name: "", short_name: "", code: "", city: "", domain: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["catalog-universities"],
    queryFn: () => catalogApi.universities(),
    staleTime: 60_000,
  });

  const universities = data?.data?.data ?? data?.data?.results ?? data?.data ?? [];

  const createMut = useMutation({
    mutationFn: () => catalogAdminApi.createUniversity(form as unknown as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog-universities"] });
      showSuccess("Universitet yaratildi");
      setShowForm(false);
      setForm({ name: "", short_name: "", code: "", city: "", domain: "" });
    },
    onError: () => showError("Xatolik", "Yaratib bo'lmadi"),
  });

  const updateMut = useMutation({
    mutationFn: () => catalogAdminApi.updateUniversity(editing!.id as string, form as unknown as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog-universities"] });
      showSuccess("Yangilandi");
      setEditing(null);
    },
    onError: () => showError("Xatolik", "Yangilash muvaffaqiyatsiz"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => catalogAdminApi.deleteUniversity(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog-universities"] });
      showSuccess("O'chirildi");
      setConfirmDel(null);
    },
    onError: () => showError("Xatolik", "O'chirib bo'lmadi"),
  });

  function startEdit(u: Record<string, unknown>) {
    setEditing(u);
    setForm({
      name: u.name as string || "", short_name: u.short_name as string || "",
      code: u.code as string || "", city: u.city as string || "", domain: u.domain as string || "",
    });
  }

  const isFormMode = showForm || !!editing;
  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{Array.isArray(universities) ? universities.length : 0} ta universitet</p>
        {isAdmin && (
          <button
            onClick={() => { setShowForm(true); setEditing(null); setForm({ name: "", short_name: "", code: "", city: "", domain: "" }); }}
            className="btn-primary flex items-center gap-1.5 text-xs px-3 py-2">
            <Plus className="w-3.5 h-3.5" /> Yangi
          </button>
        )}
      </div>

      {isFormMode && isAdmin && (
        <div className="glass rounded-2xl border border-white/10 p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white">{editing ? "Tahrirlash" : "Yangi universitet"}</h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">To&apos;liq nomi *</label>
              <input className="input-dark w-full text-sm py-2" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Universitet nomi" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Qisqa nomi</label>
              <input className="input-dark w-full text-sm py-2" value={form.short_name} onChange={e => setForm(p => ({ ...p, short_name: e.target.value }))} placeholder="NSPI" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Kod *</label>
              <input className="input-dark w-full text-sm py-2" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="NSPI" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Shahar</label>
              <input className="input-dark w-full text-sm py-2" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="Nukus" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">HEMIS domeni</label>
              <input className="input-dark w-full text-sm py-2" value={form.domain} onChange={e => setForm(p => ({ ...p, domain: e.target.value }))} placeholder="nspi.uz" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 btn-secondary text-sm py-2">Bekor</button>
            <button
              onClick={() => editing ? updateMut.mutate() : createMut.mutate()}
              disabled={saving || !form.name || !form.code}
              className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-2"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {editing ? "Saqlash" : "Yaratish"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 glass rounded-xl skeleton" />)}</div>
      ) : !Array.isArray(universities) || universities.length === 0 ? (
        <div className="glass rounded-2xl py-12 text-center border border-dashed border-white/10">
          <Building2 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Universitetlar topilmadi</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 bg-white/[0.02]">
                <th className="px-4 py-3 text-left font-medium">Nomi</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Kod</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Shahar</th>
                {isAdmin && <th className="px-4 py-3 text-right font-medium">Amallar</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {universities.map((u: Record<string, unknown>) => (
                <tr key={u.id as string} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{u.name as string}</p>
                    <p className="text-xs text-slate-500">{u.short_name as string}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden sm:table-cell">{u.code as string}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">{(u.city as string) || "—"}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => startEdit(u)} className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmDel({ id: u.id as string, name: u.name as string })} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmDel && (
        <ConfirmModal name={confirmDel.name} onConfirm={() => deleteMut.mutate(confirmDel.id)} onClose={() => setConfirmDel(null)} />
      )}
    </div>
  );
}

// ── Faculties ─────────────────────────────────────────────────
function FacultiesTab({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({ name: "", code: "", university: "" });

  const { data: unisData } = useQuery({ queryKey: ["catalog-universities"], queryFn: () => catalogApi.universities(), staleTime: 300_000 });
  const { data, isLoading } = useQuery({ queryKey: ["catalog-faculties-all"], queryFn: () => catalogApi.faculties(), staleTime: 60_000 });

  const universities = unisData?.data?.data ?? unisData?.data?.results ?? unisData?.data ?? [];
  const faculties    = data?.data?.data ?? data?.data?.results ?? data?.data ?? [];

  const createMut = useMutation({
    mutationFn: () => catalogAdminApi.createFaculty(form as unknown as Record<string, unknown>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["catalog-faculties-all"] }); showSuccess("Fakultet yaratildi"); setShowForm(false); setForm({ name: "", code: "", university: "" }); },
    onError: () => showError("Xatolik", "Yaratib bo'lmadi"),
  });

  const updateMut = useMutation({
    mutationFn: () => catalogAdminApi.updateFaculty(editing!.id as string, form as unknown as Record<string, unknown>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["catalog-faculties-all"] }); showSuccess("Yangilandi"); setEditing(null); },
    onError: () => showError("Xatolik", "Yangilash muvaffaqiyatsiz"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => catalogAdminApi.deleteFaculty(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["catalog-faculties-all"] }); showSuccess("O'chirildi"); setConfirmDel(null); },
    onError: () => showError("Xatolik", "O'chirib bo'lmadi"),
  });

  function startEdit(f: Record<string, unknown>) {
    setEditing(f);
    setForm({ name: f.name as string || "", code: f.code as string || "", university: f.university as string || "" });
  }

  const isFormMode = showForm || !!editing;
  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{Array.isArray(faculties) ? faculties.length : 0} ta fakultet</p>
        {isAdmin && (
          <button onClick={() => { setShowForm(true); setEditing(null); setForm({ name: "", code: "", university: "" }); }}
            className="btn-primary flex items-center gap-1.5 text-xs px-3 py-2">
            <Plus className="w-3.5 h-3.5" /> Yangi
          </button>
        )}
      </div>

      {isFormMode && isAdmin && (
        <div className="glass rounded-2xl border border-white/10 p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white">{editing ? "Tahrirlash" : "Yangi fakultet"}</h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Universitet *</label>
              <select className="input-dark w-full text-sm py-2" value={form.university} onChange={e => setForm(p => ({ ...p, university: e.target.value }))}>
                <option value="">Tanlang...</option>
                {Array.isArray(universities) && universities.map((u: Record<string, unknown>) => (
                  <option key={u.id as string} value={u.id as string}>{u.short_name as string || u.name as string}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nomi *</label>
              <input className="input-dark w-full text-sm py-2" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Fakultet nomi" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Kod</label>
              <input className="input-dark w-full text-sm py-2" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="FAK01" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 btn-secondary text-sm py-2">Bekor</button>
            <button onClick={() => editing ? updateMut.mutate() : createMut.mutate()} disabled={saving || !form.name || !form.university}
              className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-2">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {editing ? "Saqlash" : "Yaratish"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 glass rounded-xl skeleton" />)}</div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 bg-white/[0.02]">
                <th className="px-4 py-3 text-left font-medium">Nomi</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Universitet</th>
                {isAdmin && <th className="px-4 py-3 text-right font-medium">Amallar</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {Array.isArray(faculties) && faculties.map((f: Record<string, unknown>) => (
                <tr key={f.id as string} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{f.name as string}</p>
                    {f.code && <p className="text-xs text-slate-500">{f.code as string}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden sm:table-cell">{(f.university_name as string) || "—"}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => startEdit(f)} className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirmDel({ id: f.id as string, name: f.name as string })} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {confirmDel && <ConfirmModal name={confirmDel.name} onConfirm={() => deleteMut.mutate(confirmDel.id)} onClose={() => setConfirmDel(null)} />}
    </div>
  );
}

// ── Specialties ───────────────────────────────────────────────
function SpecialtiesTab({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({ name: "", code: "", faculty: "" });

  const { data: facData } = useQuery({ queryKey: ["catalog-faculties-all"], queryFn: () => catalogApi.faculties(), staleTime: 300_000 });
  const { data, isLoading } = useQuery({ queryKey: ["catalog-specialties-all"], queryFn: () => catalogApi.specialties(), staleTime: 60_000 });

  const faculties   = facData?.data?.data ?? facData?.data?.results ?? facData?.data ?? [];
  const specialties = data?.data?.data ?? data?.data?.results ?? data?.data ?? [];

  const createMut = useMutation({
    mutationFn: () => catalogAdminApi.createSpecialty(form as unknown as Record<string, unknown>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["catalog-specialties-all"] }); showSuccess("Mutaxassislik yaratildi"); setShowForm(false); setForm({ name: "", code: "", faculty: "" }); },
    onError: () => showError("Xatolik", "Yaratib bo'lmadi"),
  });

  const updateMut = useMutation({
    mutationFn: () => catalogAdminApi.updateSpecialty(editing!.id as string, form as unknown as Record<string, unknown>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["catalog-specialties-all"] }); showSuccess("Yangilandi"); setEditing(null); },
    onError: () => showError("Xatolik", "Yangilash muvaffaqiyatsiz"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => catalogAdminApi.deleteSpecialty(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["catalog-specialties-all"] }); showSuccess("O'chirildi"); setConfirmDel(null); },
    onError: () => showError("Xatolik", "O'chirib bo'lmadi"),
  });

  function startEdit(s: Record<string, unknown>) {
    setEditing(s);
    setForm({ name: s.name as string || "", code: s.code as string || "", faculty: s.faculty as string || "" });
  }

  const isFormMode = showForm || !!editing;
  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{Array.isArray(specialties) ? specialties.length : 0} ta mutaxassislik</p>
        {isAdmin && (
          <button onClick={() => { setShowForm(true); setEditing(null); setForm({ name: "", code: "", faculty: "" }); }}
            className="btn-primary flex items-center gap-1.5 text-xs px-3 py-2"><Plus className="w-3.5 h-3.5" /> Yangi</button>
        )}
      </div>

      {isFormMode && isAdmin && (
        <div className="glass rounded-2xl border border-white/10 p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white">{editing ? "Tahrirlash" : "Yangi mutaxassislik"}</h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Fakultet *</label>
              <select className="input-dark w-full text-sm py-2" value={form.faculty} onChange={e => setForm(p => ({ ...p, faculty: e.target.value }))}>
                <option value="">Tanlang...</option>
                {Array.isArray(faculties) && faculties.map((f: Record<string, unknown>) => (
                  <option key={f.id as string} value={f.id as string}>{f.name as string}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nomi *</label>
              <input className="input-dark w-full text-sm py-2" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Mutaxassislik nomi" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Kod</label>
              <input className="input-dark w-full text-sm py-2" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="5111000" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 btn-secondary text-sm py-2">Bekor</button>
            <button onClick={() => editing ? updateMut.mutate() : createMut.mutate()} disabled={saving || !form.name || !form.faculty}
              className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-2">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {editing ? "Saqlash" : "Yaratish"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 glass rounded-xl skeleton" />)}</div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 bg-white/[0.02]">
                <th className="px-4 py-3 text-left font-medium">Mutaxassislik</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Fakultet</th>
                {isAdmin && <th className="px-4 py-3 text-right font-medium">Amallar</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {Array.isArray(specialties) && specialties.map((s: Record<string, unknown>) => (
                <tr key={s.id as string} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{s.name as string}</p>
                    {s.code && <p className="text-xs text-slate-500">{s.code as string}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden sm:table-cell">{(s.faculty_name as string) || "—"}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => startEdit(s)} className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirmDel({ id: s.id as string, name: s.name as string })} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {confirmDel && <ConfirmModal name={confirmDel.name} onConfirm={() => deleteMut.mutate(confirmDel.id)} onClose={() => setConfirmDel(null)} />}
    </div>
  );
}

// ── Subjects ──────────────────────────────────────────────────
function SubjectsTab({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [confirmDel, setConfirmDel] = useState<{ id: number; name: string } | null>(null);
  const [form, setForm] = useState({ name: "", code: "", faculty: "", credit_hours: "3" });

  const { data: facData } = useQuery({ queryKey: ["catalog-faculties-all"], queryFn: () => catalogApi.faculties(), staleTime: 300_000 });
  const { data, isLoading } = useQuery({
    queryKey: ["catalog-subjects-all"],
    queryFn: () => catalogApi.subjectsPaged({ page_size: "100" }),
    staleTime: 60_000,
  });

  const faculties = facData?.data?.data ?? facData?.data?.results ?? facData?.data ?? [];
  const rawSubj   = data?.data?.data ?? data?.data?.results ?? data?.data ?? [];
  const subjects  = Array.isArray(rawSubj) ? rawSubj : (rawSubj?.data ?? []);

  const createMut = useMutation({
    mutationFn: () => catalogAdminApi.createSubject({ ...form, credit_hours: parseInt(form.credit_hours) || 3 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["catalog-subjects-all"] }); showSuccess("Fan yaratildi"); setShowForm(false); setForm({ name: "", code: "", faculty: "", credit_hours: "3" }); },
    onError: () => showError("Xatolik", "Yaratib bo'lmadi"),
  });

  const updateMut = useMutation({
    mutationFn: () => catalogAdminApi.updateSubject(editing!.id as number, { ...form, credit_hours: parseInt(form.credit_hours) || 3 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["catalog-subjects-all"] }); showSuccess("Yangilandi"); setEditing(null); },
    onError: () => showError("Xatolik", "Yangilash muvaffaqiyatsiz"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => catalogAdminApi.deleteSubject(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["catalog-subjects-all"] }); showSuccess("O'chirildi"); setConfirmDel(null); },
    onError: () => showError("Xatolik", "O'chirib bo'lmadi"),
  });

  function startEdit(s: Record<string, unknown>) {
    setEditing(s);
    setForm({ name: s.name as string || "", code: s.code as string || "", faculty: s.faculty as string || "", credit_hours: String(s.credit_hours || 3) });
  }

  const isFormMode = showForm || !!editing;
  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{Array.isArray(subjects) ? subjects.length : 0} ta fan</p>
        {isAdmin && (
          <button onClick={() => { setShowForm(true); setEditing(null); setForm({ name: "", code: "", faculty: "", credit_hours: "3" }); }}
            className="btn-primary flex items-center gap-1.5 text-xs px-3 py-2"><Plus className="w-3.5 h-3.5" /> Yangi</button>
        )}
      </div>

      {isFormMode && isAdmin && (
        <div className="glass rounded-2xl border border-white/10 p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white">{editing ? "Tahrirlash" : "Yangi fan"}</h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Fakultet</label>
              <select className="input-dark w-full text-sm py-2" value={form.faculty} onChange={e => setForm(p => ({ ...p, faculty: e.target.value }))}>
                <option value="">Tanlang...</option>
                {Array.isArray(faculties) && faculties.map((f: Record<string, unknown>) => (
                  <option key={f.id as string} value={f.id as string}>{f.name as string}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nomi *</label>
              <input className="input-dark w-full text-sm py-2" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Fan nomi" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Kod</label>
              <input className="input-dark w-full text-sm py-2" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="MAT101" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Kredit soat</label>
              <input type="number" min={1} max={10} className="input-dark w-full text-sm py-2" value={form.credit_hours} onChange={e => setForm(p => ({ ...p, credit_hours: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 btn-secondary text-sm py-2">Bekor</button>
            <button onClick={() => editing ? updateMut.mutate() : createMut.mutate()} disabled={saving || !form.name}
              className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-2">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {editing ? "Saqlash" : "Yaratish"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 glass rounded-xl skeleton" />)}</div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 bg-white/[0.02]">
                <th className="px-4 py-3 text-left font-medium">Fan nomi</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Fakultet</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Kredit</th>
                {isAdmin && <th className="px-4 py-3 text-right font-medium">Amallar</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {Array.isArray(subjects) && subjects.map((s: Record<string, unknown>) => (
                <tr key={s.id as number} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{s.name as string}</p>
                    {s.code && <p className="text-xs text-slate-500">{s.code as string}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden sm:table-cell">{(s.faculty_name as string) || "—"}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">{(s.credit_hours as number) || "—"}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => startEdit(s)} className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirmDel({ id: s.id as number, name: s.name as string })} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {confirmDel && <ConfirmModal name={confirmDel.name} onConfirm={() => deleteMut.mutate(confirmDel.id)} onClose={() => setConfirmDel(null)} />}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "universities", label: "Universitetlar", icon: Building2 },
  { id: "faculties",    label: "Fakultetlar",    icon: Layers },
  { id: "specialties",  label: "Mutaxassislik",  icon: Users2 },
  { id: "subjects",     label: "Fanlar",         icon: BookOpen },
];

export default function AdminCatalogPage() {
  const { user } = useRoleGuard(["staff"]);
  const [tab, setTab] = useState<Tab>("universities");

  if (!user) return null;

  const isAdmin = ["admin", "superadmin"].includes(user.role);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" /> Katalog boshqaruvi
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Tizim kataloglarini boshqarish</p>
        </div>
        {!isAdmin && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
            <AlertCircle className="w-4 h-4" /> Faqat ko&apos;rish
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
              tab === id
                ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                : "border-white/[0.07] text-slate-400 hover:bg-white/5 hover:text-white"
            }`}>
            <Icon className="w-4 h-4" />
            {label}
            {tab === id && <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ))}
      </div>

      {tab === "universities" && <UniversitiesTab isAdmin={isAdmin} />}
      {tab === "faculties"    && <FacultiesTab    isAdmin={isAdmin} />}
      {tab === "specialties"  && <SpecialtiesTab  isAdmin={isAdmin} />}
      {tab === "subjects"     && <SubjectsTab     isAdmin={isAdmin} />}
    </div>
  );
}
