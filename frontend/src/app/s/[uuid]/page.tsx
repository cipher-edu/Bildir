"use client";

import { use, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ClipboardList, Send, AlertCircle, CheckCircle2, EyeOff, Star, Loader2,
  ChevronLeft, ChevronRight, Shield, Sparkles, Clock, Lock, ExternalLink,
  FileText, CheckSquare, Square,
} from "lucide-react";
import { surveysApi } from "@/lib/api";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useToast } from "@/components/ToastProvider";
import type { SurveyTake, SurveyQuestion } from "@/types";
import {
  getSurveyConsentItems,
  getSurveyPrivacySummary,
  PRIVACY_SECTIONS,
  SURVEY_PRIVACY_VERSION,
  type PrivacyMode,
} from "@/lib/privacyPolicy";

function unwrapData<T>(res: { data?: { data?: T } | T }): T {
  const p = res.data as { data?: T } | T | undefined;
  if (p && typeof p === "object" && "data" in (p as object) && (p as { data: T }).data !== undefined) {
    return (p as { data: T }).data;
  }
  return p as T;
}

type AnswerMap = Record<string, unknown>;

/* ── Visual primitives ─────────────────────────────────────── */

function StarRating({
  value,
  max,
  onChange,
  disabled,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="flex gap-1.5 sm:gap-2 justify-center" onMouseLeave={() => setHover(0)}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onMouseEnter={() => !disabled && setHover(n)}
            onClick={() => onChange(n)}
            className="p-1 transition-transform duration-150 hover:scale-110 active:scale-95 disabled:opacity-50"
          >
            <Star
              className={`w-9 h-9 sm:w-10 sm:h-10 transition-all duration-200 ${
                n <= shown
                  ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.45)]"
                  : "text-slate-600/80"
              }`}
            />
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500 tabular-nums">
        {value > 0 ? (
          <span className="text-amber-300/90 font-medium">{value} / {max}</span>
        ) : (
          "Yulduzni tanlang"
        )}
      </p>
    </div>
  );
}

