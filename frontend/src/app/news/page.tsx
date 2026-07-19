"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Newspaper, Calendar, Pin, Star,
  ChevronRight, ChevronLeft, Sparkles, BookOpen, ArrowRight,
} from "lucide-react";
import { newsApi } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import type { NewsArticle } from "@/types";
import SiteHeader, { SiteFooter } from "@/components/layout/SiteHeader";
import PublicMobileTabBar from "@/components/layout/PublicMobileTabBar";
import StarField from "@/components/ui/StarField";
import { useI18n } from "@/i18n/I18nProvider";

const PAGE_SIZE = 8;

type PaginatedNews = {
  results: NewsArticle[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
};

function unwrapPage(res: { data?: unknown }): PaginatedNews {
  const body = res.data as { data?: PaginatedNews | NewsArticle[] } | PaginatedNews;
  const d =
    body && typeof body === "object" && "data" in body
      ? (body as { data: PaginatedNews | NewsArticle[] }).data
      : (body as PaginatedNews);

  if (d && typeof d === "object" && Array.isArray((d as PaginatedNews).results)) {
    return d as PaginatedNews;
  }
  if (Array.isArray(d)) {
    return {
      results: d,
      count: d.length,
      page: 1,
      page_size: PAGE_SIZE,
      total_pages: 1,
    };
  }
  return { results: [], count: 0, page: 1, page_size: PAGE_SIZE, total_pages: 1 };
}

export default function NewsListPage() {
  const { t, locale } = useI18n();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["public-news", page, category, locale],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        page_size: String(PAGE_SIZE),
        lang: locale,
      };
      if (category) params.category = category;
      return unwrapPage(await newsApi.list(params));
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const items = data?.results ?? [];
  const totalPages = data?.total_pages ?? 1;
  const count = data?.count ?? 0;
  const featured = items.find((n) => n.is_featured) || items[0];
  const rest = featured
    ? items.filter((n) => n.id !== featured.id)
    : items;

  const pageNumbers = useMemo(() => {
    const max = totalPages;
    const cur = page;
    const win = 5;
    let start = Math.max(1, cur - Math.floor(win / 2));
    let end = Math.min(max, start + win - 1);
    start = Math.max(1, end - win + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  const goPage = (p: number) => {
    setPage(Math.max(1, Math.min(totalPages, p)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col relative pb-28 md:pb-0">
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[520px] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[45vw] h-[45vw] max-w-[480px] rounded-full bg-violet-600/10 blur-[100px]" />
        <StarField count={40} opacity={0.2} meteors={2} />
      </div>

      <SiteHeader />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-10 sm:py-14">
        {/* Hero band */}
        <div className="relative rounded-[2rem] border border-white/[0.08] overflow-hidden mb-10 group bg-slate-950/20 backdrop-blur-md">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-violet-950/15 to-[#020617]" />
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
          <div className="relative px-6 sm:px-10 py-10 sm:py-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 text-[11px] font-bold text-indigo-200 mb-4 shadow-[0_0_15px_rgba(99,102,241,0.15)] animate-[pulse_3s_infinite]">
              <Sparkles className="w-3.5 h-3.5" />
              {t("news.officialBadge")}
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-black tracking-tight leading-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
              {t("news.title")}
            </h1>
            <p className="text-slate-400 mt-4 text-sm sm:text-base max-w-2xl leading-relaxed">
              {t("news.subtitle")}
            </p>
            {count > 0 && (
              <div className="flex items-center gap-4 mt-6 text-xs text-slate-500">
                <span className="px-3 py-1.5 rounded-xl border border-white/5 bg-white/[0.02]">
                  {t("common.total")}: <span className="text-white font-bold tabular-nums">{count}</span>
                </span>
                <span className="px-3 py-1.5 rounded-xl border border-white/5 bg-white/[0.02]">
                  {t("common.page")}: <span className="text-white font-bold tabular-nums">{page} / {totalPages}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { value: "", label: t("news.filterAll") },
            { value: "general", label: t("news.categories.general") },
            { value: "announcement", label: t("news.categories.announcement") },
            { value: "event", label: t("news.categories.event") },
            { value: "regulation", label: t("news.categories.regulation") },
            { value: "anti_corruption", label: t("news.categories.anti_corruption") },
          ].map((c) => (
            <button
              key={c.value || "all"}
              type="button"
              onClick={() => {
                setCategory(c.value);
                setPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-[11px] font-bold border transition-all ${
                category === c.value
                  ? "bg-indigo-600/90 text-white border-indigo-400/40 shadow-lg shadow-indigo-500/15"
                  : "bg-white/[0.03] text-slate-400 border-white/10 hover:text-white hover:border-white/20"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {isLoading && !data && <NewsSkeleton />}

        {isError && (
          <div className="rounded-[1.5rem] border border-amber-400/25 bg-gradient-to-br from-amber-500/10 to-orange-950/10 p-10 text-center">
            <Newspaper className="w-8 h-8 text-amber-300/80 mx-auto mb-3" />
            <p className="text-amber-100/90 text-sm font-medium">
              {t("news.loadError")}
            </p>
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="rounded-[2rem] border border-dashed border-white/12 bg-white/[0.02] p-16 text-center text-slate-500 text-sm">
            {t("news.empty")}
          </div>
        )}

        {/* Featured + grid */}
        {items.length > 0 && (
          <div className={`space-y-8 ${isFetching && !isLoading ? "opacity-60" : ""} transition-opacity duration-300`}>
            {page === 1 && featured && (
              <Link
                href={`/news/${featured.slug}`}
                className="group grid lg:grid-cols-[1.1fr_0.9fr] gap-0 rounded-[2rem] border border-white/[0.08] overflow-hidden bg-slate-950/30 hover:bg-slate-950/50 hover:border-indigo-500/35 transition-all duration-500 shadow-[0_12px_40px_rgba(0,0,0,0.4)] hover:shadow-indigo-500/5 hover:-translate-y-1 block relative"
              >
                {/* Hover spotlight glow */}
                <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl opacity-0 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none" />
                
                <div className="aspect-[16/10] lg:aspect-auto lg:min-h-[380px] bg-slate-900 relative overflow-hidden">
                  {mediaUrl(featured.cover_url || featured.cover) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl(featured.cover_url || featured.cover)!}
                      alt={featured.title}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-950/40 via-[#0a1020] to-slate-950">
                      <Newspaper className="w-16 h-16 text-slate-700 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex gap-2">
                    {featured.is_pinned && (
                      <span className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-amber-500/90 text-white inline-flex items-center gap-1 shadow-md">
                        <Pin className="w-3 h-3" /> {t("news.pinned")}
                      </span>
                    )}
                    <span className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-indigo-600/90 text-white inline-flex items-center gap-1 shadow-md">
                      <Star className="w-3 h-3" /> {t("news.featured")}
                    </span>
                  </div>
                </div>
                
                <div className="p-6 sm:p-10 flex flex-col justify-between h-full min-h-[320px]">
                  <div className="space-y-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold border border-indigo-400/25 bg-indigo-500/10 text-indigo-300">
                      {featured.category_label || featured.category}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white leading-snug group-hover:text-indigo-200 transition-colors">
                      {featured.title}
                    </h2>
                    <p className="text-sm text-slate-400 leading-relaxed line-clamp-4">
                      {featured.summary || "Platforma faoliyatiga oid muhim yangilik va ma'lumotlar bilan batafsil o'qib tanishib chiqing..."}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/[0.06] text-xs text-slate-500">
                    <div className="flex items-center gap-4">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400/80" />
                        {featured.published_at
                          ? new Date(featured.published_at).toLocaleDateString(
                              locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ",
                              { day: "numeric", month: "short", year: "numeric" }
                            )
                          : "—"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400/80" />
                        {t("news.readMin")}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-indigo-400 font-bold group-hover:gap-2 transition-all">
                      {t("news.readMore")} <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* Grid layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {(page === 1 ? rest : items).map((n) => {
                const img = mediaUrl(n.cover_url || n.cover);
                return (
                  <Link
                    key={n.id}
                    href={`/news/${n.slug}`}
                    className="group flex flex-col rounded-2xl border border-white/[0.08] bg-slate-950/30 hover:bg-slate-950/50 overflow-hidden hover:border-indigo-500/35 transition-all duration-400 hover:-translate-y-1.5 shadow-md hover:shadow-indigo-500/5 block relative"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-indigo-500/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    
                    <div className="aspect-[4/3] bg-slate-900 relative overflow-hidden shrink-0">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={n.title}
                          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950">
                          <Newspaper className="w-10 h-10 text-slate-700 group-hover:scale-110 transition-transform duration-500" />
                        </div>
                      )}
                      <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                        {n.is_pinned && (
                          <span className="p-1.5 rounded-lg bg-amber-500/90 text-white shadow-sm inline-flex items-center">
                            <Pin className="w-3 h-3" />
                          </span>
                        )}
                        {n.is_featured && (
                          <span className="p-1.5 rounded-lg bg-indigo-600/90 text-white shadow-sm inline-flex items-center">
                            <Star className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col flex-1 p-5 relative">
                      <span className="text-[10px] text-indigo-300/90 font-bold mb-2 block">
                        {n.category_label || n.category}
                      </span>
                      <h3 className="text-[15px] font-extrabold text-white group-hover:text-indigo-200 transition-colors line-clamp-2 min-h-[2.75rem] leading-snug">
                        {n.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2 flex-1 leading-relaxed">
                        {n.summary || "Batafsil o'qish va ma'lumotlar bilan tanishish..."}
                      </p>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.06] text-[10px] text-slate-500 shrink-0">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400/80" />
                          {n.published_at
                            ? new Date(n.published_at).toLocaleDateString(
                                locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ"
                              )
                            : "—"}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-indigo-400 font-bold group-hover:translate-x-0.5 transition-transform">
                          {t("common.read")} <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <nav className="mt-14 flex flex-wrap items-center justify-center gap-2.5" aria-label="Sahifalar">
            <button
              type="button"
              disabled={page <= 1 || isFetching}
              onClick={() => goPage(page - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/5 active:scale-95 disabled:opacity-40 transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> {t("common.prev")}
            </button>
            {pageNumbers.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => goPage(p)}
                className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                  p === page
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg border border-indigo-400/30 shadow-indigo-500/20"
                    : "border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= totalPages || isFetching}
              onClick={() => goPage(page + 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/5 active:scale-95 disabled:opacity-40 transition-all"
            >
              {t("common.next")} <ChevronRight className="w-4 h-4" />
            </button>
          </nav>
        )}
      </main>

      <SiteFooter />

      {/* CodePen pastki menu — Yangiliklar active */}
      <PublicMobileTabBar activeId="news" />
    </div>
  );
}

function NewsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Featured article skeleton */}
      <div className="grid lg:grid-cols-[1.1fr_0.9fr] rounded-[2rem] border border-white/5 bg-slate-950/10 h-[380px] overflow-hidden">
        <div className="w-full h-full bg-slate-900/50" />
        <div className="p-10 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="h-4 w-1/4 bg-slate-800 rounded" />
            <div className="h-8 w-5/6 bg-slate-800 rounded" />
            <div className="h-8 w-3/4 bg-slate-800 rounded" />
            <div className="h-4 w-full bg-slate-900 rounded" />
            <div className="h-4 w-5/6 bg-slate-900 rounded" />
          </div>
          <div className="h-5 w-1/3 bg-slate-800 rounded" />
        </div>
      </div>
      
      {/* Regular cards skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col rounded-2xl border border-white/5 bg-slate-950/10 h-[360px] overflow-hidden">
            <div className="aspect-[4/3] bg-slate-900/50" />
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="h-3.5 w-1/3 bg-slate-800 rounded" />
                <div className="h-4 w-5/6 bg-slate-800 rounded" />
                <div className="h-4 w-4/6 bg-slate-800 rounded" />
              </div>
              <div className="h-3 w-1/2 bg-slate-900 rounded mt-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
