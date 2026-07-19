"use client";

import Link from "next/link";
import { Suspense, useCallback, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList, CheckCircle2, Clock, EyeOff, Eye,
  AlertCircle, Sparkles, Inbox, Flame, QrCode,
  Share2, Copy, Check, ExternalLink, MessageCircle,
  Send, Users, HelpCircle, Calendar,
  Link2, Download, ChevronLeft, ChevronRight,
} from "lucide-react";
import { surveysApi } from "@/lib/api";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import type { Survey } from "@/types";
import StudentShell from "@/components/student/StudentShell";
import { useI18n } from "@/i18n/I18nProvider";

function unwrapList(res: { data?: unknown }): Survey[] {
  // axios: res.data = { success, data: Survey[] }
  const body = (res as { data?: unknown })?.data as
    | { data?: unknown; results?: unknown }
    | unknown[]
    | undefined;
  if (Array.isArray(body)) return body as Survey[];
  if (body && typeof body === "object") {
    const o = body as { data?: unknown; results?: unknown };
    if (Array.isArray(o.data)) return o.data as Survey[];
    if (Array.isArray(o.results)) return o.results as Survey[];
  }
  return [];
}



/** Har sahifada 8 ta so'rovnoma (4×2 grid) */
const PAGE_SIZE = 8;

/** 4 ustunli card grid */
const CARD_GRID =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4";

