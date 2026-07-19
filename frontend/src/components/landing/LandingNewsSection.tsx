"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Newspaper, ChevronRight, Calendar, Pin, Star, Loader2, ArrowRight,
} from "lucide-react";
import { newsApi } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import type { NewsArticle } from "@/types";
import { useI18n } from "@/i18n/I18nProvider";

function unwrapList<T>(res: { data?: unknown }): T[] {
  const body = res.data as { data?: T[] | { results?: T[] } } | T[] | undefined;
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object" && "data" in body) {
    const d = (body as { data: T[] | { results?: T[] } }).data;
    if (Array.isArray(d)) return d;
    if (d && typeof d === "object" && Array.isArray((d as { results?: T[] }).results)) {
      return (d as { results: T[] }).results;
    }
  }
  return [];
}

/** Landing: eng yangi 8 ta yangilik — 4 ustun × 2 qator (desktop) */
export default function LandingNewsSection() {
  const { t, locale } = useI18n();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["landing-news", 8, locale],
    queryFn: async () =>
      unwrapList<NewsArticle>(await newsApi.list({ limit: "8", lang: locale })),
    staleTime: 60_000,
  });

  const items = data ?? [];

  return (
    <section id="news" className="relative py-16 sm:py-24 px-4 scroll-mt-20">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-1/3 -right-16 w-72 h-72 rounded-full bg-violet-600/10 blur-[100px]" />
        <div className="absolute bottom-1/4 -left-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-[90px]" />
      </div>

      <div className="relative max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-10">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 text-[11px] font-bold text-violet-100 mb-3 shadow-[0_0_24px_rgba(139,92,246,0.12)]">
              <span className="live-dot !bg-violet-400" />
              <Newspaper className="w-3.5 h-3.5" />
              {t("landing.newsBadge")}
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {t("landing.newsTitle")}
            </h2>
            <p className="text-slate-400 mt-2 text-sm sm:text-base leading-relaxed">
              {t("landing.newsSub")}
            </p>
          </div>

          <Link
            href="/news"
            className="group inline-flex items-center gap-2 self-start lg:self-auto px-5 py-3 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 text-sm font-bold text-indigo-100 hover:bg-indigo-500/20 hover:border-indigo-300/40 transition-all"
          >
            {t("landing.allNews")}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-[280px] rounded-2xl border border-white/[0.06] bg-white/[0.03] animate-pulse"
              />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-center text-sm text-slate-500 py-10">
            {t("news.loadError")}
          </p>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-500 text-sm">
            {t("news.empty")}
          </div>
        )}

        {/* 4 × 2 modern grid (desktop: 4 ustun) */}
        {items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {items.slice(0, 8).map((n, i) => {
              const img = mediaUrl(n.cover_url || n.cover);
              return (
                <Link
                  key={n.id}
                  href={`/news/${n.slug}`}
                  className="group relative flex flex-col rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02] overflow-hidden landing-card-hover landing-shine"
                  style={{ transitionDelay: `${(i % 4) * 40}ms` }}
                >
                  <div className="aspect-[4/3] bg-slate-900 relative shrink-0">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/50 via-[#0a1020] to-violet-950/40">
                        <Newspaper className="w-8 h-8 text-slate-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/20 to-transparent" />
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                      {n.is_pinned && (
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/90 text-white inline-flex items-center gap-0.5">
                          <Pin className="w-2.5 h-2.5" />
                        </span>
                      )}
                      {n.is_featured && (
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-cyan-500/90 text-white inline-flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <span className="absolute bottom-2.5 left-2.5 right-2.5 text-[9px] font-bold text-violet-200/90 truncate">
                      {n.category_label || n.category}
                    </span>
                  </div>

                  <div className="flex flex-col flex-1 p-3.5 sm:p-4">
                    <h3 className="text-[13px] sm:text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-indigo-100 transition-colors min-h-[2.5rem]">
                      {n.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 flex-1">
                      {n.summary || "Batafsil o'qish…"}
                    </p>
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.06] text-[10px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3 opacity-70" />
                        {n.published_at
                          ? new Date(n.published_at).toLocaleDateString("uz-UZ")
                          : "—"}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-indigo-400/80 group-hover:text-indigo-300">
                        Batafsil
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pastki CTA — umumiy sahifa */}
        {items.length > 0 && (
          <div className="mt-10 flex justify-center">
            <Link
              href="/news"
              className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-extrabold shadow-[0_12px_36px_rgba(99,102,241,0.35)] hover:shadow-[0_16px_40px_rgba(99,102,241,0.45)] transition-all"
            >
              {t("landing.allNews")}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