function OptionCard({
  selected,
  disabled,
  onSelect,
  children,
  multi,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  children: ReactNode;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`group w-full text-left flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border transition-all duration-200 ${
        selected
          ? "border-indigo-400/50 bg-gradient-to-r from-indigo-500/20 via-indigo-500/10 to-transparent shadow-[0_0_24px_rgba(99,102,241,0.15)]"
          : "border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <span
        className={`shrink-0 flex items-center justify-center transition-all duration-200 ${
          multi ? "w-5 h-5 rounded-md" : "w-5 h-5 rounded-full"
        } ${
          selected
            ? "bg-indigo-500 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]"
            : "border-2 border-slate-500/60 bg-transparent group-hover:border-slate-400"
        }`}
        style={selected ? undefined : { borderWidth: 2 }}
      >
        {selected && (
          multi ? (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span className="w-2 h-2 rounded-full bg-white" />
          )
        )}
      </span>
      <span className={`text-sm leading-snug flex-1 ${selected ? "text-white font-medium" : "text-slate-300"}`}>
        {children}
      </span>
    </button>
  );
}

function QuestionField({
  q,
  value,
  onChange,
  disabled,
}: {
  q: SurveyQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const v = (value || {}) as Record<string, unknown>;

  if (q.q_type === "single") {
    return (
      <div className="space-y-2.5">
        {(q.options || []).map((o) => {
          const oid = o.id || o.text;
          const selected = v.option_id === oid;
          return (
            <OptionCard
              key={oid}
              selected={selected}
              disabled={disabled}
              onSelect={() => onChange({ option_id: oid })}
            >
              {o.text}
            </OptionCard>
          );
        })}
      </div>
    );
  }

  if (q.q_type === "multiple") {
    const ids = Array.isArray(v.option_ids) ? (v.option_ids as string[]) : [];
    return (
      <div className="space-y-2.5">
        <p className="text-[11px] text-slate-500 mb-1">Bir nechtasini tanlash mumkin</p>
        {(q.options || []).map((o) => {
          const oid = String(o.id || o.text);
          const checked = ids.includes(oid);
          return (
            <OptionCard
              key={oid}
              multi
              selected={checked}
              disabled={disabled}
              onSelect={() => {
                const next = checked ? ids.filter((x) => x !== oid) : [...ids, oid];
                onChange({ option_ids: next });
              }}
            >
              {o.text}
            </OptionCard>
          );
        })}
      </div>
    );
  }

  if (q.q_type === "text") {
    return (
      <div className="relative">
        <input
          type="text"
          disabled={disabled}
          value={String(v.text ?? "")}
          onChange={(e) => onChange({ text: e.target.value })}
          maxLength={Number(q.settings?.max_length) || 500}
          className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 transition-all"
          placeholder="Javobingizni yozing..."
        />
      </div>
    );
  }

  if (q.q_type === "textarea") {
    const max = Number(q.settings?.max_length) || 5000;
    const len = String(v.text ?? "").length;
    return (
      <div className="space-y-1.5">
        <textarea
          disabled={disabled}
          value={String(v.text ?? "")}
          onChange={(e) => onChange({ text: e.target.value })}
          maxLength={max}
          rows={5}
          className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-slate-600 resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 transition-all leading-relaxed"
          placeholder="Batafsil javob yozing..."
        />
        <p className="text-[10px] text-slate-600 text-right tabular-nums">{len} / {max}</p>
      </div>
    );
  }

  if (q.q_type === "rating") {
    const max = Number(q.settings?.max) || 5;
    return (
      <StarRating
        value={Number(v.value) || 0}
        max={max}
        disabled={disabled}
        onChange={(n) => onChange({ value: n })}
      />
    );
  }

  if (q.q_type === "nps") {
    return (
      <div className="space-y-3">
        <div className="flex justify-between text-[10px] text-slate-500 px-0.5">
          <span>Umuman tavsiya qilmayman</span>
          <span>Juda tavsiya qilaman</span>
        </div>
        <div className="grid grid-cols-11 gap-1 sm:gap-1.5">
          {Array.from({ length: 11 }, (_, i) => i).map((n) => {
            const selected = Number(v.value) === n;
            const tone =
              n <= 6
                ? selected
                  ? "bg-rose-500 border-rose-400 text-white shadow-[0_0_14px_rgba(244,63,94,0.35)]"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-300/70 hover:border-rose-400/40"
                : n <= 8
                ? selected
                  ? "bg-amber-500 border-amber-400 text-white shadow-[0_0_14px_rgba(245,158,11,0.35)]"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-300/70 hover:border-amber-400/40"
                : selected
                ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_14px_rgba(16,185,129,0.35)]"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300/70 hover:border-emerald-400/40";
            return (
              <button
                key={n}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ value: n })}
                className={`aspect-square rounded-xl text-xs sm:text-sm font-bold border transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-50 ${tone}`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (q.q_type === "likert") {
    const labels = [
      { n: 1, tip: "Mutlaqo rozi emas" },
      { n: 2, tip: "Rozi emas" },
      { n: 3, tip: "Neytral" },
      { n: 4, tip: "Rozi" },
      { n: 5, tip: "To'liq rozi" },
    ];
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-5 gap-2">
          {labels.map(({ n, tip }) => {
            const selected = Number(v.value) === n;
            return (
              <button
                key={n}
                type="button"
                title={tip}
                disabled={disabled}
                onClick={() => onChange({ value: n })}
                className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl border transition-all duration-200 disabled:opacity-50 ${
                  selected
                    ? "bg-indigo-500/25 border-indigo-400/50 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)] scale-[1.03]"
                    : "bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/25 hover:bg-white/[0.05]"
                }`}
              >
                <span className={`text-lg font-extrabold tabular-nums ${selected ? "text-indigo-200" : ""}`}>
                  {n}
                </span>
                <span className="text-[9px] leading-tight text-center opacity-70 hidden sm:block px-0.5">
                  {tip.split(" ").slice(0, 2).join(" ")}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return <p className="text-xs text-red-400">Noma&apos;lum savol turi</p>;
}

/* ── Validation ────────────────────────────────────────────── */

function validateOneQuestion(q: SurveyQuestion, answers: AnswerMap): string | null {
  if (!q.required) return null;
  const val = answers[q.id] as Record<string, unknown> | undefined;
  if (!val) return "Javob bering";
  if (q.q_type === "single" && !val.option_id) return "Variant tanlang";
  if (q.q_type === "multiple" && !(Array.isArray(val.option_ids) && val.option_ids.length))
    return "Kamida 1 variant tanlang";
  if ((q.q_type === "text" || q.q_type === "textarea") && !String(val.text || "").trim())
    return "Matn yozing";
  if (["rating", "nps", "likert"].includes(q.q_type) && (val.value === undefined || val.value === null))
    return "Baho tanlang";
  return null;
}

