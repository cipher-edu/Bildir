"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import SiteHeader, { SiteFooter } from "@/components/layout/SiteHeader";
import PublicMobileTabBar from "@/components/layout/PublicMobileTabBar";
import { complianceApi } from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";

type Risk = {
  id: string;
  title: string;
  description: string;
  level: string;
  level_label?: string;
  status: string;
  status_label?: string;
  owner_name?: string;
  due_date?: string | null;
};

function unwrapList<T>(res: { data?: unknown }): T[] {
  const body = res.data as { data?: T[] } | T[];
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object" && Array.isArray((body as { data?: T[] }).data)) {
    return (body as { data: T[] }).data;
  }
  return [];
}

export default function RiskPublicPage() {
  const { t, locale } = useI18n();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["compliance-risks-public", locale],
    queryFn: async () => unwrapList<Risk>(await complianceApi.risks()),
    retry: false,
  });

  const items = data ?? [];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col pb-28 md:pb-0">
      <SiteHeader />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 text-[11px] font-bold text-rose-100 mb-4">
          <AlertTriangle className="w-3.5 h-3.5" />
          {t("risk.title")}
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">
          {t("risk.title")}
        </h1>
        <p className="text-sm text-slate-400 mb-8">{t("risk.subtitle")}</p>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-amber-200/90">{t("common.error")}</p>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <p className="text-sm text-slate-500">{t("common.empty")}</p>
        )}

        <div className="space-y-3">
          {items.map((r) => (
            <article
              key={r.id}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
            >
              <div className="flex flex-wrap gap-2 mb-2 text-[10px] font-bold">
                <span className="px-2 py-0.5 rounded-full border border-rose-400/30 text-rose-200 bg-rose-500/10">
                  {t(`risk.${r.level}` as "risk.high") || r.level_label || r.level}
                </span>
                <span className="px-2 py-0.5 rounded-full border border-white/10 text-slate-300">
                  {r.status_label || r.status}
                </span>
              </div>
              <h2 className="text-base font-bold text-white">{r.title}</h2>
              {r.description && (
                <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                  {r.description}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-500">
                {r.owner_name && (
                  <span>
                    {t("risk.owner")}: {r.owner_name}
                  </span>
                )}
                {r.due_date && (
                  <span>
                    {t("risk.due")}: {r.due_date}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
      <PublicMobileTabBar />
    </div>
  );
}
