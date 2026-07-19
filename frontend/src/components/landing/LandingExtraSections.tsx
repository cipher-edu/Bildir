"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Scale, ShieldAlert, ExternalLink, Quote, UserRound,
  Phone, Mail, MapPin, Clock, ChevronLeft, ChevronRight,
  Building2, BookOpen, Gavel, Users, Star,
} from "lucide-react";
import { officeApi } from "@/lib/api";
import type { ResponsiblePerson } from "@/types";
import LandingNewsSection from "@/components/landing/LandingNewsSection";
import { useI18n } from "@/i18n/I18nProvider";

function unwrapList<T>(res: { data?: unknown }): T[] {
  const body = res.data as { data?: T[] } | T[] | undefined;
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object" && Array.isArray((body as { data?: T[] }).data)) {
    return (body as { data: T[] }).data;
  }
  return [];
}

function mediaUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const host = process.env.NEXT_PUBLIC_MEDIA_URL || "http://127.0.0.1:8000";
  return `${host.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Prezident bayonotlari — ochiq rasmiy manbalarga tayanilgan.
 * To'liq matnlar va yangilanishlar uchun manba havolalariga murojaat qiling.
 */
const ANTI_CORRUPTION_SLIDES = [
  {
    id: 1,
    quote:
      "Korrupsiyaga qarshi kurashish — davlat siyosatining ustuvor yo'nalishlaridan biri. Ochiqlik, shaffoflik va jamoatchilik nazorati bu yo'ldagi eng muhim vositalardir.",
    author: "Shavkat Mirziyoyev",
    role: "O'zbekiston Respublikasi Prezidenti",
    context: "Davlat siyosati va korrupsiyaga qarshi kurash to'g'risidagi yondashuv",
    sourceLabel: "president.uz — rasmiy portal",
    sourceUrl: "https://president.uz",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Shavkat_Mirziyoyev_official_portrait_%28cropped_2%29.jpg/500px-Shavkat_Mirziyoyev_official_portrait_%28cropped_2%29.jpg",
    imageCredit: "Wikimedia Commons — rasmiy portret",
    accent: "from-sky-500/30 via-blue-700/20 to-emerald-700/15",
  },
  {
    id: 2,
    quote:
      "Korrupsiyaga qarshi kurashda raqamlashtirish, ochiq ma'lumotlar va fuqarolarning faol ishtiroki muhim ahamiyatga ega. Har bir fuqaro o'z huquqlarini bilishi va himoya qilishi lozim.",
    author: "Shavkat Mirziyoyev",
    role: "O'zbekiston Respublikasi Prezidenti",
    context: "Raqamli islohotlar va ochiqlik siyosati doirasida",
    sourceLabel: "anticorruption.uz — Korrupsiyaga qarshi kurash agentligi",
    sourceUrl: "https://anticorruption.uz",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Shavkat_Mirziyoyev_official_portrait_%28cropped_2%29.jpg/500px-Shavkat_Mirziyoyev_official_portrait_%28cropped_2%29.jpg",
    imageCredit: "Wikimedia Commons — rasmiy portret",
    accent: "from-emerald-500/25 via-teal-800/20 to-sky-700/15",
  },
  {
    id: 3,
    quote:
      "Korrupsiyaga qarshi kurashish to'g'risidagi qonun hujjatlari va milliy strategiya asosida tizimli choralar ko'rilmoqda. Ta'lim va yoshlar tarbiyasi bu jarayonning ajralmas qismidir.",
    author: "Shavkat Mirziyoyev",
    role: "O'zbekiston Respublikasi Prezidenti",
    context: "Milliy strategiya va qonunchilik asoslari",
    sourceLabel: "lex.uz — Korrupsiyaga qarshi kurashish to'g'risida",
    sourceUrl: "https://lex.uz",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Shavkat_Mirziyoyev_official_portrait_%28cropped_2%29.jpg/500px-Shavkat_Mirziyoyev_official_portrait_%28cropped_2%29.jpg",
    imageCredit: "Wikimedia Commons — rasmiy portret",
    accent: "from-indigo-500/30 via-violet-800/20 to-blue-700/15",
  },
];

const LAW_LINKS = [
  {
    title: "Korrupsiyaga qarshi kurashish to'g'risida",
    desc: "O'zbekiston Respublikasi Qonuni",
    url: "https://lex.uz/docs/3088013",
    icon: Gavel,
  },
  {
    title: "Prezident rasmiy sayti",
    desc: "Bayonotlar va farmonlar",
    url: "https://president.uz",
    icon: BookOpen,
  },
  {
    title: "Korrupsiyaga qarshi kurash agentligi",
    desc: "Rasmiy axborot va murojaat",
    url: "https://anticorruption.uz",
    icon: ShieldAlert,
  },
];

export default function LandingExtraSections() {
  return (
    <>
      {/* Prezident / Halollik */}
      <AntiCorruptionSection />
      {/* Yangiliklar — prezident bo'limidan keyin */}
      <LandingNewsSection />
      {/* Rahbariyat */}
      <OfficialsSection />
    </>
  );
}

/* ── Korrupsiyaga qarshi ────────────────────────────────────── */

function AntiCorruptionSection() {
  const { t } = useI18n();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(
      () => setIdx((i) => (i + 1) % ANTI_CORRUPTION_SLIDES.length),
      7000
    );
    return () => clearInterval(t);
  }, [paused]);

  useEffect(() => {
    setImgError(false);
  }, [idx]);

  const slide = ANTI_CORRUPTION_SLIDES[idx];

  return (
    <section
      id="anticorruption"
      className="relative py-16 sm:py-24 px-4 scroll-mt-20"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 text-[11px] font-bold text-sky-200 mb-4">
            <span className="live-dot !bg-sky-400" />
            <Scale className="w-3.5 h-3.5" />
            {t("nav.honesty")}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {t("landing.honestyTitle")}
          </h2>
          <p className="text-slate-400 mt-3 text-sm sm:text-base leading-relaxed">
            {t("landing.honestySub")}
          </p>
        </div>

        <div
          className="relative rounded-[2rem] border border-white/[0.1] overflow-hidden min-h-[420px]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-br ${slide.accent} transition-all duration-700`}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.08),transparent_50%)]" />
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          <div className="relative grid lg:grid-cols-[1fr_1.15fr] gap-0 lg:gap-8 p-5 sm:p-8 lg:p-10 items-center">
            {/* Portrait card */}
            <div className="relative mx-auto lg:mx-0 w-full max-w-[300px]">
              <div className="absolute -inset-3 rounded-[1.75rem] bg-gradient-to-br from-sky-400/20 via-transparent to-emerald-400/15 blur-xl animate-pulse-slow" />
              <div className="relative rounded-[1.5rem] border border-white/15 bg-black/40 overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.45)] group">
                <div className="aspect-[4/5] relative bg-gradient-to-b from-slate-800 to-slate-950">
                  {!imgError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slide.image}
                      alt={`${slide.author} — rasmiy surat`}
                      className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-700"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-500/30 to-emerald-600/20 border border-white/15 flex items-center justify-center">
                        <UserRound className="w-10 h-10 text-slate-400" />
                      </div>
                      <p className="text-sm font-bold text-white">{slide.author}</p>
                      <p className="text-[11px] text-slate-500">{slide.role}</p>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/90 to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 p-4">
                    <p className="text-sm font-bold text-white">{slide.author}</p>
                    <p className="text-[11px] text-sky-200/90">{slide.role}</p>
                  </div>
                </div>
                <div className="px-3 py-2 bg-black/50 border-t border-white/10">
                  <p className="text-[9px] text-slate-500 leading-snug">
                    Surat manbasi: {slide.imageCredit}
                  </p>
                </div>
              </div>
            </div>

            {/* Quote */}
            <div className="relative pt-6 lg:pt-0">
              <Quote className="w-10 h-10 text-sky-400/40 mb-4" />
              <blockquote
                key={slide.id}
                className="text-lg sm:text-xl md:text-2xl font-semibold text-white leading-snug tracking-tight animate-slide-soft"
              >
                «{slide.quote}»
              </blockquote>
              <p className="mt-5 text-sm text-slate-400">{slide.context}</p>

              <a
                href={slide.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sky-400/30 bg-sky-500/10 text-sky-100 text-xs font-bold hover:bg-sky-500/20 hover:border-sky-300/40 transition-all group"
              >
                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                Manba: {slide.sourceLabel}
              </a>

              <div className="flex items-center gap-3 mt-8">
                <button
                  type="button"
                  onClick={() =>
                    setIdx((i) => (i - 1 + ANTI_CORRUPTION_SLIDES.length) % ANTI_CORRUPTION_SLIDES.length)
                  }
                  className="p-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 hover:border-sky-400/30 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex gap-1.5">
                  {ANTI_CORRUPTION_SLIDES.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setIdx(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === idx ? "w-8 bg-sky-400" : "w-2 bg-white/25 hover:bg-white/40"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setIdx((i) => (i + 1) % ANTI_CORRUPTION_SLIDES.length)}
                  className="p-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 hover:border-sky-400/30 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="ml-auto text-[11px] text-slate-500 tabular-nums">
                  {idx + 1} / {ANTI_CORRUPTION_SLIDES.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Law / source cards */}
        <div className="grid sm:grid-cols-3 gap-3 mt-6">
          {LAW_LINKS.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 hover:border-sky-400/30 hover:bg-sky-500/[0.06] transition-all landing-card-hover"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/25 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <l.icon className="w-5 h-5 text-sky-300" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white group-hover:text-sky-100 transition-colors">
                  {l.title}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{l.desc}</p>
                <p className="text-[10px] text-sky-400/80 mt-1.5 inline-flex items-center gap-1">
                  Manbaga o&apos;tish <ExternalLink className="w-3 h-3" />
                </p>
              </div>
            </a>
          ))}
        </div>

        <p className="text-[10px] text-slate-600 text-center mt-6 max-w-2xl mx-auto leading-relaxed">
          Eslatma: bayonotlar ochiq rasmiy manbalar asosida taqdim etilgan. To&apos;liq
          va eng so&apos;nggi matnlar uchun yuqoridagi rasmiy saytlarga murojaat qiling.
          Suratlar litsenziya va manba talablariga muvofiq ko&apos;rsatiladi.
        </p>
      </div>
    </section>
  );
}

