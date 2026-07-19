"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home, ClipboardList, LogOut, GraduationCap, MessageSquareText, Newspaper,
} from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import StarField from "@/components/ui/StarField";
import AnimatedTabBar from "@/components/ui/AnimatedTabBar";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";
import type { User } from "@/types";

export default function StudentShell({
  user,
  children,
  title,
  badge,
}: {
  user: User;
  children: ReactNode;
  title?: string;
  badge?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

  const NAV = [
    { href: "/home",    label: t("nav.cabinet"),  icon: Home,              short: t("nav.cabinet"), color: "#ff8c00" },
    { href: "/surveys", label: t("nav.surveys"),  icon: ClipboardList,     short: t("nav.surveys"),  color: "#4343f5" },
    { href: "/appeals", label: t("nav.appeals"),  icon: MessageSquareText, short: t("nav.appeals"), color: "#f54888" },
    { href: "/news",    label: t("nav.news"),     icon: Newspaper,         short: t("nav.news"), color: "#a78bfa" },
  ];

  async function handleLogout() {
    try { await authApi.logout(); } catch { /* ignore */ }
    useAuthStore.getState().logout();
    router.replace("/login");
  }

  const first =
    user.first_name ||
    user.full_name?.split(/\s+/).filter(Boolean).pop() ||
    "Talaba";
  const initial = (user.first_name?.[0] || user.email[0] || "T").toUpperCase();

  return (
    <div className="min-h-screen text-slate-100 relative overflow-x-hidden">
      {/* Deep space bg */}
      <div className="fixed inset-0 -z-20 bg-[#020617]" />
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[55vw] h-[55vw] max-w-[520px] max-h-[520px] rounded-full bg-indigo-600/25 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-15%] left-[-15%] w-[50vw] h-[50vw] max-w-[480px] max-h-[480px] rounded-full bg-fuchsia-600/15 blur-[110px] animate-float-slow" />
        <div className="absolute top-[40%] left-[30%] w-[30vw] h-[30vw] max-w-[280px] max-h-[280px] rounded-full bg-cyan-500/10 blur-[90px]" />
        <StarField count={48} opacity={0.22} meteors={2} />
      </div>

      {/* Top glass bar */}
      <header className="sticky top-0 z-40">
        <div className="border-b border-white/[0.06] bg-[#020617]/65 backdrop-blur-2xl">
          <div className="max-w-7xl mx-auto px-4 h-[3.75rem] flex items-center justify-between gap-3">
            <Link href="/home" className="flex items-center gap-2.5 min-w-0 group">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-400 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-[0_0_24px_rgba(99,102,241,0.45)] group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#020617]" />
              </div>
              <div className="min-w-0 hidden xs:block sm:block">
                <p className="text-[13px] font-extrabold tracking-tight bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                  {t("brand")}
                </p>
                <p className="text-[10px] text-slate-500 -mt-0.5 truncate">
                  {title || `Salom, ${first} 👋`}
                </p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
              {NAV.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/home" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? "bg-white text-slate-900 shadow-md"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                    {item.href === "/surveys" && badge != null && badge > 0 && (
                      <span className={`min-w-[1.15rem] h-[1.15rem] px-1 rounded-full text-[10px] flex items-center justify-center font-bold ${
                        active ? "bg-indigo-600 text-white" : "bg-rose-500 text-white"
                      }`}>
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-1.5">
              <LanguageSwitcher />
              <div className="hidden sm:flex items-center gap-2 pl-1 pr-2 py-1 rounded-2xl bg-white/[0.04] border border-white/[0.07]">
                {user.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.picture} alt="" className="w-8 h-8 rounded-xl object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold">
                    {initial}
                  </div>
                )}
                <span className="text-xs font-medium text-slate-300 max-w-[88px] truncate">
                  {first}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                title={t("common.logout")}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-5 pb-28 md:pb-12 relative z-10">
        {children}
      </main>

      {/* Animated Tab Bar — CodePen VwKzaEm uslubi */}
      <div className="md:hidden fixed bottom-3 inset-x-3 z-40 pb-safe-bottom pointer-events-none">
        <div className="pointer-events-auto">
          <AnimatedTabBar
            activeId={
              NAV.find(
                (n) =>
                  pathname === n.href ||
                  (n.href !== "/home" && pathname.startsWith(n.href))
              )?.href ?? "/home"
            }
            items={[
              ...NAV.map((n) => ({
                id: n.href,
                label: n.label,
                icon: n.icon,
                color: n.color,
                href: n.href,
                badge: n.href === "/surveys" ? badge : undefined,
              })),
              {
                id: "logout",
                label: "Chiqish",
                icon: LogOut,
                color: "#65ddb7",
                onClick: () => {
                  void handleLogout();
                },
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