function resolveQrSrc(qr: string | null | undefined): string | null {
  if (!qr) return null;
  if (qr.startsWith("http://") || qr.startsWith("https://") || qr.startsWith("data:")) {
    return qr;
  }
  const mediaHost =
    process.env.NEXT_PUBLIC_MEDIA_URL ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ||
    "http://127.0.0.1:8000";
  return `${mediaHost.replace(/\/$/, "")}${qr.startsWith("/") ? "" : "/"}${qr}`;
}

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("uz-UZ", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function surveyShareUrl(s: Survey): string {
  if (s.public_url) return s.public_url;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/s/${s.id}`;
  }
  return `/s/${s.id}`;
}

export default function SurveysAvailablePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020617] flex items-center justify-center">
          <div className="w-11 h-11 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SurveysAvailableInner />
    </Suspense>
  );
}

function SurveysAvailableInner() {
  const { user, isReady } = useRoleGuard(["student", "teacher", "staff"]);
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const AUDIENCE_LABEL: Record<string, string> = {
    students: t("surveys.audienceStudents"),
    staff: t("surveys.audienceStaff"),
    all: t("surveys.audienceAll"),
  };

  const pageFromUrl = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["surveys-available"],
    queryFn: async () => unwrapList(await surveysApi.available()),
    enabled: isReady && !!user,
    staleTime: 20_000,
  });

  /** Yaratilish sanasi bo'yicha (yangi → eski); javob berilganlari ham shu tartibda */
  const sorted = useMemo(() => {
    const list = [...(data ?? [])];
    list.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (tb !== ta) return tb - ta;
      const pa = a.published_at ? new Date(a.published_at).getTime() : 0;
      const pb = b.published_at ? new Date(b.published_at).getTime() : 0;
      return pb - pa;
    });
    return list;
  }, [data]);

  const pendingCount = useMemo(
    () => sorted.filter((s) => !s.already_submitted).length,
    [sorted]
  );
  const doneCount = useMemo(
    () => sorted.filter((s) => s.already_submitted).length,
    [sorted]
  );

  const total = sorted.length;
  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;
  const page = Math.min(pageFromUrl, totalPages);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  const goToPage = useCallback(
    (next: number) => {
      const p = Math.min(Math.max(1, next), Math.max(1, totalPages));
      const params = new URLSearchParams(searchParams.toString());
      if (p <= 1) params.delete("page");
      else params.set("page", String(p));
      const q = params.toString();
      router.push(q ? `${pathname}?${q}` : pathname, { scroll: true });
      // Kartochkalar boshiga
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [pathname, router, searchParams, totalPages]
  );

  if (!isReady || !user) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-11 h-11 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <StudentShell user={user} title={t("surveys.title")} badge={pendingCount}>
      <div className="space-y-5 sm:space-y-6 pb-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.1] p-5 sm:p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/35 via-[#12102a] to-indigo-700/30" />
          <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-fuchsia-500/25 blur-3xl" />
          <div className="absolute left-1/3 bottom-0 w-32 h-32 rounded-full bg-cyan-400/15 blur-2xl" />

          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white text-violet-600 flex items-center justify-center shadow-xl shrink-0">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-violet-200/80 flex items-center gap-1.5 mb-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Ovozingiz muhim
                </p>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  So&apos;rovnomalar
                </h1>
                <p className="text-xs sm:text-sm text-slate-300/75 mt-1">
                  Yaratilish sanasi bo&apos;yicha · har sahifada {PAGE_SIZE} ta
                  {totalPages > 1 ? ` · ${totalPages} sahifa` : ""}
                </p>
              </div>
            </div>

            <div className="relative grid grid-cols-3 gap-2 sm:gap-3 w-full sm:w-auto sm:min-w-[280px]">
              <div className="rounded-xl bg-black/25 border border-white/10 px-3 py-2.5 backdrop-blur-sm text-center">
                <div className="flex items-center justify-center gap-1 text-amber-300 mb-0.5">
                  <Flame className="w-3 h-3" />
                  <span className="text-[9px] uppercase tracking-wider font-semibold">Faol</span>
                </div>
                <p className="text-2xl font-black text-white">{pendingCount}</p>
              </div>
              <div className="rounded-xl bg-black/25 border border-white/10 px-3 py-2.5 backdrop-blur-sm text-center">
                <div className="flex items-center justify-center gap-1 text-emerald-300 mb-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="text-[9px] uppercase tracking-wider font-semibold">Tayyor</span>
                </div>
                <p className="text-2xl font-black text-white">{doneCount}</p>
              </div>
              <div className="rounded-xl bg-black/25 border border-white/10 px-3 py-2.5 backdrop-blur-sm text-center">
                <div className="flex items-center justify-center gap-1 text-cyan-300 mb-0.5">
                  <QrCode className="w-3 h-3" />
                  <span className="text-[9px] uppercase tracking-wider font-semibold">Jami</span>
                </div>
                <p className="text-2xl font-black text-white">{total}</p>
              </div>
            </div>
          </div>
        </section>

        {isLoading && (
          <div className={CARD_GRID}>
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.03] h-[380px] animate-pulse"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center gap-3 text-rose-100 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            Yuklashda xatolik. Qayta urinib ko&apos;ring.
          </div>
        )}

        {!isLoading && !error && total === 0 && (
          <div className="rounded-[1.75rem] border border-dashed border-white/12 bg-white/[0.02] p-12 text-center">
            <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Inbox className="w-9 h-9 text-slate-500" />
            </div>
            <p className="text-lg font-bold text-slate-200">{t("surveys.empty")}</p>
            <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
              Yangi so&apos;rovnomalar ochilganda shu yerda paydo bo&apos;ladi
            </p>
          </div>
        )}

        {!isLoading && !error && total > 0 && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Barcha so&apos;rovnomalar · yangidan eskiga
              </h2>
              <p className="text-[11px] text-slate-400 tabular-nums font-medium">
                {(page - 1) * PAGE_SIZE + 1}
                –
                {Math.min(page * PAGE_SIZE, total)}
                {" / "}
                {total}
                {totalPages > 1 ? ` · sahifa ${page}/${totalPages}` : ""}
              </p>
            </div>

            {/* Yuqoridagi paginatsiya — ko'rinadi va bosiladi */}
            {totalPages > 1 && (
              <PaginationBar page={page} totalPages={totalPages} onChange={goToPage} />
            )}

            <div className={CARD_GRID}>
              {pageItems.map((s) => (
                <SurveyShareCard key={s.id} survey={s} />
              ))}
            </div>

            {/* Pastki paginatsiya — mobil dock ustida */}
            {totalPages > 1 && (
              <div className="sticky bottom-20 md:bottom-4 z-30 pt-2 pb-2">
                <PaginationBar page={page} totalPages={totalPages} onChange={goToPage} elevated />
              </div>
            )}
          </section>
        )}
      </div>
    </StudentShell>
  );
}

function PaginationBar({
  page,
  totalPages,
  onChange,
  elevated,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  elevated?: boolean;
}) {
  const pages = useMemo(() => {
    const out: (number | "…")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) out.push(i);
      return out;
    }
    out.push(1);
    if (page > 3) out.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      out.push(i);
    }
    if (page < totalPages - 2) out.push("…");
    out.push(totalPages);
    return out;
  }, [page, totalPages]);

  return (
    <nav
      className={`flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 rounded-2xl border px-3 py-2.5 ${
        elevated
          ? "border-indigo-400/30 bg-[#0a1020]/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
          : "border-white/10 bg-white/[0.04]"
      }`}
      aria-label="Sahifalar"
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-semibold border border-white/10 bg-black/20 text-slate-200 hover:text-white hover:bg-white/10 disabled:opacity-35 disabled:pointer-events-none transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Oldingi
      </button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e-${i}`} className="px-1.5 text-slate-600 text-xs">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={`min-w-[2.25rem] h-9 px-2 rounded-xl text-[12px] font-bold tabular-nums transition-all ${
              p === page
                ? "bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)]"
                : "border border-white/10 bg-black/20 text-slate-400 hover:text-white hover:bg-white/[0.08]"
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-semibold border border-white/10 bg-black/20 text-slate-200 hover:text-white hover:bg-white/10 disabled:opacity-35 disabled:pointer-events-none transition-colors"
      >
        Keyingi
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </nav>
  );
}

function SurveyShareCard({ survey: s }: { survey: Survey }) {
  const { t } = useI18n();
  const finished = !!s.already_submitted;
  const shareUrl = surveyShareUrl(s);
  const qrSrc = resolveQrSrc(s.qr_image);
  const [copied, setCopied] = useState(false);
  const AUDIENCE_LABEL: Record<string, string> = {
    students: t("surveys.audienceStudents"),
    staff: t("surveys.audienceStaff"),
    all: t("surveys.audienceAll"),
  };

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [shareUrl]);

  const shareNative = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: s.title,
          text: s.description || s.title,
          url: shareUrl,
        });
      } catch {
        /* cancelled */
      }
    } else {
      await copyLink();
    }
  }, [s.title, s.description, shareUrl, copyLink]);

  const telegramHref = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(s.title)}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${s.title}\n${shareUrl}`)}`;

  const years =
    Array.isArray(s.study_years) && s.study_years.length > 0
      ? s.study_years.map((y) => `${y}-k`).join(", ")
      : "Barcha";

  return (
    <article
      className={`group relative flex flex-col h-full rounded-2xl border overflow-hidden transition-all duration-300 ${
        finished
          ? "border-white/[0.07] bg-white/[0.025]"
          : "border-indigo-400/30 bg-gradient-to-b from-indigo-500/[0.14] via-[#0a0f1e]/95 to-[#080c18] shadow-[0_12px_36px_-16px_rgba(79,70,229,0.45)] hover:border-indigo-300/50 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-12px_rgba(99,102,241,0.4)]"
      }`}
    >
      <div
        className={`h-0.5 w-full shrink-0 ${
          finished
            ? "bg-gradient-to-r from-emerald-500/60 to-teal-500/40"
            : "bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
        }`}
      />

      <div className="p-3.5 sm:p-4 flex flex-col flex-1 gap-3">
        {/* Status badges */}
        <div className="flex flex-wrap items-center gap-1">
          {finished ? (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-semibold">
              ✓ {t("surveys.submitted")}
            </span>
          ) : (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 font-semibold">
              {t("surveys.open")}
            </span>
          )}
          {s.privacy_mode === "anonymous" ? (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 inline-flex items-center gap-0.5">
              <EyeOff className="w-2.5 h-2.5" /> {t("surveys.anonymous")}
            </span>
          ) : (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 inline-flex items-center gap-0.5">
              <Eye className="w-2.5 h-2.5" /> {t("surveys.open")}
            </span>
          )}
        </div>

        {/* Title + created date */}
        <div className="min-h-[2.8rem]">
          <h2 className="font-bold text-white text-[13px] leading-snug line-clamp-2">
            {s.title}
          </h2>
          {s.created_at && (
            <p className="text-[9px] text-slate-500 mt-1 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5 shrink-0" />
              Yaratilgan: {formatDateShort(s.created_at)}
            </p>
          )}
        </div>

        {/* QR centered */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="rounded-xl bg-white p-2 shadow-md border border-white/15">
            {qrSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrSrc}
                alt={`${s.title} QR`}
                className="w-[96px] h-[96px] object-contain"
                loading="lazy"
              />
            ) : (
              <div className="w-[96px] h-[96px] flex flex-col items-center justify-center gap-1 bg-slate-100 text-slate-400 rounded-md">
                <QrCode className="w-7 h-7 opacity-50" />
                <span className="text-[8px] font-medium">QR yo&apos;q</span>
              </div>
            )}
          </div>
          {qrSrc && (
            <a
              href={qrSrc}
              download={`qr-${s.id.slice(0, 8)}.png`}
              target="_blank"
              rel="noreferrer"
              className="text-[9px] text-slate-500 hover:text-indigo-300 flex items-center gap-0.5"
            >
              <Download className="w-2.5 h-2.5" /> QR
            </a>
          )}
        </div>

        {/* Compact params 2x2 */}
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <Chip icon={HelpCircle} text={`${s.question_count ?? "—"} ${t("surveys.questions")}`} />
          <Chip icon={Users} text={AUDIENCE_LABEL[s.audience] || s.audience || "—"} />
          <Chip icon={MessageCircle} text={`${s.response_count ?? 0}`} />
          <Chip icon={Calendar} text={years} />
          <Chip
            icon={Clock}
            text={s.end_at ? formatDateShort(s.end_at) : t("surveys.deadline")}
            className="col-span-2"
            accent={!!s.end_at}
          />
        </div>

        {/* Link */}
        <div className="rounded-lg bg-black/30 border border-white/[0.06] px-2 py-1.5 flex items-center gap-1.5 min-w-0">
          <Link2 className="w-3 h-3 text-indigo-300/70 shrink-0" />
          <code className="text-[9px] text-indigo-200/80 truncate flex-1 font-mono">
            {shareUrl.replace(/^https?:\/\//, "")}
          </code>
          <button
            type="button"
            onClick={copyLink}
            className="shrink-0 p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white"
            title="Nusxa"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Share icon row */}
        <div className="flex items-center justify-center gap-1.5">
          <IconBtn onClick={shareNative} title="Ulashish" className="bg-white/[0.06] border-white/10 text-slate-200">
            <Share2 className="w-3.5 h-3.5" />
          </IconBtn>
          <IconBtn href={telegramHref} title="Telegram" className="bg-sky-500/15 border-sky-400/25 text-sky-200">
            <Send className="w-3.5 h-3.5" />
          </IconBtn>
          <IconBtn href={whatsappHref} title="WhatsApp" className="bg-emerald-500/15 border-emerald-400/25 text-emerald-200">
            <MessageCircle className="w-3.5 h-3.5" />
          </IconBtn>
          <IconBtn onClick={copyLink} title="Havola" className="bg-violet-500/15 border-violet-400/25 text-violet-200">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </IconBtn>
        </div>

        {/* CTA — topshirilganlarda havola/tugma yo'q */}
        <div className="mt-auto pt-0.5">
          {finished ? (
            <div className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200/90 text-[11px] font-semibold py-2.5 cursor-default select-none">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t("surveys.submitted")}
            </div>
          ) : (
            <Link
              href={`/s/${s.id}`}
              className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-[12px] font-bold py-2.5 shadow-[0_6px_18px_rgba(99,102,241,0.35)] transition-all active:scale-[0.98]"
            >
              {t("surveys.start")}
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function Chip({
  icon: Icon,
  text,
  className = "",
  accent,
}: {
  icon: typeof HelpCircle;
  text: string;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1 min-w-0 rounded-lg bg-white/[0.04] border border-white/[0.06] px-1.5 py-1 ${className}`}
      title={text}
    >
      <Icon className={`w-3 h-3 shrink-0 ${accent ? "text-amber-300" : "text-slate-500"}`} />
      <span className={`truncate font-medium ${accent ? "text-amber-200/90" : "text-slate-300"}`}>
        {text}
      </span>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  href,
  title,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  title: string;
  className?: string;
}) {
  const cls = `inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-colors hover:brightness-110 ${className}`;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" title={title} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} title={title} className={cls}>
      {children}
    </button>
  );
}
