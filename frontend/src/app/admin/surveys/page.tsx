"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList, Plus, Search, RefreshCw, AlertCircle,
  Lock, Users, Eye, EyeOff, Trash2, ChevronRight,
} from "lucide-react";
import { surveysApi } from "@/lib/api";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useToast } from "@/components/ToastProvider";
import type { Survey, SurveyAudience, SurveyPrivacyMode } from "@/types";

const STATUS_BADGE: Record<string, string> = {
  draft:     "bg-slate-500/15 text-slate-300 border-slate-500/25",
  published: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  closed:    "bg-amber-500/15 text-amber-300 border-amber-500/25",
  archived:  "bg-rose-500/15 text-rose-300 border-rose-500/25",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Qoralama", published: "Nashr", closed: "Yopilgan", archived: "Arxiv",
};

const AUDIENCE_LABEL: Record<string, string> = {
  students: "Talabalar", staff: "Xodimlar", all: "Hammasi",
};

function unwrapList(res: { data?: unknown }): Survey[] {
  const payload = (res as { data?: { data?: unknown } }).data;
  const inner = (payload as { data?: unknown })?.data ?? payload;
  if (Array.isArray(inner)) return inner as Survey[];
  if (inner && typeof inner === "object" && Array.isArray((inner as { data?: unknown }).data)) {
    return (inner as { data: Survey[] }).data;
  }
  return [];
}

function apiErrorMessage(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    try {
      const parts: string[] = [];
      for (const [k, v] of Object.entries(detail as Record<string, unknown>)) {
        const msg = Array.isArray(v) ? v.join(", ") : String(v);
        parts.push(`${k}: ${msg}`);
      }
      if (parts.length) return parts.join("; ");
    } catch { /* ignore */ }
  }
  return fallback;
}

