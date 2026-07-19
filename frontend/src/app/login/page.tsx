"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap, Shield, Loader2, AlertCircle,
  Users, Mail, Eye, EyeOff, ArrowRight, Sparkles,
  Lock, ChevronLeft, User, KeyRound,
  ClipboardList, MessageSquareText,
  BarChart3, Building2, Scale, QrCode, Clock,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/lib/api";
import { getRoleHome } from "@/lib/roles";
import { UserRole } from "@/types";
import StarField from "@/components/ui/StarField";
import { useI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";

type LoginMode = "oauth" | "sso_student" | "sso_teacher" | "email";

/** Bildir / NDU Komplayens — chap panel floating kartalar */
const LEFT_CARDS: {
  icon: React.ElementType; label: string; sub: string;
  pos: { top?: string; left?: string; right?: string; bottom?: string };
  color: string; dur: string;
}[] = [
  { icon: ClipboardList, label: "Anonim so'rovnoma", sub: "Shaxs bog'lanmaydi",       pos: { top: "14%",  left: "5%"  }, color: "#6366f1", dur: "7s"  },
  { icon: MessageSquareText, label: "Murojaat markazi", sub: "72 soat SLA",            pos: { top: "30%",  right: "4%" }, color: "#f59e0b", dur: "9s"  },
  { icon: EyeOff,  label: "Maxfiylik muhri",    sub: "AES-GCM + HMAC",              pos: { top: "54%",  left: "4%"  }, color: "#22d3ee", dur: "8s"  },
  { icon: Shield,   label: "HEMIS SSO",          sub: "Davlat tizimi orqali kirish", pos: { bottom: "12%", right: "5%" }, color: "#34d399", dur: "11s" },
  { icon: BarChart3, label: "Jonli analitika",   sub: "Kesimlar va dashboard",       pos: { bottom: "30%", left: "22%" }, color: "#a78bfa", dur: "6.5s" },
];

const FEATURE_POINTS = [
  { text: "HEMIS SSO — talaba va xodim uchun xavfsiz kirish", color: "#22d3ee", icon: Shield },
  { text: "Anonim so'rovnomalar — javoblar shifrlangan va muhrlangan", color: "#6366f1", icon: ClipboardList },
  { text: "Murojaat + fayl — 72 soat ichida javob (SLA)", color: "#f59e0b", icon: Clock },
  { text: "Ochiqlik va komplayens — NDU Halollik madaniyati", color: "#34d399", icon: Scale },
] as const;

/* ─── Chap panel vizual — Bildir brand core ──────────────────── */
function BrandViz() {
  return (
    <div className="relative flex items-center justify-center w-[280px] h-[280px] sm:w-[300px] sm:h-[300px]">
      <div
        className="absolute rounded-full pointer-events-none blur-3xl animate-pulse-slow"
        style={{
          width: 200,
          height: 200,
          background:
            "radial-gradient(circle, rgba(99,102,241,0.45) 0%, rgba(34,211,238,0.12) 45%, transparent 70%)",
        }}
      />

      {/* Rings */}
      <div
        className="absolute rounded-full border border-indigo-400/20"
        style={{ width: 250, height: 250, animation: "rotateRing 28s linear infinite" }}
      />
      <div
        className="absolute rounded-full border border-cyan-400/15"
        style={{ width: 200, height: 200, animation: "rotateRing 18s linear infinite reverse" }}
      />
      <div
        className="absolute rounded-full border border-violet-400/15 border-dashed"
        style={{ width: 155, height: 155, animation: "rotateRing 12s linear infinite" }}
      />

      {/* Orbiting feature pips */}
      <div
        className="absolute w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"
        style={{
          top: "calc(50% - 125px)",
          left: "50%",
          transformOrigin: "0 125px",
          animation: "orbitSpin 28s linear infinite",
        }}
      />
      <div
        className="absolute w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_#a78bfa]"
        style={{
          top: "calc(50% - 100px)",
          left: "50%",
          transformOrigin: "0 100px",
          animation: "orbitSpin 18s linear infinite reverse",
        }}
      />
      <div
        className="absolute w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]"
        style={{
          top: "calc(50% - 77px)",
          left: "50%",
          transformOrigin: "0 77px",
          animation: "orbitSpin 12s linear infinite",
        }}
      />

      {/* Core */}
      <div
        className="relative z-10 w-[104px] h-[104px] rounded-[1.75rem] flex items-center justify-center"
        style={{
          background:
            "linear-gradient(145deg, #818cf8 0%, #4f46e5 42%, #312e81 78%, #0f0a2e 100%)",
          boxShadow:
            "0 0 48px rgba(99,102,241,0.55), 0 0 90px rgba(34,211,238,0.12), inset 0 1px 0 rgba(255,255,255,0.25)",
        }}
      >
        <div
          className="absolute top-3 left-4 w-9 h-4 rounded-full opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.8), transparent)" }}
        />
        <GraduationCap className="w-11 h-11 text-white drop-shadow-lg" />
        <span className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-emerald-500/90 border-2 border-[#0a1020] flex items-center justify-center shadow-lg">
          <Shield className="w-3.5 h-3.5 text-white" />
        </span>
      </div>
    </div>
  );
}

