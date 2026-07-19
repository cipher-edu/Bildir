"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar, Loader2, Newspaper, User, Share2, ChevronRight,
  ArrowLeft, Clock, Sparkles, BookOpen, ChevronLeft
} from "lucide-react";
import { newsApi } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import type { NewsArticle } from "@/types";
import SiteHeader, { SiteFooter } from "@/components/layout/SiteHeader";
import PublicMobileTabBar from "@/components/layout/PublicMobileTabBar";
import StarField from "@/components/ui/StarField";
import { useI18n } from "@/i18n/I18nProvider";

function unwrap<T>(res: { data?: unknown }): T {
  const body = res.data as { data?: T } | T;
  if (body && typeof body === "object" && "data" in (body as object)) {
    return (body as { data: T }).data;
  }
  return body as T;
}

/** body ichidagi /media/ va backend URL larni brauzer uchun moslash */
function rewriteBodyMedia(html: string): string {
  if (!html) return "";
  return html
    .replace(/src="https?:\/\/backend(?::\d+)?(\/media\/[^"]+)"/gi, 'src="$1"')
    .replace(/src="https?:\/\/127\.0\.0\.1:\d+(\/media\/[^"]+)"/gi, 'src="$1"')
    .replace(/src="https?:\/\/localhost:\d+(\/media\/[^"]+)"/gi, 'src="$1"');
}

