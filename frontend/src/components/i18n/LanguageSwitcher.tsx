"use client";

import { useState, useRef, useEffect } from "react";
import { Languages, Check } from "lucide-react";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  variant?: "header" | "compact" | "footer";
  className?: string;
};

export default function LanguageSwitcher({
  variant = "header",
  className = "",
}: Props) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (variant === "compact") {
    return (
      <div className={`flex flex-wrap gap-1 ${className}`}>
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${
              locale === l
                ? "bg-indigo-500/25 text-indigo-100 border border-indigo-400/40"
                : "text-slate-500 border border-white/10 hover:text-white"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white text-xs font-semibold transition-colors"
        aria-label={t("common.language")}
        title={t("common.language")}
      >
        <Languages className="w-3.5 h-3.5" />
        <span className="uppercase tabular-nums">{locale}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 min-w-[11rem] rounded-xl border border-white/10 bg-[#0a1020]/98 backdrop-blur-xl shadow-2xl py-1 z-50">
          {LOCALES.map((l: Locale) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setLocale(l);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/5 hover:text-white"
            >
              <span className="w-7 text-[10px] font-bold text-indigo-300/80 uppercase">
                {l}
              </span>
              <span className="flex-1">{LOCALE_LABELS[l]}</span>
              {locale === l && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
