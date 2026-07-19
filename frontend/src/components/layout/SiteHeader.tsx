"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap, Menu, X, ArrowRight, Newspaper, Home,
  Building2, LayoutGrid, Shield, Mail, Phone, MapPin, Globe,
  AlertTriangle, MessageCircleWarning,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { getRoleHome } from "@/lib/roles";
import { UserRole } from "@/types";
import { useI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const appHref =
    isAuthenticated && user
      ? getRoleHome(user.role as UserRole)
      : "/login";

  const NAV = [
    { href: "/", label: t("nav.home"), icon: Home },
    { href: "/news", label: t("nav.news"), icon: Newspaper },
    { href: "/#features", label: t("nav.features"), icon: LayoutGrid },
    { href: "/#officials", label: t("nav.officials"), icon: Building2 },
    { href: "/#anticorruption", label: t("nav.honesty"), icon: Shield },
    { href: "/whistle", label: t("nav.whistle"), icon: MessageCircleWarning },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/#")) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#020617]/90 backdrop-blur-2xl">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-400 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)] group-hover:scale-105 transition-transform">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-extrabold text-white tracking-tight leading-none">
              {t("brand")}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{t("brandSub")}</p>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-0.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          {NAV.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-2 rounded-xl text-[12px] font-medium transition-all ${
                  active
                    ? "bg-white/[0.08] text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link
            href={appHref}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-[0_0_20px_rgba(99,102,241,0.3)]"
          >
            {isAuthenticated ? t("nav.cabinet") : t("nav.login")}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            type="button"
            className="lg:hidden p-2.5 rounded-xl border border-white/10 text-slate-300"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-white/[0.06] bg-[#020617]/98 px-4 py-3 space-y-1">
          {NAV.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm ${
                  isActive(l.href)
                    ? "bg-indigo-500/15 text-indigo-200"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                {l.label}
              </Link>
            );
          })}
          <div className="pt-2 pb-1">
            <LanguageSwitcher variant="compact" />
          </div>
          <Link
            href={appHref}
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 mt-2 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold"
          >
            {isAuthenticated ? t("nav.cabinet") : t("nav.login")}
          </Link>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-white/[0.06] px-4 pt-10 pb-8 mt-auto bg-[#020617]/80">
      <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{t("brand")}</p>
              <p className="text-[10px] text-slate-500">{t("brandSub")}</p>
            </div>
          </div>
          <LanguageSwitcher variant="compact" />
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            {t("platform")}
          </h4>
          <ul className="space-y-2 text-xs text-slate-400">
            <li>
              <Link href="/news" className="hover:text-white">
                {t("nav.news")}
              </Link>
            </li>
            <li>
              <Link href="/#features" className="hover:text-white">
                {t("nav.features")}
              </Link>
            </li>
            <li>
              <Link href="/whistle" className="hover:text-white">
                {t("nav.whistle")}
              </Link>
            </li>
            <li>
              <Link href="/risk" className="hover:text-white">
                {t("nav.risk")}
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            {t("docs")}
          </h4>
          <ul className="space-y-2 text-xs text-slate-400">
            <li>
              <Link href="/privacy" className="hover:text-white">
                {t("nav.privacy")}
              </Link>
            </li>
            <li>
              <Link href="/#anticorruption" className="hover:text-white">
                {t("nav.honesty")}
              </Link>
            </li>
            <li>
              <Link href="/#officials" className="hover:text-white">
                {t("nav.officials")}
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            {t("contact")}
          </h4>
          <ul className="space-y-2.5 text-xs text-slate-400">
            <li className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <a href="tel:+998792233009" className="hover:text-white">
                +998 (79) 223-3009
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <a href="mailto:komplayens@ndu.uz" className="hover:text-white">
                komplayens@ndu.uz
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <a
                href="https://yandex.uz/maps/-/CTVRmOom"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white hover:underline leading-snug"
              >
                {t("address")}
              </a>
            </li>
            <li>
              <a
                href="https://yandex.uz/maps/-/CTVRmOom"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-300/90 hover:text-indigo-200"
              >
                {t("common.openMap")}
                <Globe className="w-3 h-3" />
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-2 mb-4">
        <div className="relative w-full h-64 sm:h-72 md:h-80 lg:h-96 rounded-2xl overflow-hidden border border-white/10 bg-slate-900/50 group shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <iframe
            src="https://yandex.uz/map-widget/v1/-/CTVRmOom"
            width="100%"
            height="100%"
            frameBorder="0"
            allowFullScreen
            loading="lazy"
            className="grayscale-[30%] opacity-90 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
            title={t("address")}
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 border-t border-white/[0.06]">
        <span>
          © {new Date().getFullYear()} NDU. {t("common.rights")}
        </span>
        <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 rounded-full px-3 py-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          <span className="text-[10px] font-bold text-emerald-400/90 tracking-wide uppercase">
            {t("common.systemActive")}
          </span>
        </div>
      </div>
    </footer>
  );
}
