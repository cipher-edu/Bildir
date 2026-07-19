"use client";

import { useState } from "react";
import { MessageCircleWarning, Loader2, Shield } from "lucide-react";
import SiteHeader, { SiteFooter } from "@/components/layout/SiteHeader";
import PublicMobileTabBar from "@/components/layout/PublicMobileTabBar";
import { complianceApi } from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";

export default function WhistlePage() {
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await complianceApi.whistleCreate({
        message: message.trim(),
        context: context.trim() || undefined,
      });
      const body = res.data as { data?: { tracking_code?: string } };
      setCode(body?.data?.tracking_code || null);
      setMessage("");
      setContext("");
    } catch {
      setErr(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col pb-28 md:pb-0">
      <SiteHeader />
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 text-[11px] font-bold text-amber-100 mb-4">
          <Shield className="w-3.5 h-3.5" />
          {t("whistle.title")}
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">
          {t("whistle.title")}
        </h1>
        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
          {t("whistle.subtitle")}
        </p>

        {code ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 space-y-3">
            <p className="text-emerald-100 font-semibold">{t("whistle.success")}</p>
            <p className="text-xs text-slate-400">{t("whistle.code")}</p>
            <p className="text-2xl font-black text-white tracking-widest font-mono">
              {code}
            </p>
            <button
              type="button"
              onClick={() => setCode(null)}
              className="text-sm text-indigo-300 hover:underline"
            >
              {t("whistle.send")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {err && (
              <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-xl px-3 py-2">
                {err}
              </div>
            )}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase">
                {t("whistle.message")} *
              </label>
              <textarea
                required
                minLength={10}
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1.5 w-full px-3 py-3 rounded-xl border border-white/10 bg-white/[0.04] text-sm text-white focus:outline-none focus:border-indigo-400/40 resize-y"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase">
                {t("whistle.context")}
              </label>
              <input
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-sm text-white"
                placeholder={t("whistle.contextPh")}
              />
            </div>
            <button
              type="submit"
              disabled={loading || message.trim().length < 10}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-bold disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageCircleWarning className="w-4 h-4" />
              )}
              {t("whistle.send")}
            </button>
          </form>
        )}
      </main>
      <SiteFooter />
      <PublicMobileTabBar />
    </div>
  );
}