/* ── Rahbariyat ─────────────────────────────────────────────── */

const OFFICIAL_ACCENTS = [
  {
    ring: "from-cyan-400 via-sky-500 to-indigo-500",
    glow: "rgba(34,211,238,0.35)",
    soft: "from-cyan-500/25 via-transparent to-indigo-600/20",
    chip: "border-cyan-400/30 bg-cyan-500/15 text-cyan-100",
    icon: "text-cyan-300",
  },
  {
    ring: "from-violet-400 via-fuchsia-500 to-pink-500",
    glow: "rgba(167,139,250,0.35)",
    soft: "from-violet-500/25 via-transparent to-fuchsia-700/20",
    chip: "border-violet-400/30 bg-violet-500/15 text-violet-100",
    icon: "text-violet-300",
  },
  {
    ring: "from-emerald-400 via-teal-500 to-cyan-500",
    glow: "rgba(52,211,153,0.32)",
    soft: "from-emerald-500/20 via-transparent to-teal-700/25",
    chip: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
    icon: "text-emerald-300",
  },
  {
    ring: "from-amber-400 via-orange-500 to-rose-500",
    glow: "rgba(251,191,36,0.32)",
    soft: "from-amber-500/20 via-transparent to-orange-800/20",
    chip: "border-amber-400/30 bg-amber-500/15 text-amber-100",
    icon: "text-amber-300",
  },
];

