"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquareText, Loader2, AlertTriangle, Clock, CheckCircle2,
  Paperclip, Send, Filter, RefreshCw, Sparkles, Inbox,
  UserRound, Hourglass, ShieldAlert, X, FileText,
} from "lucide-react";
import { officeApi } from "@/lib/api";
import type { Appeal } from "@/types";

const ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.txt,.zip,application/pdf,image/*";

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

const STATUS_META: Record<
  string,
  { label: string; cls: string }
> = {
  pending: {
    label: "Kutilmoqda",
    cls: "bg-amber-500/15 text-amber-200 border-amber-400/30",
  },
  in_progress: {
    label: "Ko'rib chiqilmoqda",
    cls: "bg-sky-500/15 text-sky-200 border-sky-400/30",
  },
  answered: {
    label: "Javob berilgan",
    cls: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
  },
  closed: {
    label: "Yopilgan",
    cls: "bg-slate-500/15 text-slate-300 border-slate-400/25",
  },
};

export default function AdminAppealsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "late" | "pending">("all");
  const [selected, setSelected] = useState<Appeal | null>(null);
  const [answer, setAnswer] = useState("");
  const [note, setNote] = useState("");
  const [answerFiles, setAnswerFiles] = useState<File[]>([]);
  const [answerErr, setAnswerErr] = useState<string | null>(null);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (filter === "late") p.late = "1";
    if (filter === "pending") p.status = "pending";
    return p;
  }, [filter]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-appeals", filter],
    queryFn: async () => unwrap<Appeal[]>(await officeApi.adminAppeals(params)),
  });

  const appeals = data ?? [];
  const lateCount = appeals.filter((a) => a.answered_late_flag || a.is_overdue).length;
  const pendingCount = appeals.filter(
    (a) => a.status === "pending" || a.status === "in_progress"
  ).length;

  const answerMut = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("no");
      for (const f of answerFiles) {
        if (f.size > 10 * 1024 * 1024) {
          throw new Error(`${f.name}: 10 MB dan katta`);
        }
      }
      const fd = new FormData();
      fd.append("answer_text", answer.trim());
      if (note.trim()) fd.append("admin_note", note.trim());
      answerFiles.forEach((f) => fd.append("files", f));
      return officeApi.answerAppeal(selected.id, fd);
    },
    onSuccess: (res) => {
      const updated = unwrap<Appeal>(res);
      setSelected(updated);
      setAnswer("");
      setNote("");
      setAnswerFiles([]);
      setAnswerErr(null);
      qc.invalidateQueries({ queryKey: ["admin-appeals"] });
    },
    onError: (e: unknown) => {
      if (e instanceof Error && e.message.includes("MB")) {
        setAnswerErr(e.message);
        return;
      }
      const ax = e as { response?: { data?: { detail?: unknown } } };
      const d = ax.response?.data?.detail;
      setAnswerErr(typeof d === "string" ? d : "Javob yuborishda xatolik");
    },
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.08] p-6 sm:p-7">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 via-[#0c1224] to-rose-700/20" />
        <div className="absolute -right-12 -top-12 w-52 h-52 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="absolute left-1/4 bottom-0 w-36 h-36 rounded-full bg-rose-500/10 blur-2xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white text-violet-700 flex items-center justify-center shadow-[0_0_28px_rgba(139,92,246,0.4)] shrink-0">
              <MessageSquareText className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-violet-200/85 flex items-center gap-1.5 mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                SLA monitoring
              </p>
              <h1 className="text-2xl font-black text-white tracking-tight">Murojaatlar</h1>
              <p className="text-sm text-slate-400 mt-1 max-w-lg">
                Javob muddati{" "}
                <span className="text-amber-200 font-semibold">72 soat</span>. Kechiksa qizil
                belgi — <span className="text-rose-300 font-semibold">Kechikib javob</span>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 min-w-[72px] text-center backdrop-blur-sm">
              <p className="text-[9px] text-slate-500 uppercase">Jami</p>
              <p className="text-xl font-black text-white tabular-nums">{appeals.length}</p>
            </div>
            <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-2.5 min-w-[72px] text-center">
              <p className="text-[9px] text-amber-200/70 uppercase">Kutilmoqda</p>
              <p className="text-xl font-black text-amber-100 tabular-nums">{pendingCount}</p>
            </div>
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-2.5 min-w-[72px] text-center">
              <p className="text-[9px] text-rose-200/70 uppercase">Kechikkan</p>
              <p className="text-xl font-black text-rose-100 tabular-nums">{lateCount}</p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="p-3 rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "all" as const, label: "Hammasi", icon: Filter },
            { id: "pending" as const, label: "Kutilmoqda", icon: Hourglass },
            {
              id: "late" as const,
              label: lateCount ? `Kechikkan (${lateCount})` : "Kechikkan",
              icon: ShieldAlert,
            },
          ] as const
        ).map((f) => {
          const Icon = f.icon;
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                active
                  ? f.id === "late"
                    ? "bg-rose-600/40 border-rose-400/50 text-rose-50 shadow-[0_0_20px_rgba(244,63,94,0.25)]"
                    : "bg-violet-600 border-violet-400/40 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {f.label}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-4 items-start">
        {/* List */}
        <div className="lg:col-span-2 space-y-2 max-h-[72vh] overflow-y-auto pr-1 custom-scroll">
          {appeals.map((a) => {
            const late = !!(a.answered_late_flag || a.is_overdue);
            const active = selected?.id === a.id;
            const st = STATUS_META[a.status] || STATUS_META.pending;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setSelected(a);
                  setAnswer("");
                  setNote("");
                  setAnswerFiles([]);
                  setAnswerErr(null);
                }}
                className={`w-full text-left rounded-2xl border p-3.5 transition-all duration-200 ${
                  active
                    ? "border-violet-400/45 bg-violet-500/15 shadow-[0_0_24px_rgba(139,92,246,0.15)]"
                    : late
                    ? "border-rose-500/30 bg-gradient-to-br from-rose-500/[0.1] to-transparent hover:border-rose-400/45"
                    : "border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.055] hover:border-white/15"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm font-bold text-white line-clamp-2 leading-snug">
                    {a.subject}
                  </p>
                  {late && (
                    <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-md bg-rose-500/25 text-rose-100 border border-rose-400/40 font-extrabold tracking-wide">
                      KECHIKKAN
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold ${st.cls}`}>
                    {st.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <UserRound className="w-3 h-3 shrink-0" />
                  <span className="truncate">{a.user_name || a.user_email}</span>
                </p>
                <p className="text-[10px] text-slate-600 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(a.created_at).toLocaleString("uz-UZ")}
                  {a.hours_left != null && a.hours_left > 0 && a.status !== "answered" && (
                    <span className="text-amber-400/90"> · {a.hours_left}s qoldi</span>
                  )}
                </p>
              </button>
            );
          })}
          {!isLoading && appeals.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
              <Inbox className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Murojaat yo&apos;q</p>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3 relative rounded-[1.5rem] border border-white/[0.08] overflow-hidden min-h-[420px] bg-gradient-to-b from-[#0e1528] to-[#0a1020]">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
          <div className="absolute -top-20 right-0 w-48 h-48 bg-violet-500/10 blur-3xl rounded-full pointer-events-none" />

          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[420px] text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-400/20 flex items-center justify-center mb-4">
                <MessageSquareText className="w-7 h-7 text-violet-400/70" />
              </div>
              <p className="text-slate-300 font-semibold">Murojaat tanlang</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Chapdagi ro&apos;yxatdan elementni bosing — batafsil va javob yozish ochiladi
              </p>
            </div>
          ) : (
            <div className="relative p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full border font-bold ${
                        STATUS_META[selected.status]?.cls || ""
                      }`}
                    >
                      {STATUS_META[selected.status]?.label || selected.status}
                    </span>
                    {(selected.answered_late_flag || selected.is_overdue) && (
                      <span className="text-[10px] px-2.5 py-1 rounded-full border border-rose-400/40 bg-rose-500/20 text-rose-100 font-extrabold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Kechikib javob
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black text-white leading-snug">
                    {selected.subject}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="inline-flex items-center gap-1">
                      <UserRound className="w-3.5 h-3.5" />
                      {selected.user_name}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span>{selected.user_email}</span>
                    <span className="text-slate-600">·</span>
                    <span>{selected.category_display || selected.category}</span>
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-black/30 border border-white/[0.07] p-4 sm:p-5">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
                  Murojaat matni
                </p>
                <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selected.body}
                </p>
              </div>

              {(selected.attachments?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-violet-300" />
                    Foydalanuvchi fayllari
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selected.attachments?.map((f) => {
                      const url = mediaUrl(f.file_url);
                      return (
                        <a
                          key={f.id}
                          href={url || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] px-3 py-2 rounded-xl border border-violet-400/25 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20 transition-colors font-medium"
                        >
                          {f.original_name}
                          <span className="text-violet-300/50 ml-1">
                            ({Math.round(f.size / 1024)} KB)
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {selected.answer_text ? (
                <div className="relative rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-5 overflow-hidden space-y-3">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 blur-3xl rounded-full" />
                  <p className="relative text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Yuborilgan javob
                    {selected.answered_late && (
                      <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-200 border border-rose-400/30">
                        kechikkan
                      </span>
                    )}
                  </p>
                  <p className="relative text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                    {selected.answer_text}
                  </p>
                  {(selected.answer_attachments?.length ?? 0) > 0 && (
                    <div className="relative space-y-1.5">
                      <p className="text-[10px] text-emerald-200/70 font-semibold flex items-center gap-1">
                        <Paperclip className="w-3 h-3" /> Javob fayllari
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selected.answer_attachments?.map((f) => (
                          <a
                            key={f.id}
                            href={mediaUrl(f.file_url) || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] px-3 py-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-50 hover:bg-emerald-500/20"
                          >
                            {f.original_name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="relative text-[10px] text-slate-500">
                    {selected.answered_by_name}
                    {selected.answered_at &&
                      ` · ${new Date(selected.answered_at).toLocaleString("uz-UZ")}`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 border-t border-white/[0.06] pt-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center">
                      <Send className="w-3.5 h-3.5 text-emerald-300" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Javob yozish</p>
                      <p className="text-[10px] text-slate-500">
                        Matn + fayl (max 10 MB, 5 ta)
                      </p>
                    </div>
                  </div>
                  {answerErr && (
                    <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-xl px-3 py-2">
                      {answerErr}
                    </p>
                  )}
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={5}
                    placeholder="Javob matnini yozing..."
                    className="w-full px-4 py-3 rounded-2xl bg-black/35 border border-white/10 text-sm text-white placeholder:text-slate-600 resize-y focus:border-emerald-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                  />
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ichki izoh (faqat admin uchun, ixtiyoriy)"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/25 border border-white/[0.07] text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-white/15"
                  />

                  <div>
                    <label className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-emerald-400/30 bg-emerald-500/[0.06] cursor-pointer hover:bg-emerald-500/10 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center shrink-0">
                        <Paperclip className="w-4 h-4 text-emerald-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-emerald-100">
                          Javobga fayl biriktirish
                        </p>
                        <p className="text-[10px] text-slate-500">
                          PDF, PNG, JPG, DOC… · max 10 MB · 5 ta gacha
                        </p>
                      </div>
                      <input
                        type="file"
                        accept={ACCEPT}
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const list = Array.from(e.target.files || []);
                          setAnswerFiles((prev) => [...prev, ...list].slice(0, 5));
                        }}
                      />
                    </label>
                    {answerFiles.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {answerFiles.map((f, i) => (
                          <li
                            key={`${f.name}-${i}`}
                            className="flex items-center justify-between gap-2 text-[11px] text-slate-300 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2"
                          >
                            <span className="truncate flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                              {f.name}
                              <span className="text-slate-500">
                                ({Math.round(f.size / 1024)} KB)
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setAnswerFiles((prev) => prev.filter((_, j) => j !== i))
                              }
                              className="p-1 rounded-lg text-rose-300 hover:bg-rose-500/15"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={answerMut.isPending || answer.trim().length < 2}
                    onClick={() => answerMut.mutate()}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white text-sm font-bold shadow-[0_8px_28px_rgba(16,185,129,0.3)] transition-all"
                  >
                    {answerMut.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Javob yuborish
                    {answerFiles.length > 0 && (
                      <span className="text-[10px] opacity-80">
                        +{answerFiles.length} fayl
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