export default function NewsDetailPage() {
  const params = useParams();
  const slug = String(params?.slug || "");
  const [toastMsg, setToastMsg] = useState("");
  const { t, locale } = useI18n();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-news", slug, locale],
    queryFn: async () => unwrap<NewsArticle>(await newsApi.detail(slug)),
    enabled: !!slug,
  });

  const img = mediaUrl(data?.cover_url || data?.cover);
  const bodyHtml = rewriteBodyMedia(data?.body || "");

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: data?.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast(t("news.linkCopied"));
      }
    } catch {
      await navigator.clipboard.writeText(url);
      showToast(t("news.linkCopied"));
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col relative pb-28 md:pb-0">
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-8%] w-[45vw] h-[45vw] max-w-[480px] rounded-full bg-indigo-600/12 blur-[110px]" />
        <div className="absolute bottom-[-10%] left-[-8%] w-[40vw] h-[40vw] max-w-[400px] rounded-full bg-violet-600/10 blur-[100px]" />
        <StarField count={36} opacity={0.18} meteors={1} />
      </div>

      <SiteHeader />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 sm:py-12">
        {isLoading && <NewsDetailSkeleton />}

        {isError && (
          <div className="max-w-md mx-auto py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mx-auto mb-5">
              <Newspaper className="w-8 h-8 text-slate-600" />
            </div>
            <h2 className="text-xl font-bold text-white">{t("news.notFound")}</h2>
            <p className="text-slate-400 text-xs mt-2">
              {t("news.notFoundHint")}
            </p>
            <Link
              href="/news"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl bg-indigo-600/20 border border-indigo-400/20 text-indigo-200 text-sm font-semibold hover:bg-indigo-600/30 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> {t("news.backList")}
            </Link>
          </div>
        )}

        {data && (
          <div className="space-y-8 animate-[fadeIn_0.5s_ease-out_forwards]">
            {/* Navigation back and breadcrumb */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link
                href="/news"
                className="group inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                <div className="w-8 h-8 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-center group-hover:scale-105 group-hover:border-indigo-400/30 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </div>
                Ortga qaytish
              </Link>
              
              <nav className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Link href="/" className="hover:text-white transition-colors">Bosh</Link>
                <ChevronRight className="w-3 h-3" />
                <Link href="/news" className="hover:text-white transition-colors">Yangiliklar</Link>
                <ChevronRight className="w-3 h-3" />
                <span className="text-indigo-400 font-semibold truncate max-w-[12rem]">{data.title}</span>
              </nav>
            </div>

            {/* Banner Cover image */}
            <div className="relative rounded-[2rem] border border-white/[0.08] overflow-hidden bg-slate-950/20 h-64 sm:h-96 md:h-[400px]">
              {img ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={data.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent" />
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-950/40 via-[#0a1020] to-violet-950/30 flex items-center justify-center">
                  <Newspaper className="w-20 h-20 text-slate-800" />
                </div>
              )}
              
              {/* Floating Category tag inside Banner */}
              <div className="absolute bottom-6 left-6 sm:left-10">
                <span className="px-3.5 py-1.5 rounded-xl text-[10px] font-bold border border-indigo-400/35 bg-indigo-500/90 text-white shadow-lg">
                  {data.category_label || data.category}
                </span>
              </div>
            </div>

            {/* Main content grid: Body + sticky sidebar */}
            <div className="grid lg:grid-cols-[1fr_280px] gap-8 items-start">
              {/* Left Column: Article content */}
              <article className="rounded-[2rem] border border-white/[0.08] bg-slate-950/20 backdrop-blur-md p-6 sm:p-10 relative overflow-hidden shadow-xl">
                {/* Visual bottom glow */}
                <div className="absolute bottom-[-100px] left-[10%] w-72 h-72 rounded-full bg-indigo-600/5 blur-3xl pointer-events-none" />
                
                <h1 className="text-2xl sm:text-3xl lg:text-[2.2rem] font-black text-white tracking-tight leading-tight mb-6">
                  {data.title}
                </h1>

                {data.summary && (
                  <div className="relative rounded-2xl bg-indigo-500/5 border-l-4 border-indigo-500 p-5 mb-8">
                    <p className="text-[15px] text-indigo-200/90 leading-relaxed font-semibold italic">
                      {data.summary}
                    </p>
                  </div>
                )}

                <div
                  className="news-prose"
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />

                <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-wrap gap-3">
                  <Link
                    href="/news"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/5 active:scale-95 transition-all"
                  >
                    Barcha yangiliklar
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600/20 border border-indigo-400/25 text-xs font-bold text-indigo-100 hover:bg-indigo-600/30 active:scale-95 transition-all"
                  >
                    Bosh sahifaga qaytish
                  </Link>
                </div>
              </article>

              {/* Right Column: Sticky Sidebar metadata */}
              <aside className="lg:sticky lg:top-24 space-y-5">
                <div className="rounded-[1.75rem] border border-white/[0.08] bg-slate-950/20 backdrop-blur-md p-5 space-y-4 shadow-md">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ma&apos;lumotlar</h4>
                  
                  <div className="space-y-3.5">
                    {data.author_name && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-400">
                          <User className="w-4 h-4 text-indigo-400/70" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-slate-500 leading-none">Muallif</p>
                          <p className="text-xs font-bold text-white truncate mt-1">{data.author_name}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-400">
                        <Calendar className="w-4 h-4 text-indigo-400/70" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-500 leading-none">Sana</p>
                        <p className="text-xs font-bold text-white truncate mt-1">
                          {data.published_at
                            ? new Date(data.published_at).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", year: "numeric" })
                            : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-400">
                        <Clock className="w-4 h-4 text-indigo-400/70" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-500 leading-none">O&apos;qish vaqti</p>
                        <p className="text-xs font-bold text-white truncate mt-1">~2 daqiqa</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Share Card */}
                <div className="rounded-[1.75rem] border border-white/[0.08] bg-slate-950/20 backdrop-blur-md p-5 text-center shadow-md">
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    Ushbu maqolani ijtimoiy tarmoqlarda ulashing:
                  </p>
                  <button
                    type="button"
                    onClick={share}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/10 active:scale-98 transition-all"
                  >
                    <Share2 className="w-4 h-4" /> Ulashish
                  </button>
                </div>
              </aside>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />

      {/* Floating Dynamic Local Toast */}
      {toastMsg && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 px-4 py-3 rounded-xl border border-indigo-500/30 bg-slate-950/80 backdrop-blur-xl text-indigo-200 shadow-xl shadow-indigo-500/10 text-xs font-bold animate-[fadeIn_0.2s_ease-out_forwards] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          {toastMsg}
        </div>
      )}

      {/* CodePen pastki menu — Yangiliklar active */}
      <PublicMobileTabBar activeId="news" />
    </div>
  );
}

function NewsDetailSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Navigation back skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-5 w-24 bg-slate-900 rounded" />
        <div className="h-4 w-40 bg-slate-900 rounded" />
      </div>

      {/* Cover skeleton */}
      <div className="rounded-[2rem] border border-white/5 bg-slate-950/10 h-64 sm:h-96 md:h-[400px]" />

      {/* Grid skeleton */}
      <div className="grid lg:grid-cols-[1fr_280px] gap-8">
        <div className="rounded-[2rem] border border-white/5 bg-slate-950/10 p-6 sm:p-10 space-y-6">
          <div className="h-10 w-5/6 bg-slate-800 rounded" />
          <div className="h-4 w-1/2 bg-slate-900 rounded" />
          <div className="space-y-3 mt-10">
            <div className="h-4 w-full bg-slate-900 rounded" />
            <div className="h-4 w-full bg-slate-900 rounded" />
            <div className="h-4 w-5/6 bg-slate-900 rounded" />
            <div className="h-4 w-full bg-slate-900 rounded" />
            <div className="h-4 w-2/3 bg-slate-900 rounded" />
          </div>
        </div>
        
        <div className="space-y-5">
          <div className="rounded-[1.75rem] border border-white/5 bg-slate-950/10 p-5 h-44" />
          <div className="rounded-[1.75rem] border border-white/5 bg-slate-950/10 p-5 h-28" />
        </div>
      </div>
    </div>
  );
}
