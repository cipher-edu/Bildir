"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquareText, Loader2, Plus, Paperclip, Send, X,
  CheckCircle2, Clock, AlertCircle, FileText, Sparkles,
  Inbox, ChevronDown, ShieldCheck, Hourglass,
} from "lucide-react";
import { officeApi } from "@/lib/api";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import type { Appeal } from "@/types";
import StudentShell from "@/components/student/StudentShell";
import { useI18n } from "@/i18n/I18nProvider";

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

const ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.txt,.zip,application/pdf,image/*";

export default function AppealsPage() {
  const { user, isReady } = useRoleGuard(["student", "teacher", "staff"]);
  const { t } = useI18n();
  const qc = useQueryClient();

  const CATEGORIES = [
    { id: "general", label: t("appeals.catGeneral"), emoji: "💬" },
    { id: "academic", label: t("appeals.catAcademic"), emoji: "📚" },
    { id: "social", label: t("appeals.catSocial"), emoji: "🤝" },
    { id: "technical", label: t("appeals.catTechnical"), emoji: "⚙️" },
    { id: "complaint", label: t("appeals.catComplaint"), emoji: "⚠️" },
    { id: "suggestion", label: t("appeals.catSuggestion"), emoji: "💡" },
    { id: "other", label: t("appeals.catOther"), emoji: "📌" },
  ];
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [personId, setPersonId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-appeals"],
    queryFn: async () => unwrap<Appeal[]>(await officeApi.myAppeals()),
    enabled: isReady && !!user,
  });

  const { data: persons = [] } = useQuery({
    queryKey: ["office-persons"],
    queryFn: async () => {
      const res = await officeApi.persons();
      return unwrap<import("@/types").ResponsiblePerson[]>(res) ?? [];
    },
    enabled: isReady && !!user,
  });

  const appeals = data ?? [];

  const createMut = useMutation({
    mutationFn: async () => {
      for (const f of files) {
        if (f.size > 10 * 1024 * 1024) throw new Error(`${f.name}: 10 MB dan katta`);
      }
      const fd = new FormData();
      fd.append("subject", subject.trim());
      fd.append("body", body.trim());
      fd.append("category", category);
      if (personId) fd.append("responsible_person", personId);
      files.forEach((f) => fd.append("files", f));
      return officeApi.createAppeal(fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-appeals"] });
      setOpen(false);
      setSubject("");
      setBody("");
      setCategory("general");
      setPersonId("");
      setFiles([]);
      setErr(null);
    },
    onError: (e: unknown) => {
      if (e instanceof Error && e.message.includes("MB")) {
        setErr(e.message);
        return;
      }
      const ax = e as { response?: { data?: { detail?: unknown } } };
      const d = ax.response?.data?.detail;
      setErr(typeof d === "string" ? d : t("appeals.sendError"));
    },
  });

  const pending = useMemo(
    () => appeals.filter((a) => a.status === "pending" || a.status === "in_progress").length,
    [appeals]
  );
  const answered = useMemo(
    () => appeals.filter((a) => a.status === "answered" || a.status === "closed").length,
    [appeals]
  );

  if (!isReady || !user) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-11 h-11 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <StudentShell user={user} title={t("appeals.title")} badge={pending}>
      <div className="space-y-5 sm:space-y-6 max-w-3xl mx-auto pb-4">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.1] p-6 sm:p-7">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/40 via-[#12102a] to-cyan-600/25" />
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-fuchsia-500/30 blur-3xl" />
          <div className="absolute left-1/4 bottom-0 w-40 h-40 rounded-full bg-cyan-400/15 blur-2xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(167,139,250,0.12),transparent_50%)]" />

          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-white text-violet-600 flex items-center justify-center shadow-[0_0_32px_rgba(167,139,250,0.45)]">
                  <MessageSquareText className="w-7 h-7" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-[#0b1020] flex items-center justify-center">
                  <ShieldCheck className="w-3 h-3 text-emerald-950" />
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-violet-200/85 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Biz tinglaymiz
                </p>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Murojaat
                </h1>
                <p className="text-sm text-slate-300/80 mt-1.5 max-w-md leading-relaxed">
                  Yozma murojaat va fayl biriktiring. Admin{" "}
                  <span className="text-amber-200 font-semibold">72 soat</span> ichida
                  javob beradi.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(true);
                setErr(null);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold shadow-[0_8px_28px_rgba(99,102,241,0.4)] transition-all active:scale-[0.98] shrink-0"
            >
              <Plus className="w-4 h-4" /> {t("appeals.create")}
            </button>
          </div>

          <div className="relative grid grid-cols-3 gap-2.5 mt-6">
            {[
              { label: "Jami", value: appeals.length, cls: "from-cyan-500/20 border-cyan-400/20 text-cyan-200" },
              { label: "Kutilmoqda", value: pending, cls: "from-amber-500/20 border-amber-400/20 text-amber-200" },
              { label: "Javob bor", value: answered, cls: "from-emerald-500/20 border-emerald-400/20 text-emerald-200" },
            ].map((k) => (
              <div
                key={k.label}
                className={`rounded-2xl border bg-gradient-to-br to-transparent px-3 py-3 backdrop-blur-sm ${k.cls}`}
              >
                <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80">{k.label}</p>
                <p className="text-2xl font-black text-white mt-0.5 tabular-nums">{k.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SLA strip */}
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.07] px-4 py-3 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/25 flex items-center justify-center shrink-0">
            <Hourglass className="w-4 h-4 text-amber-300" />
          </div>
          <div className="text-[12px] text-slate-300 leading-relaxed">
            <span className="font-semibold text-amber-100">SLA 72 soat.</span>{" "}
            Fayl: PDF, PNG, JPG, DOC — har biri max <strong className="text-white">10 MB</strong>, 5 tagacha.
          </div>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl border border-white/[0.06] bg-white/[0.03] animate-pulse"
              />
            ))}
          </div>
        )}

        <div className="space-y-3">
          {appeals.map((a, idx) => {
            const isOpen = expanded === a.id;
            const done = a.status === "answered" || a.status === "closed";
            return (
              <article
                key={a.id}
                className={`group relative rounded-[1.35rem] border overflow-hidden transition-all duration-300 ${
                  done
                    ? "border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] via-white/[0.02] to-transparent"
                    : "border-indigo-400/20 bg-gradient-to-br from-indigo-500/[0.1] via-violet-500/[0.04] to-transparent hover:border-indigo-300/35 hover:shadow-[0_12px_40px_-16px_rgba(99,102,241,0.35)]"
                }`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div
                  className={`h-0.5 w-full ${
                    done
                      ? "bg-gradient-to-r from-emerald-400 to-teal-400"
                      : "bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : a.id)}
                  className="w-full text-left p-4 sm:p-5 flex items-start gap-3.5"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner ${
                      done
                        ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-300"
                        : "bg-white text-indigo-600 shadow-md"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                          done
                            ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/25"
                            : "bg-amber-500/15 text-amber-200 border-amber-400/25"
                        }`}
                      >
                        {a.status_display || a.status}
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10">
                        {a.category_display || a.category}
                      </span>
                      {a.unique_code && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-200 border border-cyan-400/25 font-mono">
                          ID {a.unique_code}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-white text-[15px] leading-snug">{a.subject}</p>
                    {a.responsible_person_name && (
                      <p className="text-[11px] text-violet-300/90 mt-0.5">
                        Mas&apos;ul: {a.responsible_person_name}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span>{new Date(a.created_at).toLocaleString("uz-UZ")}</span>
                      {a.hours_left != null && !done && (
                        <span className="text-amber-300/90 font-medium">
                          · ~{Math.max(0, Math.round(a.hours_left))} soat qoldi
                        </span>
                      )}
                      {(a.attachments?.length ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-indigo-300/80">
                          · <Paperclip className="w-3 h-3" /> {a.attachments?.length}
                        </span>
                      )}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-500 shrink-0 transition-transform ${
                      isOpen ? "rotate-180 text-indigo-300" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 space-y-3.5 border-t border-white/[0.06] pt-4 bg-black/20">
                    {(a.unique_code || a.qr_code_url) && (
                      <div className="rounded-xl bg-cyan-500/10 border border-cyan-400/20 p-4 flex flex-wrap items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase tracking-wide text-cyan-300/80 font-semibold mb-1">
                            Kuzatuv kodi / QR
                          </p>
                          <p className="font-mono text-lg font-black text-white tracking-widest">
                            {a.unique_code || "—"}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Ushbu kod va QR orqali murojaatingizni kuzatishingiz mumkin.
                          </p>
                        </div>
                        {a.qr_code_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mediaUrl(a.qr_code_url) || a.qr_code_url}
                            alt={`QR ${a.unique_code || ""}`}
                            className="w-24 h-24 rounded-xl bg-white p-1 border border-white/20 object-contain"
                          />
                        )}
                      </div>
                    )}
                    <div className="rounded-xl bg-black/25 border border-white/[0.06] p-4">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-2">
                        Murojaat matni
                      </p>
                      <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {a.body}
                      </p>
                    </div>

                    {(a.attachments?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {a.attachments?.map((f) => (
                          <a
                            key={f.id}
                            href={mediaUrl(f.file_url) || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-xl border border-indigo-400/25 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/20 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[160px]">{f.original_name}</span>
                          </a>
                        ))}
                      </div>
                    )}

                    {a.answer_text ? (
                      <div className="relative rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 to-teal-500/5 p-4 overflow-hidden space-y-2.5">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/10 blur-2xl rounded-full" />
                        <p className="relative text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Admin javobi
                          {a.answered_by_name && (
                            <span className="font-normal text-emerald-200/60">
                              · {a.answered_by_name}
                            </span>
                          )}
                        </p>
                        <p className="relative text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                          {a.answer_text}
                        </p>
                        {(a.answer_attachments?.length ?? 0) > 0 && (
                          <div className="relative flex flex-wrap gap-2 pt-1">
                            {a.answer_attachments?.map((f) => (
                              <a
                                key={f.id}
                                href={mediaUrl(f.file_url) || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-50 hover:bg-emerald-500/20"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                {f.original_name}
                              </a>
                            ))}
                          </div>
                        )}
                        {a.answered_at && (
                          <p className="relative text-[10px] text-slate-500">
                            {new Date(a.answered_at).toLocaleString("uz-UZ")}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100/90">
                        <Clock className="w-4 h-4 text-amber-300 shrink-0" />
                        Javob kutilmoqda — 72 soat ichida
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {!isLoading && appeals.length === 0 && (
          <div className="rounded-[1.75rem] border border-dashed border-white/12 bg-white/[0.02] p-12 text-center">
            <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-violet-600/20 to-indigo-900/40 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-9 h-9 text-slate-500" />
            </div>
            <p className="text-lg font-bold text-slate-200">Hali murojaat yo&apos;q</p>
            <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
              Birinchi murojaatingizni yuboring — biz tez orada javob beramiz
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> Yaratish
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-0 sm:p-4">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[1.75rem] sm:rounded-[1.75rem] border border-white/12 bg-gradient-to-b from-[#121a32] to-[#0a1020] shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/[0.07] bg-[#121a32]/95 backdrop-blur-xl">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-violet-300/80 font-semibold">
                  Yangi
                </p>
                <h2 className="font-bold text-white">Murojaat yuborish</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {err && (
                <div className="flex items-center gap-2 text-sm text-rose-200 bg-rose-500/15 border border-rose-400/25 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {err}
                </div>
              )}

              <div>
                <p className="text-[11px] text-slate-400 font-medium mb-2">Kategoriya</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all ${
                        category === c.id
                          ? "bg-indigo-600 border-indigo-400/50 text-white shadow-[0_0_16px_rgba(99,102,241,0.35)]"
                          : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white"
                      }`}
                    >
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block space-y-1.5">
                <span className="text-[11px] text-slate-400 font-medium">
                  Mas&apos;ul shaxs <span className="text-slate-600">(ixtiyoriy)</span>
                </span>
                <select
                  value={personId}
                  onChange={(e) => setPersonId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/35 border border-white/10 text-sm text-white focus:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Umumiy murojaat (tanlanmagan)</option>
                  {persons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {(p.full_name || `${p.last_name} ${p.first_name}`).trim()}
                      {p.position ? ` — ${p.position}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] text-slate-400 font-medium">{t("appeals.subject")} *</span>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={300}
                  className="w-full px-4 py-3 rounded-xl bg-black/35 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Qisqa va aniq sarlavha"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Murojaat matni *</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl bg-black/35 border border-white/10 text-sm text-white placeholder:text-slate-600 resize-y focus:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Batafsil yozing..."
                />
              </label>

              <div>
                <p className="text-[11px] text-slate-400 font-medium mb-1.5">
                  Fayl biriktirish <span className="text-slate-600">(max 10 MB)</span>
                </p>
                <label className="flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-2xl border border-dashed border-indigo-400/30 bg-indigo-500/[0.06] cursor-pointer hover:bg-indigo-500/10 transition-colors">
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                    <Paperclip className="w-5 h-5 text-indigo-300" />
                  </div>
                  <span className="text-xs text-slate-300 font-medium">
                    PDF, PNG, JPG, DOC… tanlang
                  </span>
                  <span className="text-[10px] text-slate-500">5 ta gacha</span>
                  <input
                    type="file"
                    accept={ACCEPT}
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const list = Array.from(e.target.files || []);
                      setFiles((prev) => [...prev, ...list].slice(0, 5));
                    }}
                  />
                </label>
                {files.length > 0 && (
                  <ul className="mt-2.5 space-y-1.5">
                    {files.map((f, i) => (
                      <li
                        key={`${f.name}-${i}`}
                        className="flex items-center justify-between gap-2 text-[11px] text-slate-300 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2"
                      >
                        <span className="truncate flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                          {f.name}
                          <span className="text-slate-500">({Math.round(f.size / 1024)} KB)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
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
                disabled={
                  createMut.isPending ||
                  subject.trim().length < 3 ||
                  body.trim().length < 10
                }
                onClick={() => createMut.mutate()}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white text-sm font-bold shadow-[0_8px_28px_rgba(99,102,241,0.35)] transition-all"
              >
                {createMut.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {t("appeals.send")}
              </button>
            </div>
          </div>
        </div>
      )}
    </StudentShell>
  );
}