function isAnswered(q: SurveyQuestion, answers: AnswerMap): boolean {
  const v = answers[q.id] as Record<string, unknown> | undefined;
  if (!v) return false;
  if (q.q_type === "single") return !!v.option_id;
  if (q.q_type === "multiple") return Array.isArray(v.option_ids) && v.option_ids.length > 0;
  if (q.q_type === "text" || q.q_type === "textarea") return !!String(v.text || "").trim();
  if (["rating", "nps", "likert"].includes(q.q_type)) return v.value != null;
  return false;
}

function validateAnswers(questions: SurveyQuestion[], answers: AnswerMap): string | null {
  for (const q of questions) {
    const err = validateOneQuestion(q, answers);
    if (err) return `"${q.text.slice(0, 40)}" — ${err}`;
  }
  return null;
}

/* ── Page ──────────────────────────────────────────────────── */

export default function SurveyTakePage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = use(params);
  const { user, isReady } = useRoleGuard(["student", "teacher", "staff"]);
  const { showSuccess, showError } = useToast();

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [token, setToken] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState<"intro" | "form">("intro");
  const [qIndex, setQIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<"next" | "prev">("next");
  /** Maxfiylik / xavfsizlik roziliklari */
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [showPolicy, setShowPolicy] = useState(false);

  const { data: survey, isLoading, error } = useQuery({
    queryKey: ["survey-take", uuid],
    queryFn: async () => unwrapData<SurveyTake>(await surveysApi.take(uuid)),
    enabled: isReady && !!user && !!uuid,
  });

  const already = survey?.already_submitted;
  const privacyMode = (survey?.privacy_mode || "anonymous") as PrivacyMode;
  const consentItems = useMemo(
    () => getSurveyConsentItems(privacyMode),
    [privacyMode]
  );
  const privacySummary = useMemo(
    () => getSurveyPrivacySummary(privacyMode),
    [privacyMode]
  );
  const allRequiredConsented = consentItems
    .filter((c) => c.required)
    .every((c) => consents[c.id]);

  const startMut = useMutation({
    mutationFn: () => surveysApi.start(uuid),
    onSuccess: (res) => {
      const data = unwrapData<{ token: string; message?: string }>(res);
      setToken(data.token);
      setQIndex(0);
      setSlideDir("next");
      setStep("form");
      showSuccess("Boshladingiz", data.message);
    },
    onError: (err: unknown) => {
      const d = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showError("Xatolik", typeof d === "string" ? d : "Boshlab bo'lmadi");
    },
  });

  function toggleConsent(id: string) {
    setConsents((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleStart() {
    if (!allRequiredConsented) {
      showError(
        "Rozilik kerak",
        "Maxfiylik siyosati va xavfsizlik qoidalariga rozilik bering"
      );
      return;
    }
    startMut.mutate();
  }

  const submitMut = useMutation({
    mutationFn: () => {
      if (!token || !survey) throw new Error("token yo'q");
      const payload = survey.questions.map((q) => ({
        question_id: q.id,
        value: answers[q.id] ?? {},
      }));
      return surveysApi.submit(uuid, { token, answers: payload });
    },
    onSuccess: () => {
      setDone(true);
      showSuccess("Rahmat!", "Javoblaringiz qabul qilindi");
    },
    onError: (err: unknown) => {
      const d = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showError("Yuborish xato", typeof d === "string" ? d : "Qayta urinib ko'ring");
    },
  });

  const sortedQs = useMemo(
    () => [...(survey?.questions || [])].sort((a, b) => a.order - b.order),
    [survey]
  );

  const Shell = ({ children }: { children: ReactNode }) => (
    <div className="min-h-screen text-white relative overflow-x-hidden">
      <div className="fixed inset-0 -z-20 bg-[#020617]" />
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[28rem] h-[28rem] rounded-full bg-indigo-600/25 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-15%] w-[24rem] h-[24rem] rounded-full bg-violet-600/15 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20rem] h-[20rem] rounded-full bg-cyan-500/5 blur-[90px]" />
        {/* subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>
      {children}
    </div>
  );

  if (!isReady || !user) {
    return (
      <Shell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-11 h-11 border-2 border-indigo-400/80 border-t-transparent rounded-full animate-spin" />
        </div>
      </Shell>
    );
  }

  if (isLoading) {
    return (
      <Shell>
        <div className="min-h-screen flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
          <p className="text-sm text-slate-500">So&apos;rovnoma yuklanmoqda...</p>
        </div>
      </Shell>
    );
  }

  if (error || !survey) {
    return (
      <Shell>
        <div className="px-4 py-20 max-w-md mx-auto text-center animate-fade-up">
          <div className="w-20 h-20 rounded-[1.75rem] bg-gradient-to-br from-rose-500/20 to-rose-600/5 border border-rose-500/25 flex items-center justify-center mx-auto mb-5 shadow-[0_0_40px_rgba(244,63,94,0.15)]">
            <AlertCircle className="w-9 h-9 text-rose-400" />
          </div>
          <p className="text-lg font-bold text-white mb-2">So&apos;rovnoma topilmadi</p>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            Ruxsat yo&apos;q, muddati tugagan yoki havola noto&apos;g&apos;ri
          </p>
          <Link
            href="/surveys"
            className="inline-flex px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold shadow-[0_0_24px_rgba(99,102,241,0.3)] transition-all"
          >
            Ro&apos;yxatga qaytish
          </Link>
        </div>
      </Shell>
    );
  }

  if (done || already) {
    return (
      <Shell>
        <div className="px-4 py-20 max-w-md mx-auto text-center animate-fade-up">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400/30 to-emerald-600/10 border border-emerald-400/40 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.25)]">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">
            {done ? "Rahmat!" : "Allaqachon topshirgansiz"}
          </h1>
          <p className="text-sm text-slate-400 mb-10 leading-relaxed max-w-xs mx-auto">
            {survey.privacy_mode === "anonymous"
              ? "Javoblaringiz shaxsingizga bog'lanmagan holda xavfsiz saqlandi."
              : "Javoblaringiz muvaffaqiyatli qabul qilindi."}
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/surveys"
              className="py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-sm font-bold shadow-[0_0_28px_rgba(99,102,241,0.35)] transition-all"
            >
              Boshqa so&apos;rovnomalar
            </Link>
            <Link
              href="/home"
              className="py-3.5 rounded-2xl border border-white/10 text-sm text-slate-300 hover:bg-white/5 hover:border-white/20 transition-all"
            >
              Bosh sahifa
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  const totalQ = sortedQs.length;
  const safeIndex = totalQ > 0 ? Math.min(Math.max(qIndex, 0), totalQ - 1) : 0;
  const currentQ = sortedQs[safeIndex];
  const isFirst = safeIndex <= 0;
  const isLast = totalQ === 0 || safeIndex >= totalQ - 1;
  const stepProgress = totalQ > 0 ? Math.round(((safeIndex + 1) / totalQ) * 100) : 0;
  const answeredCount = sortedQs.filter((q) => isAnswered(q, answers)).length;

  function goPrev() {
    setSlideDir("prev");
    setQIndex((i) => Math.max(0, i - 1));
  }

  function goNext() {
    if (!currentQ) return;
    const err = validateOneQuestion(currentQ, answers);
    if (err) {
      showError("Javob majburiy", err);
      return;
    }
    if (!isLast) {
      setSlideDir("next");
      setQIndex((i) => Math.min(totalQ - 1, i + 1));
    }
  }

  function handleSubmit() {
    if (currentQ) {
      const errOne = validateOneQuestion(currentQ, answers);
      if (errOne) {
        showError("Javob majburiy", errOne);
        return;
      }
    }
    const err = validateAnswers(sortedQs, answers);
    if (err) {
      const firstBad = sortedQs.findIndex((q) => validateOneQuestion(q, answers));
      if (firstBad >= 0) {
        setSlideDir(firstBad < safeIndex ? "prev" : "next");
        setQIndex(firstBad);
      }
      showError("Tekshiring", err);
      return;
    }
    submitMut.mutate();
  }

  function jumpTo(i: number) {
    if (!currentQ) return;
    if (i <= safeIndex) {
      setSlideDir(i < safeIndex ? "prev" : "next");
      setQIndex(i);
      return;
    }
    const err = validateOneQuestion(currentQ, answers);
    if (err) {
      showError("Avval joriy savolga javob bering", err);
      return;
    }
    for (let j = safeIndex; j < i; j++) {
      const e = validateOneQuestion(sortedQs[j], answers);
      if (e) {
        setSlideDir("next");
        setQIndex(j);
        showError(`Savol ${j + 1}`, e);
        return;
      }
    }
    setSlideDir("next");
    setQIndex(i);
  }

  return (
    <Shell>
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#020617]/75 backdrop-blur-2xl">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link
            href="/surveys"
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Orqaga</span>
          </Link>
          <span className="text-xs text-slate-300 truncate max-w-[55%] font-medium text-center">
            {survey.title}
          </span>
          <span className="text-[11px] font-semibold text-indigo-300 tabular-nums shrink-0 min-w-[2.5rem] text-right">
            {step === "form" && totalQ > 0 ? `${safeIndex + 1}/${totalQ}` : ""}
          </span>
        </div>
        {step === "form" && (
          <div className="h-1 bg-white/[0.04]">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(99,102,241,0.6)]"
              style={{ width: `${stepProgress}%` }}
            />
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-7 sm:py-9 space-y-5 pb-36">
        {/* ── Intro + maxfiylik roziligi ── */}
        {step === "intro" && (
          <div className="animate-fade-up space-y-4">
            {/* Survey card */}
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.1] bg-gradient-to-br from-indigo-600/25 via-[#0a1020] to-violet-700/15 p-6 sm:p-8 shadow-[0_0_60px_rgba(99,102,241,0.12)]">
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
              <div className="relative space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center shadow-[0_8px_32px_rgba(99,102,241,0.4)] ring-1 ring-white/20">
                  <ClipboardList className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-indigo-300 font-semibold mb-3">
                    <Sparkles className="w-3 h-3" />
                    So&apos;rovnoma
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                    {survey.title}
                  </h1>
                  {survey.description && (
                    <p className="text-sm text-slate-400 mt-3 whitespace-pre-wrap leading-relaxed">
                      {survey.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-[11px] text-slate-300">
                    <ClipboardList className="w-3.5 h-3.5 text-indigo-400" />
                    {sortedQs.length} ta savol
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-[11px] text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    Birma-bir
                  </span>
                  {privacyMode === "anonymous" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-[11px] text-indigo-200">
                      <EyeOff className="w-3.5 h-3.5" />
                      Anonim
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200">
                      <Lock className="w-3.5 h-3.5" />
                      Ochiq rejim
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Privacy summary */}
            <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-cyan-300" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-white">
                    Maxfiylik va axborot xavfsizligi
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Boshlashdan oldin tanishing · siyosat v{SURVEY_PRIVACY_VERSION}
                  </p>
                </div>
              </div>

              <ul className="space-y-2.5">
                {privacySummary.map((line, i) => (
                  <li key={i} className="flex gap-2.5 text-xs text-slate-300 leading-relaxed">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400/80 shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowPolicy((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium border border-white/10 bg-white/[0.04] text-indigo-200 hover:bg-white/[0.07] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {showPolicy ? "Siyosatni yopish" : "To‘liq siyosatni o‘qish"}
                </button>
                <Link
                  href="/privacy"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium border border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  Alohida sahifa
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {showPolicy && (
                <div className="max-h-64 overflow-y-auto rounded-xl border border-white/[0.06] bg-black/30 p-4 space-y-4">
                  {PRIVACY_SECTIONS.map((sec) => (
                    <div key={sec.id} className="space-y-1.5">
                      <h3 className="text-xs font-bold text-slate-200">{sec.title}</h3>
                      {sec.body.map((p, i) => (
                        <p key={i} className="text-[11px] text-slate-500 leading-relaxed">
                          {p}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Consent checkboxes */}
            <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/[0.06] p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-4 h-4 text-amber-300" />
                <h2 className="text-sm font-bold text-white">Rozilik (majburiy)</h2>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                So‘rovnoma faqat quyidagi bandlarga rozilik berganingizdan keyin boshlanadi.
              </p>
              <div className="space-y-2.5 pt-1">
                {consentItems.map((item) => {
                  const on = !!consents[item.id];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleConsent(item.id)}
                      className={`w-full text-left flex gap-3 px-3.5 py-3 rounded-2xl border transition-all ${
                        on
                          ? "border-emerald-500/35 bg-emerald-500/10"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20"
                      }`}
                    >
                      <span className={`shrink-0 mt-0.5 ${on ? "text-emerald-400" : "text-slate-500"}`}>
                        {on ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      </span>
                      <span className="min-w-0">
                        <span className={`text-xs font-medium leading-snug block ${on ? "text-emerald-50" : "text-slate-200"}`}>
                          {item.label}
                          {item.required && (
                            <span className="text-amber-400/90 ml-1">*</span>
                          )}
                        </span>
                        {item.detail && (
                          <span className="text-[10px] text-slate-500 mt-1 block leading-relaxed">
                            {item.detail}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleStart}
              disabled={startMut.isPending || !allRequiredConsented}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:pointer-events-none text-sm font-bold flex items-center justify-center gap-2 shadow-[0_8px_32px_rgba(99,102,241,0.4)] transition-all hover:shadow-[0_8px_40px_rgba(99,102,241,0.5)] active:scale-[0.98]"
            >
              {startMut.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Roziman va boshlayman
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
            {!allRequiredConsented && (
              <p className="text-center text-[11px] text-slate-500">
                Barcha majburiy (*) bandlarni belgilang
              </p>
            )}
          </div>
        )}

        {/* ── Form (one question) ── */}
        {step === "form" && currentQ && (
          <>
            {/* Step indicators */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap px-1">
              {sortedQs.map((q, i) => {
                const answered = isAnswered(q, answers);
                const active = i === safeIndex;
                return (
                  <button
                    key={q.id}
                    type="button"
                    title={`Savol ${i + 1}`}
                    onClick={() => jumpTo(i)}
                    className={`rounded-full transition-all duration-300 ${
                      active
                        ? "w-7 h-2.5 bg-gradient-to-r from-indigo-400 to-cyan-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                        : answered
                        ? "w-2.5 h-2.5 bg-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.4)]"
                        : "w-2.5 h-2.5 bg-white/15 hover:bg-white/30"
                    }`}
                  />
                );
              })}
            </div>

            <div
              key={currentQ.id}
              className={`relative overflow-hidden rounded-[1.75rem] border border-white/[0.1] bg-gradient-to-b from-white/[0.07] via-white/[0.03] to-transparent p-6 sm:p-8 min-h-[320px] flex flex-col shadow-[0_8px_40px_rgba(0,0,0,0.35)] ${
                slideDir === "next" ? "animate-fade-up" : "animate-fade-in"
              }`}
            >
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
              <div className="absolute -top-20 right-0 w-40 h-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

              <div className="relative flex items-center justify-between gap-2 mb-5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-xs font-bold text-indigo-200 tabular-nums">
                    {safeIndex + 1}
                  </span>
                  <div>
                    <p className="text-[11px] text-slate-500">
                      / {totalQ} savol
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentQ.required ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium">
                      Majburiy
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-500">
                      Ixtiyoriy
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 tabular-nums hidden sm:inline">
                    {answeredCount}/{totalQ}
                  </span>
                </div>
              </div>

              <div className="relative space-y-2 mb-6 flex-1">
                <p className="text-xl sm:text-[1.35rem] font-bold text-white leading-snug tracking-tight">
                  {currentQ.text}
                </p>
                {currentQ.help_text && (
                  <p className="text-sm text-slate-500 leading-relaxed">{currentQ.help_text}</p>
                )}
              </div>

              <div className="relative">
                <QuestionField
                  q={currentQ}
                  value={answers[currentQ.id]}
                  disabled={submitMut.isPending}
                  onChange={(val) => setAnswers((a) => ({ ...a, [currentQ.id]: val }))}
                />
              </div>
            </div>

            {/* Bottom nav */}
            <div className="fixed bottom-0 inset-x-0 z-20 border-t border-white/[0.06] bg-[#020617]/85 backdrop-blur-2xl pb-safe-bottom">
              <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={isFirst || submitMut.isPending}
                  className="flex items-center justify-center gap-1 px-4 py-3.5 rounded-2xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:border-white/20 disabled:opacity-25 disabled:pointer-events-none min-w-[6.5rem] transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Orqaga
                </button>

                {!isLast ? (
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={submitMut.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-sm font-bold text-white shadow-[0_6px_28px_rgba(99,102,241,0.4)] transition-all active:scale-[0.98]"
                  >
                    Oldinga
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitMut.isPending || !token}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-sm font-bold text-white shadow-[0_6px_28px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98]"
                  >
                    {submitMut.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Yuborish
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {step === "form" && !currentQ && (
          <p className="text-center text-sm text-slate-500 py-12">Savollar yo&apos;q</p>
        )}
      </div>
    </Shell>
  );
}