export default function AdminSurveysPage() {
  const router = useRouter();
  const { user, isReady } = useRoleGuard(["staff"]);
  const qc = useQueryClient();
  const { showSuccess, showError } = useToast();

  const canEdit = ["admin", "superadmin"].includes(user?.role ?? "");
  const canView = ["admin", "superadmin", "audit_inspector"].includes(user?.role ?? "");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Survey | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    audience: "students" as SurveyAudience,
    privacy_mode: "anonymous" as SurveyPrivacyMode,
    /** false = admin ham «kim javob bergan» ro'yxatini ko'rmaydi */
    track_participation: true,
  });

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-surveys", statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await surveysApi.list(params);
      return unwrapList(res);
    },
    enabled: isReady && canView,
    staleTime: 15_000,
  });

  const surveys = (data ?? []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.title.toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q);
  });

  const createMut = useMutation({
    mutationFn: () =>
      surveysApi.create({
        title: form.title.trim(),
        description: form.description.trim(),
        audience: form.audience,
        privacy_mode: form.privacy_mode,
        stats_level: "coarse",
        store_group_meta: true,
        track_participation: form.track_participation,
        study_years: [],
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin-surveys"] });
      showSuccess("So'rovnoma yaratildi", "Endi savollar qo'shing");
      setShowCreate(false);
      setForm({
        title: "",
        description: "",
        audience: "students",
        privacy_mode: "anonymous",
        track_participation: true,
      });
      const body = res.data as { data?: { id?: string }; id?: string } | undefined;
      const id = body?.data?.id ?? body?.id;
      if (id) {
        // Avval auditoriya (fakultet/guruh) tanlash
        router.push(`/admin/surveys/${id}?tab=settings`);
      }
    },
    onError: (err: unknown) => {
      showError("Xatolik", apiErrorMessage(err, "Yaratib bo'lmadi"));
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => surveysApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-surveys"] });
      showSuccess("O'chirildi");
      setConfirmDel(null);
    },
    onError: (err: unknown) => {
      showError("Xatolik", apiErrorMessage(err, "O'chirib bo'lmadi"));
    },
  });

  if (!isReady || !user) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="glass rounded-2xl p-8 border border-white/[0.06] text-center text-slate-400">
        Bu bo&apos;limga ruxsat yo&apos;q.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-400" />
            So&apos;rovnomalar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Yaratish → savollar → nashr → QR va natijalar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Yangilash"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Yangi so&apos;rovnoma
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Qidirish..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none"
        >
          <option value="all">Barcha holat</option>
          <option value="draft">Qoralama</option>
          <option value="published">Nashr</option>
          <option value="closed">Yopilgan</option>
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm glass rounded-xl p-4 border border-red-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <div>
            <p>Yuklashda xatolik</p>
            <button type="button" onClick={() => refetch()} className="text-indigo-400 text-xs hover:underline mt-1">
              Qayta urinish
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : surveys.length === 0 ? (
        <div className="glass rounded-2xl p-12 border border-white/[0.06] text-center">
          <ClipboardList className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">So&apos;rovnoma yo&apos;q</p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-4 text-indigo-400 text-sm hover:underline"
            >
              Birinchisini yarating
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {surveys.map((s) => (
            <div
              key={s.id}
              className="glass rounded-2xl border border-white/[0.06] p-4 hover:border-indigo-500/20 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Link
                      href={`/admin/surveys/${s.id}${s.status === "draft" && !(s.question_count) ? "?tab=settings" : ""}`}
                      className="font-semibold text-white hover:text-indigo-300 truncate"
                    >
                      {s.title}
                    </Link>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[s.status] || STATUS_BADGE.draft}`}>
                      {STATUS_LABEL[s.status] || s.status}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-slate-400 flex items-center gap-1">
                      {s.privacy_mode === "anonymous" ? (
                        <><EyeOff className="w-3 h-3" /> Anonim</>
                      ) : (
                        <><Eye className="w-3 h-3" /> Ochiq</>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {AUDIENCE_LABEL[s.audience] || s.audience}
                    </span>
                    <span>{s.question_count ?? 0} savol</span>
                    <span>{s.response_count ?? 0} javob</span>
                    {s.start_at && (
                      <span>dan {new Date(s.start_at).toLocaleDateString("uz-UZ")}</span>
                    )}
                    {s.end_at && (
                      <span>gacha {new Date(s.end_at).toLocaleDateString("uz-UZ")}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {canEdit && s.status === "draft" && (
                    <button
                      type="button"
                      onClick={() => setConfirmDel(s)}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <Link
                    href={`/admin/surveys/${s.id}`}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !createMut.isPending) setShowCreate(false);
          }}
        >
          <div className="glass rounded-2xl border border-white/10 p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white">Yangi so&apos;rovnoma</h2>
            <p className="text-xs text-slate-500">
              Qoralama yaratiladi. Keyin savollar qo&apos;shib nashr qilasiz.
            </p>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Sarlavha *</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && form.title.trim() && !createMut.isPending) {
                    createMut.mutate();
                  }
                }}
                autoFocus
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                placeholder="Masalan: O'quv sifati so'rovnomasi"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Tavsif</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500/50 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Auditoriya</label>
                <select
                  value={form.audience}
                  onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value as SurveyAudience }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300"
                >
                  <option value="students">Talabalar</option>
                  <option value="staff">Xodimlar</option>
                  <option value="all">Hammasi</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Maxfiylik</label>
                <select
                  value={form.privacy_mode}
                  onChange={(e) => setForm((f) => ({ ...f, privacy_mode: e.target.value as SurveyPrivacyMode }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300"
                >
                  <option value="anonymous">Anonim (javob unlink)</option>
                  <option value="open">Ochiq (shaxs bog&apos;lanadi)</option>
                </select>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.track_participation}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, track_participation: e.target.checked }))
                  }
                  className="mt-0.5 rounded border-white/20"
                />
                <span>
                  <span className="text-xs font-medium text-slate-200 block">
                    Kim ishtirok etganini admin ko‘rsin
                  </span>
                  <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                    O‘chirilsa «Ishtirokchilar» ro‘yxati ochilmaydi (faqat umumiy statistika).
                  </span>
                </span>
              </label>
            </div>
            <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
              <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Anonim: javob shaxsga bog‘lanmaydi. «Kim ishtirok etgan» — alohida sozlama (yuqorida).
              Maxfiylik rejimi nashrdan keyin o‘zgarmaydi.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                disabled={createMut.isPending}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-400 text-sm hover:bg-white/10 disabled:opacity-50"
              >
                Bekor
              </button>
              <button
                type="button"
                disabled={!form.title.trim() || createMut.isPending}
                onClick={() => createMut.mutate()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold"
              >
                {createMut.isPending ? "Yaratilmoqda..." : "Yaratish va shakllantirish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl border border-white/10 p-6 w-full max-w-sm">
            <h3 className="font-semibold text-white text-sm mb-1">O&apos;chirishni tasdiqlang</h3>
            <p className="text-xs text-slate-400 mb-4 truncate">{confirmDel.title}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDel(null)}
                className="flex-1 py-2 rounded-xl bg-white/5 text-slate-400 text-sm"
              >
                Bekor
              </button>
              <button
                type="button"
                onClick={() => deleteMut.mutate(confirmDel.id)}
                disabled={deleteMut.isPending}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                {deleteMut.isPending ? "..." : "O'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