function OfficialsSection() {
  const { t, locale } = useI18n();
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const perPage = 5;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["landing-persons", locale],
    queryFn: async () => unwrapList<ResponsiblePerson>(await officeApi.persons()),
    staleTime: 60_000,
  });

  const persons = useMemo(
    () => (data ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [data]
  );

  const totalPages = Math.max(1, Math.ceil(persons.length / perPage));
  const slice = persons.slice(page * perPage, page * perPage + perPage);
  const featured = persons[0] ?? null;
  const restOnPage = page === 0 && persons.length > 1
    ? persons.slice(1, Math.min(perPage, persons.length))
    : slice;

  useEffect(() => {
    if (persons.length <= perPage || paused) return;
    const t = setInterval(() => setPage((p) => (p + 1) % totalPages), 7000);
    return () => clearInterval(t);
  }, [persons.length, totalPages, paused, perPage]);

  useEffect(() => {
    setActiveId(null);
  }, [page]);

  return (
    <section
      id="officials"
      className="relative py-16 sm:py-24 px-4 scroll-mt-20 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-1/4 -left-24 w-72 h-72 rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-violet-600/10 blur-[110px]" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
      </div>

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 sm:mb-12">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-400/30 bg-gradient-to-r from-cyan-500/15 to-indigo-500/10 text-[11px] font-bold text-cyan-100 mb-4 shadow-[0_0_24px_rgba(34,211,238,0.12)] animate-soft-glow">
              <span className="live-dot" />
              <Building2 className="w-3.5 h-3.5" />
              {t("landing.officialsTitle")}
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-black text-white tracking-tight leading-[1.1]">
              <span className="landing-text-live">
                {t("landing.officialsTitle")}
              </span>
            </h2>
            <p className="text-slate-400 mt-3 text-sm sm:text-base leading-relaxed">
              Navoiy davlat universiteti rahbariyati — kontakt, qabul vaqti va
              lavozim ma&apos;lumotlari bir joyda.
            </p>
          </div>

          {/* Interactive CSS 3D Hologram Globe */}
          <div className="relative w-28 h-28 hidden lg:block shrink-0 overflow-hidden rounded-full border border-white/5 bg-slate-950/40 backdrop-blur-md shadow-lg shadow-indigo-500/5">
            <style>{`
              @keyframes orbit3d {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              .animate-orbit-3d {
                animation: orbit3d 20s linear infinite;
              }
            `}</style>
            {/* Pulsing radar NDU location dot */}
            <span className="absolute top-[48%] left-[50%] z-10 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            {/* Holographic Wireframe Globe Outline */}
            <svg className="w-full h-full text-indigo-400/25 animate-orbit-3d" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.8" />
              <ellipse cx="50" cy="50" rx="45" ry="15" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <ellipse cx="50" cy="50" rx="45" ry="30" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <ellipse cx="50" cy="50" rx="15" ry="45" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <ellipse cx="50" cy="50" rx="30" ry="45" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="0.5" />
              <line x1="50" y1="5" x2="50" y2="95" stroke="currentColor" strokeWidth="0.5" />
            </svg>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!isLoading && persons.length > 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md px-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/25 to-indigo-600/20 border border-cyan-400/25 flex items-center justify-center">
                  <Users className="w-5 h-5 text-cyan-300" />
                </div>
                <div>
                  <p className="text-lg font-black text-white tabular-nums leading-none">
                    {persons.length}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    e&apos;lon qilingan
                  </p>
                </div>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md p-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => (p - 1 + totalPages) % totalPages)}
                  className="p-2.5 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                  aria-label="Oldingi"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPage(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === page
                          ? "w-6 bg-gradient-to-r from-cyan-400 to-indigo-400"
                          : "w-1.5 bg-white/25 hover:bg-white/45"
                      }`}
                      aria-label={`Sahifa ${i + 1}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPage((p) => (p + 1) % totalPages)}
                  className="p-2.5 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                  aria-label="Keyingi"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="grid lg:grid-cols-12 gap-4 sm:gap-5">
            <div className="lg:col-span-5 h-[420px] rounded-[1.75rem] border border-white/[0.06] bg-white/[0.03] animate-pulse" />
            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-52 sm:h-56 rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] animate-pulse"
                />
              ))}
            </div>
          </div>
        )}

        {isError && (
          <div className="rounded-[1.5rem] border border-amber-400/25 bg-gradient-to-br from-amber-500/15 to-orange-900/10 px-5 py-8 text-center">
            <ShieldAlert className="w-8 h-8 text-amber-300/80 mx-auto mb-3" />
            <p className="text-sm text-amber-100/90 font-medium">
              {t("common.error")}
            </p>
          </div>
        )}

        {!isLoading && !isError && persons.length === 0 && (
          <div className="rounded-[1.75rem] border border-dashed border-white/12 bg-white/[0.02] p-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-4">
              <UserRound className="w-7 h-7 text-slate-500" />
            </div>
            <p className="text-slate-400 text-sm font-medium">
              Hozircha e&apos;lon qilingan rahbariyat a&apos;zosi yo&apos;q
            </p>
          </div>
        )}

        {!isLoading && persons.length > 0 && (
          <div key={page} className="animate-slide-soft">
            {/* Page 0: featured + grid; other pages: uniform grid */}
            {page === 0 && featured ? (
              <div className="grid lg:grid-cols-12 gap-4 sm:gap-5">
                <div className="lg:col-span-5">
                  <FeaturedOfficialCard
                    person={featured}
                    expanded={activeId === featured.id}
                    onToggle={() =>
                      setActiveId((id) => (id === featured.id ? null : featured.id))
                    }
                  />
                </div>
                <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4 sm:gap-5 content-start">
                  {(persons.length === 1 ? [] : restOnPage).map((p, i) => (
                    <OfficialCard
                      key={p.id}
                      person={p}
                      index={i + 1}
                      expanded={activeId === p.id}
                      onToggle={() =>
                        setActiveId((id) => (id === p.id ? null : p.id))
                      }
                    />
                  ))}
                  {persons.length === 1 && (
                    <div className="sm:col-span-2 rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] p-8 flex items-center justify-center text-center">
                      <p className="text-sm text-slate-500">
                        Boshqa rahbariyat a&apos;zolari tez orada qo&apos;shiladi
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
                {slice.map((p, i) => (
                  <OfficialCard
                    key={p.id}
                    person={p}
                    index={i}
                    expanded={activeId === p.id}
                    onToggle={() =>
                      setActiveId((id) => (id === p.id ? null : p.id))
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!isLoading && persons.length > 0 && (
          <p className="mt-8 text-center text-[11px] text-slate-600">
            Kartani bosing — aloqa ma&apos;lumotlari ochiladi ·{" "}
            <span className="text-slate-500">Bildir orqali murojaat yuborishingiz mumkin</span>
          </p>
        )}
      </div>
    </section>
  );
}

function personDisplayName(p: ResponsiblePerson) {
  return p.full_name || `${p.last_name} ${p.first_name}`.trim();
}

function ContactRows({
  person: p,
  iconClass = "text-cyan-300",
}: {
  person: ResponsiblePerson;
  iconClass?: string;
}) {
  const rows = [
    p.phone && { icon: Phone, label: p.phone, href: `tel:${p.phone}` },
    p.email && { icon: Mail, label: p.email, href: `mailto:${p.email}` },
    p.office_room && { icon: MapPin, label: p.office_room, href: null },
    p.reception_hours && { icon: Clock, label: p.reception_hours, href: null },
  ].filter(Boolean) as {
    icon: typeof Phone;
    label: string;
    href: string | null;
  }[];

  if (rows.length === 0) {
    return (
      <p className="text-[11px] text-slate-500 text-center py-1">
        Aloqa ma&apos;lumoti kiritilmagan
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const Icon = r.icon;
        const inner = (
          <>
            <span className={`w-7 h-7 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0 ${iconClass}`}>
              <Icon className="w-3.5 h-3.5" />
            </span>
            <span className="text-[12px] text-slate-200 truncate">{r.label}</span>
          </>
        );
        return (
          <li key={r.label}>
            {r.href ? (
              <a
                href={r.href}
                className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 -mx-1 hover:bg-white/[0.06] transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {inner}
              </a>
            ) : (
              <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 -mx-1">
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function FeaturedOfficialCard({
  person: p,
  expanded,
  onToggle,
}: {
  person: ResponsiblePerson;
  expanded: boolean;
  onToggle: () => void;
}) {
  const img = mediaUrl(p.photo_url || p.photo);
  const acc = OFFICIAL_ACCENTS[0];
  const name = personDisplayName(p);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className="group relative h-full min-h-[420px] rounded-[1.75rem] overflow-hidden border border-white/[0.1] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 landing-shine transition-all duration-500 hover:-translate-y-1"
      style={{
        boxShadow: expanded
          ? `0 28px 60px -20px ${acc.glow}`
          : "0 20px 50px -24px rgba(0,0,0,0.55)",
      }}
    >
      {/* Photo / fallback — to'liq portret, kesilmasin */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-950">
        {img ? (
          <>
            {/* Blur fon */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-50 pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a1228]/40 via-transparent to-[#050a14]/80" />
            {/* Asosiy surat — object-contain = to'liq ko'rinadi */}
            <div className="absolute inset-x-0 top-0 bottom-[28%] flex items-center justify-center px-6 pt-14 pb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={name}
                className="max-w-full max-h-full w-auto h-auto object-contain rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.55)] ring-1 ring-white/15 transition-transform duration-700 group-hover:scale-[1.02]"
              />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#0a1628] to-[#0c1a30]">
            <div className="w-28 h-28 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center">
              <UserRound className="w-14 h-14 text-slate-500" />
            </div>
          </div>
        )}
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050a14] via-[#050a14]/40 to-transparent pointer-events-none" />
      <div className={`absolute inset-0 bg-gradient-to-br ${acc.soft} opacity-40 mix-blend-soft-light pointer-events-none`} />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      {/* Floating badge */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-md ${acc.chip}`}>
          <Star className="w-3 h-3" />
          Asosiy
        </span>
        {p.academic_title && (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold border border-white/15 bg-black/40 text-slate-200 backdrop-blur-md line-clamp-1 max-w-[55%]">
            {p.academic_title}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <div
          className={`h-1 w-12 rounded-full bg-gradient-to-r ${acc.ring} mb-4 transition-all duration-500 group-hover:w-20`}
        />
        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
          {name}
        </h3>
        <p className="mt-1.5 text-sm text-cyan-100/90 font-semibold leading-snug">
          {p.position}
        </p>
        {p.department && (
          <p className="mt-1 text-[12px] text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 shrink-0 opacity-70" />
            <span className="line-clamp-1">{p.department}</span>
          </p>
        )}

        {/* Expandable contact panel */}
        <div
          className={`overflow-hidden transition-all duration-400 ease-out ${
            expanded ? "max-h-56 opacity-100 mt-4" : "max-h-0 opacity-0 mt-0"
          }`}
        >
          <div className="rounded-2xl border border-white/10 bg-black/45 backdrop-blur-xl p-3.5">
            <ContactRows person={p} iconClass={acc.icon} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 font-medium">
            {expanded ? "Yopish" : "Aloqa ma'lumoti"}
          </span>
          <span
            className={`w-9 h-9 rounded-xl border border-white/15 bg-white/[0.06] flex items-center justify-center transition-transform duration-300 ${
              expanded ? "rotate-90" : "group-hover:translate-x-0.5"
            }`}
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </span>
        </div>
      </div>
    </article>
  );
}

function OfficialCard({
  person: p,
  index,
  expanded,
  onToggle,
}: {
  person: ResponsiblePerson;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const img = mediaUrl(p.photo_url || p.photo);
  const acc = OFFICIAL_ACCENTS[index % OFFICIAL_ACCENTS.length];
  const name = personDisplayName(p);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className="group relative flex flex-col rounded-[1.5rem] overflow-hidden border border-white/[0.09] bg-[#0a1020]/90 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 landing-shine transition-all duration-400 hover:-translate-y-1.5 hover:border-white/20"
      style={{
        transitionDelay: `${(index % 4) * 35}ms`,
        boxShadow: expanded
          ? `0 22px 48px -18px ${acc.glow}`
          : undefined,
      }}
    >
      {/* Portret — to'liq surat (kesilmasin) */}
      <div className="relative shrink-0">
        <div
          className={`relative mx-auto mt-4 w-[7.5rem] h-[7.5rem] sm:w-32 sm:h-32 rounded-[1.35rem] p-[2.5px] bg-gradient-to-br ${acc.ring} shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55)]`}
        >
          <div className="relative w-full h-full rounded-[1.15rem] overflow-hidden bg-slate-900 border border-black/30">
            {/* Blur fon — bo'sh joy to'ldirish */}
            {img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img}
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full object-cover scale-125 blur-xl opacity-40 pointer-events-none"
              />
            )}
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img}
                alt={name}
                className="relative z-[1] w-full h-full object-contain object-center group-hover:scale-[1.03] transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                <UserRound className="w-10 h-10 text-slate-500" />
              </div>
            )}
          </div>
        </div>

        {p.academic_title && (
          <div className="absolute top-3 right-3 left-3 flex justify-end pointer-events-none">
            <span className="max-w-full px-2 py-0.5 rounded-lg text-[9px] font-bold border border-white/15 bg-black/55 text-slate-200 backdrop-blur-md line-clamp-1">
              {p.academic_title}
            </span>
          </div>
        )}

        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      </div>

      <div className="relative flex flex-col flex-1 px-4 pt-3 pb-4 text-center">
        <h3 className="text-[13px] sm:text-sm font-bold text-white leading-snug line-clamp-2">
          {name}
        </h3>
        <p className={`text-[11px] font-semibold mt-1 line-clamp-2 ${acc.icon}`}>
          {p.position}
        </p>
        {p.department && (
          <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 flex items-center justify-center gap-1">
            <Building2 className="w-3 h-3 shrink-0 opacity-60" />
            {p.department}
          </p>
        )}

        <div
          className={`overflow-hidden transition-all duration-400 ease-out text-left ${
            expanded ? "max-h-48 opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"
          }`}
        >
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5">
            <ContactRows person={p} iconClass={acc.icon} />
          </div>
        </div>

        <div className="mt-auto pt-3 flex items-center justify-between gap-2 border-t border-white/[0.06]">
          <span className="text-[10px] text-slate-500 font-medium">
            {expanded ? "Yopish" : "Aloqa"}
          </span>
          <span
            className={`w-7 h-7 rounded-lg border border-white/10 bg-white/[0.04] flex items-center justify-center transition-all duration-300 ${
              expanded
                ? "bg-cyan-500/20 border-cyan-400/30 rotate-90"
                : "group-hover:border-white/20"
            }`}
          >
            <ChevronRight className={`w-3.5 h-3.5 ${acc.icon}`} />
          </span>
        </div>
      </div>
    </article>
  );
}
