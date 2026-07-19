"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, ArrowRight, Loader2 } from "lucide-react";
import { surveysApi } from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";

type SurveyRow = {
  id: string;
  title: string;
  description?: string;
  privacy_mode?: string;
  end_at?: string | null;
  public_path?: string;
};

function unwrapList<T>(res: { data?: unknown }): T[] {
  const body = res.data as { data?: T[] } | T[] | undefined;
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object" && Array.isArray((body as { data?: T[] }).data)) {
    return (body as { data: T[] }).data;
  }
  return [];
}

/** Landing: faol so'rovnomalar (kirish talab qilinishi mumkin) */
export default function LandingSurveysSection() {
  const { t, locale } = useI18n();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["landing-surveys", locale],
    queryFn: async () => unwrapList<SurveyRow>(await surveysApi.available()),
    staleTime: 60_000,
    retry: false,
  });

  const items = (data ?? []).slice(0, 6);

  return (
    <section id="surveys-live" className="relative py-14 sm:py-20 px-4 scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 text-[11px] font-bold text-cyan-100 mb-3">
              <ClipboardList className="w-3.5 h-3.5" />
              {t("landing.activeSurveys")}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {t("landing.activeSurveys")}
            </h2>
            <p className="text-slate-400 mt-2 text-sm max-w-xl">
              {t("landing.activeSurveysSub")}
            </p>
          </div>
          <Link
            href="/surveys"
            className="inline-flex items-center gap-2 self-start px-4 py-2.5 rounded-xl border border-cyan-400/25 bg-cyan-500/10 text-sm font-bold text-cyan-100 hover:bg-cyan-500/20 transition-all"
          >
            {t("nav.surveys")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        )}

        {(isError || (!isLoading && items.length === 0)) && (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-500 text-sm">
            {t("landing.noSurveys")}
          </div>
        )}

        {items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((s) => (
              <Link
                key={s.id}
                href={s.public_path ? `/s/${s.public_path}` : "/surveys"}
                className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 hover:border-cyan-400/30 hover:bg-white/[0.05] transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-cyan-400/25 text-cyan-200 bg-cyan-500/10">
                    {s.privacy_mode === "anonymous"
                      ? t("surveys.anonymous")
                      : t("surveys.open")}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-cyan-100 transition-colors line-clamp-2">
                  {s.title}
                </h3>
                {s.description && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {s.description}
                  </p>
                )}
                <span className="inline-flex items-center gap-1 mt-4 text-xs font-bold text-cyan-300">
                  {t("common.more")}
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
