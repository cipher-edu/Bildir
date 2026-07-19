"use client";

import Link from "next/link";
import {
  Shield, ArrowLeft, Lock, EyeOff, FileText, Scale,
} from "lucide-react";
import {
  PRIVACY_SECTIONS,
  SURVEY_PRIVACY_VERSION,
  SURVEY_PRIVACY_EFFECTIVE,
} from "@/lib/privacyPolicy";
import { useI18n } from "@/i18n/I18nProvider";

export default function PrivacyPolicyPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen text-white relative">
      <div className="fixed inset-0 -z-20 bg-[#020617]" />
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-15%] right-[-8%] w-[26rem] h-[26rem] rounded-full bg-indigo-600/20 blur-[110px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[22rem] h-[22rem] rounded-full bg-cyan-600/10 blur-[100px]" />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#020617]/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/home"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("privacy.back")}
          </Link>
          <span className="text-xs text-slate-500 tabular-nums">
            v{SURVEY_PRIVACY_VERSION}
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 pb-20 space-y-8 animate-fade-up">
        <div className="space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-600 flex items-center justify-center shadow-[0_8px_32px_rgba(99,102,241,0.35)] ring-1 ring-white/15">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-indigo-300/80 font-semibold mb-1.5">
              {t("brand")} · NDU
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t("privacy.title")}
            </h1>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              {t("landing.featPrivacyDesc")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-300">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              Versiya {SURVEY_PRIVACY_VERSION}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-300">
              <Scale className="w-3.5 h-3.5 text-cyan-400" />
              Kuchga kirgan: {SURVEY_PRIVACY_EFFECTIVE}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-200">
              <Lock className="w-3.5 h-3.5" />
              Shifrlangan saqlash
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-[11px] text-indigo-200">
              <EyeOff className="w-3.5 h-3.5" />
              Anonim / ochiq rejimlar
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {PRIVACY_SECTIONS.map((sec) => (
            <section
              key={sec.id}
              id={sec.id}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 sm:p-6 space-y-3 scroll-mt-20"
            >
              <h2 className="text-base font-bold text-white tracking-tight">
                {sec.title}
              </h2>
              <div className="space-y-2.5">
                {sec.body.map((p, i) => (
                  <p key={i} className="text-sm text-slate-400 leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="text-center text-xs text-slate-600 pt-4">
          Savollar bo‘yicha — universitet IT / axborot xavfsizligi bo‘limiga murojaat qiling.
        </p>
      </main>
    </div>
  );
}
