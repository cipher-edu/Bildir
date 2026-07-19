"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase, Loader2, Plus, Pencil, Trash2, Phone, Mail,
  MapPin, Clock, X, Save, UserRound, Sparkles, Building2,
  GraduationCap, Eye, EyeOff,
} from "lucide-react";
import { officeApi } from "@/lib/api";
import type { ResponsiblePerson } from "@/types";

function unwrap<T>(res: { data?: unknown }): T {
  const body = res.data as { data?: T } | T;
  if (body && typeof body === "object" && "data" in (body as object)) {
    return (body as { data: T }).data;
  }
  return body as T;
}

function mediaUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const host = process.env.NEXT_PUBLIC_MEDIA_URL || "http://127.0.0.1:8000";
  return `${host.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
}

const emptyForm = {
  first_name: "",
  last_name: "",
  middle_name: "",
  position: "",
  department: "",
  academic_title: "",
  phone: "",
  email: "",
  office_room: "",
  reception_hours: "",
  biography: "",
  responsibilities: "",
  extra_info: "",
  order: "0",
  is_active: true,
  is_public: true,
};

const GRADIENTS = [
  "from-indigo-500/30 via-violet-600/10 to-transparent",
  "from-cyan-500/25 via-blue-600/10 to-transparent",
  "from-fuchsia-500/25 via-pink-600/10 to-transparent",
  "from-amber-500/20 via-orange-600/10 to-transparent",
  "from-emerald-500/25 via-teal-600/10 to-transparent",
];

export default function AdminOfficialsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["office-persons-admin"],
    queryFn: async () => unwrap<ResponsiblePerson[]>(await officeApi.persons({ all: "1" })),
  });

  const persons = useMemo(() => data ?? [], [data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === "is_active" || k === "is_public") {
          fd.append(k, v ? "true" : "false");
        } else {
          fd.append(k, String(v ?? ""));
        }
      });
      if (photo) fd.append("photo", photo);
      if (editId) return officeApi.updatePerson(editId, fd);
      return officeApi.createPerson(fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["office-persons-admin"] });
      setOpen(false);
      setEditId(null);
      setForm(emptyForm);
      setPhoto(null);
      setErr(null);
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: { detail?: unknown } } };
      const d = ax.response?.data?.detail;
      setErr(typeof d === "string" ? d : "Saqlashda xatolik");
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => officeApi.deletePerson(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["office-persons-admin"] }),
  });

  function startCreate() {
    setEditId(null);
    setForm(emptyForm);
    setPhoto(null);
    setErr(null);
    setOpen(true);
  }

  function startEdit(p: ResponsiblePerson) {
    setEditId(p.id);
    setForm({
      first_name: p.first_name || "",
      last_name: p.last_name || "",
      middle_name: p.middle_name || "",
      position: p.position || "",
      department: p.department || "",
      academic_title: p.academic_title || "",
      phone: p.phone || "",
      email: p.email || "",
      office_room: p.office_room || "",
      reception_hours: p.reception_hours || "",
      biography: p.biography || "",
      responsibilities: p.responsibilities || "",
      extra_info: p.extra_info || "",
      order: String(p.order ?? 0),
      is_active: p.is_active,
      is_public: p.is_public,
    });
    setPhoto(null);
    setErr(null);
    setOpen(true);
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Hero header */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.08] p-6 sm:p-7">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/25 via-[#0c1224] to-indigo-700/30" />
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 w-32 h-32 rounded-full bg-violet-500/15 blur-2xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white text-cyan-700 flex items-center justify-center shadow-[0_0_28px_rgba(34,211,238,0.35)] shrink-0">
              <Briefcase className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-cyan-200/80 flex items-center gap-1.5 mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Rahbariyat katalogi
              </p>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Rahbariyat
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-md">
                Surat, lavozim, qabul soatlari va rahbar uchun kerakli barcha ma&apos;lumotlar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-2.5 text-center backdrop-blur-sm">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Jami</p>
              <p className="text-2xl font-black text-white tabular-nums">{persons.length}</p>
            </div>
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-sm font-bold shadow-[0_8px_28px_rgba(6,182,212,0.3)]"
            >
              <Plus className="w-4 h-4" /> Qo&apos;shish
            </button>
          </div>
        </div>
      </section>

      {isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-72 rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {persons.map((p, i) => {
          const img = mediaUrl(p.photo_url || p.photo);
          const grad = GRADIENTS[i % GRADIENTS.length];
          return (
            <article
              key={p.id}
              className="group relative flex flex-col rounded-[1.5rem] border border-white/[0.08] overflow-hidden bg-[#0a1020]/80 hover:border-cyan-400/30 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-20px_rgba(34,211,238,0.25)] transition-all duration-300"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${grad} opacity-80 pointer-events-none`} />
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

              <div className="relative p-5 flex flex-col flex-1 gap-4">
                <div className="flex gap-3.5">
                  <div className="relative shrink-0">
                    <div className="w-[4.5rem] h-[4.5rem] rounded-2xl overflow-hidden bg-white/5 border-2 border-white/15 shadow-lg ring-2 ring-cyan-400/10">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                          <UserRound className="w-8 h-8 text-slate-500" />
                        </div>
                      )}
                    </div>
                    {p.is_active && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0a1020]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h2 className="font-bold text-white text-[15px] leading-snug">
                      {p.full_name || `${p.last_name} ${p.first_name}`}
                    </h2>
                    <p className="text-xs text-cyan-200/90 mt-1 font-medium line-clamp-2">
                      {p.position}
                    </p>
                    {p.academic_title && (
                      <p className="text-[10px] text-violet-300/80 mt-1 flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" />
                        {p.academic_title}
                      </p>
                    )}
                  </div>
                </div>

                {p.department && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 rounded-xl bg-black/25 border border-white/[0.05] px-2.5 py-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{p.department}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                  {p.phone && (
                    <a href={`tel:${p.phone}`} className="flex items-center gap-2 text-slate-300 hover:text-cyan-200 transition-colors">
                      <span className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                        <Phone className="w-3 h-3 text-cyan-400/80" />
                      </span>
                      {p.phone}
                    </a>
                  )}
                  {p.email && (
                    <a href={`mailto:${p.email}`} className="flex items-center gap-2 text-slate-300 hover:text-cyan-200 transition-colors min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                        <Mail className="w-3 h-3 text-violet-400/80" />
                      </span>
                      <span className="truncate">{p.email}</span>
                    </a>
                  )}
                  {p.office_room && (
                    <p className="flex items-center gap-2 text-slate-400">
                      <span className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                        <MapPin className="w-3 h-3 text-amber-400/80" />
                      </span>
                      {p.office_room}
                    </p>
                  )}
                  {p.reception_hours && (
                    <p className="flex items-center gap-2 text-slate-400">
                      <span className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                        <Clock className="w-3 h-3 text-emerald-400/80" />
                      </span>
                      {p.reception_hours}
                    </p>
                  )}
                </div>

                {(p.biography || p.responsibilities) && (
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed border-t border-white/[0.05] pt-3">
                    {p.biography || p.responsibilities}
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {!p.is_active && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full border border-rose-400/30 bg-rose-500/10 text-rose-200 font-semibold">
                      Nofaol
                    </span>
                  )}
                  {p.is_public ? (
                    <span className="text-[9px] px-2 py-0.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 text-emerald-200 font-semibold inline-flex items-center gap-1">
                      <Eye className="w-2.5 h-2.5" /> Ochiq
                    </span>
                  ) : (
                    <span className="text-[9px] px-2 py-0.5 rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-200 font-semibold inline-flex items-center gap-1">
                      <EyeOff className="w-2.5 h-2.5" /> Yashirin
                    </span>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-slate-200 hover:bg-white/[0.08] hover:border-cyan-400/30 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Tahrir
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("O'chirishni tasdiqlaysizmi?")) delMut.mutate(p.id);
                    }}
                    className="px-3.5 py-2.5 rounded-xl border border-rose-500/25 text-rose-300 hover:bg-rose-500/15 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!isLoading && persons.length === 0 && (
        <div className="rounded-[1.75rem] border border-dashed border-white/12 bg-white/[0.02] p-14 text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-7 h-7 text-cyan-400/70" />
          </div>
          <p className="text-lg font-bold text-slate-200">Hali kiritilmagan</p>
          <p className="text-sm text-slate-500 mt-2">Birinchi rahbariyat a&apos;zosini qo&apos;shing</p>
          <button
            type="button"
            onClick={startCreate}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> Qo&apos;shish
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-[1.75rem] sm:rounded-[1.75rem] border border-white/12 bg-gradient-to-b from-[#121a32] to-[#0a1020] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/[0.07] bg-[#121a32]/95 backdrop-blur-xl">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-cyan-300/80 font-semibold">
                  {editId ? "Tahrirlash" : "Yangi"}
                </p>
                <h3 className="font-bold text-white text-lg">Rahbariyat a&apos;zosi</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {err && (
                <p className="text-sm text-rose-200 bg-rose-500/15 border border-rose-400/25 rounded-xl px-3 py-2">
                  {err}
                </p>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                {(
                  [
                    ["last_name", "Familiya *"],
                    ["first_name", "Ism *"],
                    ["middle_name", "Otasining ismi"],
                    ["position", "Lavozim *"],
                    ["department", "Bo'lim / fakultet"],
                    ["academic_title", "Ilmiy unvon"],
                    ["phone", "Telefon"],
                    ["email", "Email"],
                    ["office_room", "Kabinet"],
                    ["reception_hours", "Qabul soatlari"],
                    ["order", "Tartib raqami"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block text-[11px] text-slate-400 space-y-1.5 font-medium">
                    {label}
                    <input
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/35 border border-white/10 text-sm text-white focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/15"
                    />
                  </label>
                ))}
              </div>

              {(
                [
                  ["biography", "Biografiya"],
                  ["responsibilities", "Vazifalar / mas'uliyat"],
                  ["extra_info", "Qo'shimcha ma'lumot"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-[11px] text-slate-400 space-y-1.5 font-medium">
                  {label}
                  <textarea
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/35 border border-white/10 text-sm text-white resize-y focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/15"
                  />
                </label>
              ))}

              <label className="flex flex-col items-center gap-2 px-4 py-5 rounded-2xl border border-dashed border-cyan-400/25 bg-cyan-500/[0.05] cursor-pointer hover:bg-cyan-500/10 transition-colors text-center">
                <UserRound className="w-8 h-8 text-cyan-400/70" />
                <span className="text-xs text-slate-300 font-medium">
                  {photo ? photo.name : "Surat yuklash"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>

              <div className="flex flex-wrap gap-4 text-xs text-slate-300">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    className="rounded"
                  />
                  Faol
                </label>
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_public}
                    onChange={(e) => setForm((f) => ({ ...f, is_public: e.target.checked }))}
                    className="rounded"
                  />
                  Foydalanuvchilarga ko&apos;rsatish
                </label>
              </div>

              <button
                type="button"
                disabled={saveMut.isPending || !form.first_name || !form.last_name || !form.position}
                onClick={() => saveMut.mutate()}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white text-sm font-bold shadow-[0_8px_28px_rgba(6,182,212,0.3)]"
              >
                {saveMut.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