/** Chap panel — to‘liq info bo‘limi */
function LoginInfoPanel({ mounted }: { mounted: boolean }) {
  return (
    <div className="hidden lg:flex flex-col w-[46%] relative overflow-hidden">
      {/* Fon */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(165deg, #020617 0%, #060d1f 40%, #0c1235 72%, #04060f 100%)",
        }}
      />
      <div className="absolute inset-0 landing-mesh opacity-40" />
      <StarField count={56} opacity={0.32} meteors={3} />

      <div
        className="absolute rounded-full pointer-events-none opacity-25 blur-[90px]"
        style={{
          width: 520,
          height: 520,
          background: "radial-gradient(circle, #6366f1, transparent 70%)",
          top: -140,
          left: -160,
          animation: "nebulaFloat 18s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none opacity-20 blur-[80px]"
        style={{
          width: 400,
          height: 400,
          background: "radial-gradient(circle, #22d3ee, transparent 70%)",
          bottom: -80,
          right: -100,
          animation: "nebulaFloat 22s ease-in-out infinite 4s",
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none opacity-15 blur-[70px]"
        style={{
          width: 280,
          height: 280,
          background: "radial-gradient(circle, #a78bfa, transparent 70%)",
          top: "48%",
          right: "8%",
          animation: "nebulaFloat 14s ease-in-out infinite 2s",
        }}
      />

      {/* Floating badges */}
      {mounted &&
        LEFT_CARDS.map(({ icon: Icon, label, sub, pos, color, dur }) => (
          <div
            key={label}
            className="absolute z-[5] flex items-center gap-2.5 px-3 py-2 rounded-2xl backdrop-blur-md"
            style={{
              ...pos,
              background: `${color}0d`,
              border: `1px solid ${color}28`,
              boxShadow: `0 8px 28px rgba(0,0,0,0.25), 0 0 20px ${color}12`,
              animation: `floatY ${dur} ease-in-out infinite`,
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: `${color}18`,
                border: `1px solid ${color}30`,
              }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white leading-tight">{label}</p>
              <p className="text-[10px] text-slate-400 leading-tight">{sub}</p>
            </div>
          </div>
        ))}

      {/* Asosiy kontent */}
      <div className="relative z-10 flex flex-col justify-between h-full px-10 xl:px-12 py-9">
        {/* Logo + org */}
        <div>
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="relative">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #4f46e5, #7c3aed)",
                  boxShadow: "0 0 24px rgba(99,102,241,0.45)",
                }}
              >
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <p className="font-extrabold text-lg text-white tracking-tight leading-none">
                Bildir
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                <span className="live-dot !w-1.5 !h-1.5" />
                NDU · Komplayens
              </p>
            </div>
          </Link>
        </div>

        {/* Markaz */}
        <div className="flex flex-col items-center gap-5 -mt-2">
          <BrandViz />

          <div className="text-center max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full border border-indigo-400/30 bg-indigo-500/10 text-[11px] font-bold text-indigo-100">
              <Scale className="w-3.5 h-3.5 text-indigo-300" />
              Halollik · Ochiqlik · Shaffoflik
            </div>

            <p className="text-[11px] sm:text-xs font-semibold text-sky-200/90 tracking-wide mb-2">
              Navoiy davlat universiteti
            </p>
            <h2 className="font-black tracking-tight leading-[1.12] mb-3">
              <span className="block text-white text-[1.85rem] xl:text-[2.15rem]">
                Komplayens nazorat
              </span>
              <span className="block landing-text-live text-[1.65rem] xl:text-[1.95rem] mt-0.5">
                platformasiga kiring
              </span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
              So&apos;rovnomalar, murojaatlar va ochiqlik — «Komplayens nazorat»
              tizimini boshqarish bo&apos;limining raqamli platformasi.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-2.5 w-full max-w-sm mt-1">
            {FEATURE_POINTS.map(({ text, color, icon: Icon }) => (
              <li
                key={text}
                className="flex items-start gap-3 px-3 py-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.025] backdrop-blur-sm"
              >
                <span
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    background: `${color}14`,
                    border: `1px solid ${color}28`,
                  }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </span>
                <span className="text-[12px] text-slate-300 leading-snug pt-1.5">
                  {text}
                </span>
              </li>
            ))}
          </ul>

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-sm mt-1">
            {[
              { v: "100%", l: "Anonim", icon: EyeOff },
              { v: "72s", l: "SLA", icon: Clock },
              { v: "QR", l: "Ulashish", icon: QrCode },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-2 py-2.5 text-center"
              >
                <s.icon className="w-3.5 h-3.5 text-indigo-300 mx-auto mb-1 opacity-80" />
                <p className="text-sm font-black text-white tabular-nums">{s.v}</p>
                <p className="text-[10px] text-slate-500 font-medium">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 pt-4">
          <p className="text-slate-600 text-[11px]">
            © {new Date().getFullYear()} Bildir · NDU
          </p>
          <div className="flex items-center gap-3 text-[11px]">
            <Link href="/" className="text-slate-500 hover:text-indigo-300 transition-colors">
              Bosh sahifa
            </Link>
            <Link href="/privacy" className="text-slate-500 hover:text-indigo-300 transition-colors">
              Maxfiylik
            </Link>
            <span className="inline-flex items-center gap-1 text-slate-600">
              <Building2 className="w-3 h-3" />
              Komplayens
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router  = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuth  = useAuthStore((s) => s.isAuthenticated);
  const { t } = useI18n();

  const [mode, setMode]       = useState<LoginMode>("oauth");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm]       = useState({ login: "", password: "", email: "" });
  const [mounted, setMounted] = useState(false);

  const TABS: {
    key: LoginMode;
    label: string;
    icon: React.ElementType;
    accent: string;
    glow: string;
  }[] = [
    { key: "oauth", label: t("login.hemisOauth"), icon: Shield, accent: "#22d3ee", glow: "rgba(34,211,238,0.35)" },
    { key: "sso_student", label: t("login.student"), icon: GraduationCap, accent: "#6366f1", glow: "rgba(99,102,241,0.35)" },
    { key: "sso_teacher", label: t("login.teacher"), icon: Users, accent: "#a78bfa", glow: "rgba(167,139,250,0.35)" },
    { key: "email", label: t("login.email"), icon: Mail, accent: "#fbbf24", glow: "rgba(251,191,36,0.3)" },
  ];

  useEffect(() => { setMounted(true); }, []);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const user        = useAuthStore((s) => s.user);
  useEffect(() => {
    // Zustand rehydrate bo'lguncha kutamiz — aks holda stale state bilan redirect bo'ladi
    if (!hasHydrated) return;
    if (isAuth && user) router.push(getRoleHome(user.role as UserRole));
  }, [hasHydrated, isAuth, user, router]);

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [key]: e.target.value }));
    setError("");
  };

  const handleOAuth = async (portal: "student" | "employee" = "employee") => {
    setLoading(true); setError("");
    try {
      const res = await authApi.oauthInit(portal);
      window.location.href = res.data.data.redirect_url;
    } catch { setError("HEMIS tizimiga ulanib bo'lmadi."); setLoading(false); }
  };

  // HEMIS rate-limit (429) yoki server xatosi (502) — parolli kirish o'rniga
  // OAuth tabiga o'tkazamiz, chunki OAuth talabaning o'z brauzeri orqali ishlaydi
  const handleHemisFail = (err: unknown, fallbackMsg: string) => {
    const ex = err as { response?: { status?: number; data?: { detail?: string } } };
    const st = ex.response?.status;
    if (st === 429 || st === 502) {
      setMode("oauth");
      setError(
        ex.response?.data?.detail ||
        "HEMIS parol bilan kirishni vaqtincha chekladi. Quyidagi \"HEMIS orqali kirish\" tugmasidan foydalaning."
      );
      return;
    }
    setError(ex.response?.data?.detail || fallbackMsg);
  };

  const handleSSOStudent = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await authApi.loginHemisStudent(form.login, form.password);
      const { user: u, tokens } = res.data.data;
      // Cookie httpOnly da; memory ga qisqa access (localStorage yo'q)
      setAuth(u, tokens?.access || null, null);
      router.push(getRoleHome(u.role as UserRole));
    } catch (err: unknown) {
      handleHemisFail(err, "Login yoki parol xato.");
    } finally { setLoading(false); }
  };

  const handleSSOTeacher = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await authApi.loginHemisTutor(form.login, form.password);
      const { user: u, tokens } = res.data.data;
      setAuth(u, tokens?.access || null, null);
      router.push(getRoleHome(u.role as UserRole));
    } catch (err: unknown) {
      handleHemisFail(err, "Login yoki parol xato.");
    } finally { setLoading(false); }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await authApi.login(form.email, form.password);
      const { user: u, tokens } = res.data.data;
      setAuth(u, tokens?.access || null, null);
      router.push(getRoleHome(u.role as UserRole));
    } catch (err: unknown) {
      const ex = err as { response?: { data?: { detail?: string } } };
      setError(ex.response?.data?.detail || "Email yoki parol xato.");
    } finally { setLoading(false); }
  };

  const activeTab = TABS.find((t) => t.key === mode)!;

  return (
    <div className="min-h-screen bg-cosmos flex overflow-hidden">

      {/* ═══ CHAP PANEL — Bildir / NDU Komplayens ════════════════ */}
      <LoginInfoPanel mounted={mounted} />

      {/* ═══ O'NG PANEL ════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-10 relative">
        {/* Bg */}
        <div className="absolute inset-0 bg-cosmos" />
        <div className="absolute inset-0 grid-cosmos-dense opacity-25" />
        <div className="absolute pointer-events-none rounded-full opacity-[0.07]"
          style={{ width: 600, height: 600, background: "radial-gradient(circle, #6366f1, transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%, -50%)", filter: "blur(90px)" }} />

        {/* Mobile back + language */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-30">
          <Link href="/"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" /> {t("login.backHome")}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="relative z-10 w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10 mt-8">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1, #7c3aed)", boxShadow: "0 0 20px rgba(99,102,241,0.4)" }}>
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-lg text-white leading-none">{t("brand")}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{t("brandSub")}</p>
            </div>
          </div>

          {/* Title */}
          <div className="mb-7">
            <h1 className="text-3xl font-extrabold text-white mb-1.5 tracking-tight">
              {t("login.welcome")}
            </h1>
            <p className="text-slate-500 text-sm">
              {t("login.choose")}
            </p>
          </div>

          {/* ── Tab selector ─────────────────────────────────────── */}
          <div className="relative mb-6 p-1 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.028)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="grid grid-cols-4 gap-1">
              {TABS.map(({ key, label, icon: Icon, accent, glow }) => (
                <button key={key}
                  onClick={() => { setMode(key); setError(""); setForm({ login: "", password: "", email: "" }); }}
                  className="relative flex flex-col items-center gap-1.5 py-2.5 px-1.5 rounded-xl text-[11px] font-semibold transition-all duration-300"
                  style={{
                    background: mode === key ? `linear-gradient(135deg, ${accent}12, ${accent}06)` : "transparent",
                    color: mode === key ? accent : "#475569",
                    border: mode === key ? `1px solid ${accent}38` : "1px solid transparent",
                    boxShadow: mode === key ? `0 0 20px ${glow}` : "none",
                    transform: mode === key ? "translateY(-1px)" : "translateY(0)",
                  }}>
                  <Icon className="w-4 h-4" style={{ color: mode === key ? accent : undefined }} />
                  <span className="leading-tight text-center">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Error ────────────────────────────────────────────── */}
          {error && (
            <div className="flex items-center gap-3 text-sm px-4 py-3 mb-5 alert-premium alert-error rounded-2xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* ── OAUTH ────────────────────────────────────────────── */}
          {mode === "oauth" && (
            <div className="space-y-4 animate-fade-up">
              <div className="rounded-3xl p-6 text-center"
                style={{
                  background: "linear-gradient(135deg, rgba(34,211,238,0.06), rgba(99,102,241,0.04))",
                  border: "1px solid rgba(34,211,238,0.18)",
                }}>
                <div className="relative mx-auto mb-5" style={{ width: 80, height: 80 }}>
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, rgba(34,211,238,0.28), rgba(99,102,241,0.14))",
                      border: "1.5px solid rgba(34,211,238,0.35)",
                      boxShadow: "0 0 30px rgba(34,211,238,0.2)",
                    }}>
                    <Shield className="w-9 h-9 text-cyan-400" />
                  </div>
                  <div className="absolute -inset-2 rounded-3xl opacity-30 animate-glow-pulse pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(34,211,238,0.5), transparent 70%)" }} />
                </div>
                <p className="text-white font-bold text-base mb-1.5">HEMIS tizimi orqali kirish</p>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Talaba yoki hodim akkounti bilan yagona kirish (SSO).<br />
                  Parol kiritmasdan xavfsiz autentifikatsiya.
                </p>
              </div>

              <button onClick={() => handleOAuth("student")} disabled={loading}
                className="w-full py-4 flex items-center justify-center gap-2.5 text-base font-semibold rounded-2xl transition-all duration-300 btn-press"
                style={{
                  background: "linear-gradient(135deg, #0891b2 0%, #6366f1 50%, #4f46e5 100%)",
                  backgroundSize: "200% 200%",
                  animation: loading ? "none" : "gradientShift 4s ease infinite",
                  color: "white",
                  boxShadow: loading ? "none" : "0 0 40px rgba(99,102,241,0.4), 0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
                  opacity: loading ? 0.6 : 1,
                }}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <GraduationCap className="w-5 h-5" />}
                <span>{loading ? "HEMIS ga ulanmoqda..." : "Talaba — HEMIS orqali kirish"}</span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <button onClick={() => handleOAuth("employee")} disabled={loading}
                className="w-full py-3.5 flex items-center justify-center gap-2.5 text-sm font-semibold rounded-2xl transition-all duration-300 btn-press"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(34,211,238,0.25)",
                  color: "#a5f3fc",
                  opacity: loading ? 0.6 : 1,
                }}>
                <Users className="w-4 h-4" />
                <span>Hodim — HEMIS orqali kirish</span>
              </button>

              <p className="text-center text-xs text-slate-600">
                HEMIS da hisob yo&apos;qmi?{" "}
                <span className="link-premium text-indigo-400 hover:text-indigo-300 cursor-pointer">
                  Adminga murojaat qiling
                </span>
              </p>
            </div>
          )}

          {/* ── SSO STUDENT ──────────────────────────────────────── */}
          {mode === "sso_student" && (
            <form onSubmit={handleSSOStudent} className="space-y-4 animate-fade-up">
              <div>
                <label className="label-premium">HEMIS login (talaba ID)</label>
                <div className="input-icon-wrap">
                  <User className="input-icon-prefix w-4 h-4" />
                  <input type="text" placeholder="22060100700600"
                    value={form.login} onChange={f("login")} required
                    className="input-premium" style={{ paddingLeft: 44 }} />
                </div>
              </div>
              <div>
                <label className="label-premium">HEMIS parol</label>
                <div className="input-icon-wrap">
                  <KeyRound className="input-icon-prefix w-4 h-4" />
                  <input type={showPwd ? "text" : "password"} placeholder="••••••••"
                    value={form.password} onChange={f("password")} required
                    className="input-premium" style={{ paddingLeft: 44, paddingRight: 48 }} />
                  <button type="button" onClick={() => setShowPwd((p) => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full btn-primary py-4 flex items-center justify-center gap-2.5 text-sm mt-2 btn-press">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
                {loading ? "Tekshirilmoqda..." : "Talaba sifatida kirish"}
              </button>

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                <span className="text-[11px] text-slate-600">yoki</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
              </div>

              <button type="button" onClick={() => handleOAuth("student")} disabled={loading}
                className="w-full py-3.5 flex items-center justify-center gap-2.5 text-sm font-semibold rounded-2xl transition-all duration-300 btn-press"
                style={{
                  background: "linear-gradient(135deg, rgba(34,211,238,0.1), rgba(99,102,241,0.06))",
                  border: "1px solid rgba(34,211,238,0.3)",
                  color: "#67e8f9",
                  opacity: loading ? 0.6 : 1,
                }}>
                <Shield className="w-4 h-4" />
                <span>HEMIS orqali kirish</span>
              </button>
            </form>
          )}

          {/* ── SSO TEACHER ──────────────────────────────────────── */}
          {mode === "sso_teacher" && (
            <form onSubmit={handleSSOTeacher} className="space-y-4 animate-fade-up">
              <div>
                <label className="label-premium">HEMIS login (familiya.ism)</label>
                <div className="input-icon-wrap">
                  <User className="input-icon-prefix w-4 h-4" />
                  <input type="text" placeholder="familiya.ism"
                    value={form.login} onChange={f("login")} required
                    className="input-premium" style={{ paddingLeft: 44 }} />
                </div>
              </div>
              <div>
                <label className="label-premium">Parol</label>
                <div className="input-icon-wrap">
                  <KeyRound className="input-icon-prefix w-4 h-4" />
                  <input type={showPwd ? "text" : "password"} placeholder="••••••••"
                    value={form.password} onChange={f("password")} required
                    className="input-premium" style={{ paddingLeft: 44, paddingRight: 48 }} />
                  <button type="button" onClick={() => setShowPwd((p) => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-4 flex items-center justify-center gap-2.5 text-sm font-semibold rounded-2xl transition-all duration-300 btn-press"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                  color: "white",
                  boxShadow: loading ? "none" : "0 0 30px rgba(124,58,237,0.4), 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
                  opacity: loading ? 0.6 : 1,
                }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                {loading ? "Tekshirilmoqda..." : "O'qituvchi sifatida kirish"}
              </button>
              <div className="flex items-center gap-2.5 p-3 rounded-2xl"
                style={{ background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.15)" }}>
                <Lock className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <p className="text-[11px] text-slate-500">
                  O&apos;qituvchi akkauntlari HEMIS tizimi tomonidan boshqariladi
                </p>
              </div>
            </form>
          )}

          {/* ── EMAIL ────────────────────────────────────────────── */}
          {mode === "email" && (
            <form onSubmit={handleEmail} className="space-y-4 animate-fade-up">
              <div className="flex items-center gap-2.5 p-3 rounded-2xl"
                style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.18)" }}>
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <p className="text-[11px] text-amber-300/70">Faqat admin va test foydalanuvchilar uchun</p>
              </div>
              <div>
                <label className="label-premium">Email manzil</label>
                <div className="input-icon-wrap">
                  <Mail className="input-icon-prefix w-4 h-4" />
                  <input type="email" placeholder="admin@ndu.uz"
                    value={form.email} onChange={f("email")} required
                    className="input-premium" style={{ paddingLeft: 44 }} />
                </div>
              </div>
              <div>
                <label className="label-premium">Parol</label>
                <div className="input-icon-wrap">
                  <KeyRound className="input-icon-prefix w-4 h-4" />
                  <input type={showPwd ? "text" : "password"} placeholder="••••••••"
                    value={form.password} onChange={f("password")} required
                    className="input-premium" style={{ paddingLeft: 44, paddingRight: 48 }} />
                  <button type="button" onClick={() => setShowPwd((p) => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <a href="/auth/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  Parolni unutdingizmi?
                </a>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-4 flex items-center justify-center gap-2.5 text-sm font-semibold rounded-2xl transition-all duration-300 btn-press"
                style={{
                  background: "linear-gradient(135deg, #1e293b, #0f172a)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: loading ? "none" : "0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
                  opacity: loading ? 0.6 : 1,
                }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {loading ? "Tekshirilmoqda..." : "Email bilan kirish"}
              </button>
            </form>
          )}

          {/* ── Security note ─────────────────────────────────────── */}
          <div className="mt-7 pt-5 border-t border-white/[0.05]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${activeTab.accent}12`, border: `1px solid ${activeTab.accent}28` }}>
                <activeTab.icon className="w-3.5 h-3.5" style={{ color: activeTab.accent }} />
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                {activeTab.key === "oauth"       && "Xavfsiz OAuth 2.0 protokoli orqali autentifikatsiya"}
                {activeTab.key === "sso_student" && "HEMIS talaba tizimiga ulangan xavfsiz kirish"}
                {activeTab.key === "sso_teacher" && "HEMIS o'qituvchi tizimiga ulangan xavfsiz kirish"}
                {activeTab.key === "email"       && "Parol ma'lumotlari shifrlangan kanalda uzatiladi"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
