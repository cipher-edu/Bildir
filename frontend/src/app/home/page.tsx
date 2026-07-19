"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen, Building2, ClipboardList, GraduationCap, Hash,
  Layers, RefreshCw, School, Sparkles, Users2, ChevronRight,
  BadgeCheck, Phone, ArrowUpRight, Zap, Star, Target,
} from "lucide-react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useAuthStore } from "@/stores/authStore";
import { authApi, surveysApi } from "@/lib/api";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/roles";
import { User, UserRole, Survey } from "@/types";
import StudentShell from "@/components/student/StudentShell";
import { useI18n } from "@/i18n/I18nProvider";

function Avatar({ user, size = 96 }: { user: User; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initials =
    [user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join("").toUpperCase() ||
    user.email[0].toUpperCase();
  const color = ROLE_COLORS[user.role as UserRole] ?? "#6366f1";

  if (user.picture && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.picture}
        alt=""
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className="rounded-[1.35rem] object-cover ring-2 ring-white/20 shadow-2xl"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-[1.35rem] flex items-center justify-center font-extrabold text-white select-none ring-2 ring-white/15 shadow-2xl"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `linear-gradient(145deg, ${color}, #312e81)`,
      }}
    >
      {initials}
    </div>
  );
}

function BentoCell({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={`rounded-[1.5rem] border border-white/[0.08] bg-white/[0.035] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] animate-fade-up ${className}`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {children}
    </div>
  );
}

function unwrapSurveys(res: { data?: unknown }): Survey[] {
  const payload = (res as { data?: { data?: unknown } }).data;
  const inner = (payload as { data?: unknown })?.data ?? payload;
  return Array.isArray(inner) ? (inner as Survey[]) : [];
}

export default function HomePage() {
  const { user, isReady } = useRoleGuard(["student", "teacher", "staff"]);
  const updateUser = useAuthStore((s) => s.updateUser);
  const { t, locale } = useI18n();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isReady || !user) return;
    setRefreshing(true);
    authApi
      .me()
      .then((res) => {
        const fresh: User = res.data?.data ?? res.data;
        if (fresh?.id) updateUser(fresh);
      })
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }, [isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: surveys = [] } = useQuery({
    queryKey: ["surveys-available-home"],
    queryFn: async () => unwrapSurveys(await surveysApi.available()),
    enabled: isReady && !!user,
    staleTime: 20_000,
  });

  const pending = useMemo(
    () => surveys.filter((s) => !s.already_submitted),
    [surveys]
  );
  const doneCount = surveys.length - pending.length;

  if (!isReady || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <div className="w-11 h-11 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const role = user.role as UserRole;
  const roleColor = ROLE_COLORS[role] ?? "#6366f1";
  const roleLabel = ROLE_LABELS[role] ?? role;
  const isStudent = role === "student";
  const displayName =
    user.full_name || `${user.first_name} ${user.last_name}`.trim() || user.email;
  const first = user.first_name || displayName.split(" ")[0];
  const greeting = t("home.welcome");

  const dateLocale =
    locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ";
  const today = new Date().toLocaleDateString(dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const completion =
    surveys.length > 0 ? Math.round((doneCount / surveys.length) * 100) : 0;

  return (
    <StudentShell user={user} badge={pending.length}>
      <div className="space-y-4 sm:space-y-5">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.1] p-5 sm:p-7 animate-fade-up">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/40 via-[#12183a]/95 to-fuchsia-700/25" />
          <div className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.12), transparent 40%), radial-gradient(circle at 80% 0%, rgba(34,211,238,0.15), transparent 35%)",
            }}
          />
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-10 bottom-0 w-36 h-36 rounded-full bg-cyan-400/20 blur-3xl" />

          <div className="relative flex flex-col sm:flex-row gap-5 sm:items-center">
            <div className="relative self-start">
              <div className="absolute -inset-1 rounded-[1.5rem] bg-gradient-to-br from-white/40 to-transparent opacity-60 blur-[1px]" />
              <Avatar user={user} size={100} />
              {refreshing && (
                <div className="absolute inset-0 rounded-[1.35rem] bg-black/45 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 animate-spin text-white" />
                </div>
              )}
              <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-emerald-400 border-[3px] border-[#12183a] flex items-center justify-center shadow-lg">
                <BadgeCheck className="w-4 h-4 text-emerald-950" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-medium text-indigo-100 mb-2">
                <Sparkles className="w-3 h-3 text-amber-300" />
                {greeting}
              </div>
              <h1 className="text-[1.65rem] sm:text-3xl font-black tracking-tight text-white leading-tight">
                {t("common.hello")}, {first}!
              </h1>
              <p className="text-sm text-indigo-100/70 mt-1.5 truncate">{displayName}</p>
              <div className="flex flex-wrap gap-2 mt-3.5">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-sm"
                  style={{
                    background: `${roleColor}30`,
                    color: "#e0e7ff",
                    border: `1px solid ${roleColor}55`,
                  }}
                >
                  <GraduationCap className="w-3 h-3" />
                  {roleLabel}
                </span>
                {user.group_name && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/25 text-white/90 border border-white/10">
                    <Users2 className="w-3 h-3" />
                    {user.group_name}
                  </span>
                )}
                {user.study_year != null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/25 text-white/90 border border-white/10">
                    <BookOpen className="w-3 h-3" />
                    {user.study_year}-kurs
                  </span>
                )}
              </div>
            </div>

            {/* Progress ring card */}
            <div className="sm:ml-auto shrink-0 flex items-center gap-3 rounded-2xl bg-black/25 border border-white/10 px-4 py-3 backdrop-blur-md">
              <div className="relative w-14 h-14">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
                  <circle
                    cx="28" cy="28" r="22" fill="none"
                    stroke="url(#grad)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 22}`}
                    strokeDashoffset={`${2 * Math.PI * 22 * (1 - completion / 100)}`}
                    className="transition-all duration-700"
                  />
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white">
                  {completion}%
                </span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-indigo-200/70">Faollik</p>
                <p className="text-sm font-bold text-white">{doneCount}/{surveys.length || 0}</p>
                <p className="text-[10px] text-slate-400">so&apos;rovnoma</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Bento grid ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Primary CTA — surveys */}
          <Link
            href="/surveys"
            className="col-span-2 group relative overflow-hidden rounded-[1.5rem] border border-indigo-400/30 p-5 sm:p-6 bg-gradient-to-br from-indigo-500/30 via-violet-600/20 to-transparent hover:border-indigo-300/50 transition-all hover:shadow-[0_0_40px_rgba(99,102,241,0.25)] animate-fade-up"
            style={{ animationDelay: "80ms", animationFillMode: "both" }}
          >
            <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-indigo-400/20 blur-2xl group-hover:bg-indigo-400/30 transition-colors" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white text-indigo-600 flex items-center justify-center mb-4 shadow-lg group-hover:scale-105 transition-transform">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  {t("nav.surveys")}
                  {pending.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                      {pending.length}
                    </span>
                  )}
                </h2>
                <p className="text-sm text-indigo-100/65 mt-1 max-w-xs">
                  Fikr bildiring — ovozingiz OTM sifatini oshiradi
                </p>
                <span className="inline-flex items-center gap-1 mt-4 text-xs font-bold text-cyan-300">
                  Ochish <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </Link>

          <BentoCell delay={120} className="p-4 flex flex-col justify-between min-h-[132px]">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Kutilmoqda</p>
              <p className="text-2xl font-black text-white mt-0.5">{pending.length}</p>
              <p className="text-[11px] text-slate-500">to&apos;ldirish kerak</p>
            </div>
          </BentoCell>

          <BentoCell delay={160} className="p-4 flex flex-col justify-between min-h-[132px]">
            <div className="w-9 h-9 rounded-xl bg-emerald-400/15 border border-emerald-400/25 flex items-center justify-center">
              <Target className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Bajarilgan</p>
              <p className="text-2xl font-black text-white mt-0.5">{doneCount}</p>
              <p className="text-[11px] text-slate-500">ishtirok</p>
            </div>
          </BentoCell>

          <BentoCell delay={200} className="col-span-2 sm:col-span-1 p-4">
            <div className="flex items-center gap-2 mb-3">
              <School className="w-4 h-4 text-cyan-300" />
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Fakultet</p>
            </div>
            <p className="text-sm font-bold text-white leading-snug line-clamp-3">
              {user.faculty_name || "—"}
            </p>
          </BentoCell>

          <BentoCell delay={240} className="col-span-2 sm:col-span-1 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-violet-300" />
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Yo&apos;nalish</p>
            </div>
            <p className="text-sm font-bold text-white leading-snug line-clamp-3">
              {user.specialty_name || "—"}
            </p>
          </BentoCell>

          <BentoCell delay={280} className="col-span-2 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-amber-300" />
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Bugun</p>
            </div>
            <p className="text-base font-bold text-white capitalize">{today}</p>
            <p className="text-xs text-slate-500 mt-1">
              {user.university_name || "Navoiy davlat universiteti"} · Bildir
            </p>
          </BentoCell>
        </div>

        {/* ── Pending surveys ── */}
        {pending.length > 0 && (
          <section
            className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4 sm:p-5 animate-fade-up"
            style={{ animationDelay: "320ms", animationFillMode: "both" }}
          >
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                Hozir to&apos;ldiring
              </h2>
              <Link href="/surveys" className="text-xs font-semibold text-indigo-300 hover:text-indigo-200">
                Barchasi →
              </Link>
            </div>
            <div className="space-y-2">
              {pending.slice(0, 3).map((s, i) => (
                <Link
                  key={s.id}
                  href={`/s/${s.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-white/[0.04] to-transparent border border-white/[0.06] hover:border-indigo-400/35 hover:from-indigo-500/10 transition-all group"
                >
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/10 border border-amber-400/25 flex items-center justify-center shrink-0 text-sm font-black text-amber-200">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate group-hover:text-indigo-100">
                      {s.title}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {s.question_count ?? "?"} savol
                      {s.privacy_mode === "anonymous" ? " · Anonim" : ""}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-500 text-white shrink-0">
                    Boshlash
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Profile details ── */}
        <section
          className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4 sm:p-5 animate-fade-up"
          style={{ animationDelay: "360ms", animationFillMode: "both" }}
        >
          <h2 className="text-sm font-extrabold text-white mb-4">
            {isStudent ? "Mening ta'limim" : "Ish ma'lumotlari"}
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {(isStudent
              ? [
                  { icon: Building2, label: "Universitet", value: user.university_name },
                  { icon: School, label: "Fakultet", value: user.faculty_name },
                  { icon: Layers, label: "Yo'nalish", value: user.specialty_name },
                  { icon: Users2, label: "Guruh", value: user.group_name },
                  {
                    icon: BookOpen,
                    label: "Kurs",
                    value: user.study_year != null ? `${user.study_year}-kurs` : null,
                  },
                  { icon: Hash, label: "Talaba ID", value: user.student_id },
                  { icon: BadgeCheck, label: "HEMIS ID", value: user.hemis_id },
                  { icon: Phone, label: "Telefon", value: user.phone },
                ]
              : [
                  { icon: Building2, label: "Universitet", value: user.university_name },
                  { icon: School, label: "Fakultet", value: user.faculty_name },
                  { icon: Layers, label: "Lavozim", value: user.position },
                  { icon: BookOpen, label: "Ilmiy daraja", value: user.academic_degree },
                  { icon: BadgeCheck, label: "Ilmiy unvon", value: user.academic_rank },
                  { icon: Hash, label: "HEMIS ID", value: user.hemis_id },
                  { icon: Phone, label: "Telefon", value: user.phone },
                ]
            )
              .filter((x) => x.value)
              .map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/12 border border-indigo-400/20 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-indigo-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 font-medium">{item.label}</p>
                    <p className="text-sm text-slate-100 font-semibold truncate">
                      {String(item.value)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </section>

        <p className="text-center text-[11px] text-slate-600 pt-1 pb-2">
          Bildir · NDU · Komplayens
        </p>
      </div>
    </StudentShell>
  );
}
