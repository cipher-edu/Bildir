"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap, LogIn, Shield, Loader2, AlertCircle,
  Users, Mail, Eye, EyeOff, ArrowRight, Sparkles,
  BookOpen, Award, Globe, Lock, ChevronLeft,
  CheckCircle, Zap, User, KeyRound,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/lib/api";
import { getRoleHome } from "@/lib/roles";
import { UserRole } from "@/types";
import StarField from "@/components/ui/StarField";

type LoginMode = "oauth" | "sso_student" | "sso_teacher" | "email";

const TABS: {
  key:     LoginMode;
  label:   string;
  icon:    React.ElementType;
  accent:  string;
  glow:    string;
}[] = [
  { key: "oauth",       label: "HEMIS OAuth",  icon: Shield,        accent: "#22d3ee", glow: "rgba(34,211,238,0.35)"  },
  { key: "sso_student", label: "Talaba",        icon: GraduationCap, accent: "#6366f1", glow: "rgba(99,102,241,0.35)"  },
  { key: "sso_teacher", label: "O'qituvchi",    icon: Users,         accent: "#a78bfa", glow: "rgba(167,139,250,0.35)" },
  { key: "email",       label: "Email",         icon: Mail,          accent: "#fbbf24", glow: "rgba(251,191,36,0.3)"   },
];

const LEFT_CARDS: {
  icon: React.ElementType; label: string; sub: string;
  pos: { top?: string; left?: string; right?: string; bottom?: string };
  color: string; dur: string;
}[] = [
  { icon: BookOpen, label: "500K+ Imtihon",      sub: "Muvaffaqiyatli o'tkazildi",  pos: { top: "12%",  left: "5%"  }, color: "#6366f1", dur: "7s"  },
  { icon: Shield,   label: "Blockchain Kafolat", sub: "Har bir natija muhrlangan",  pos: { top: "32%",  right: "4%" }, color: "#22d3ee", dur: "9s"  },
  { icon: Award,    label: "AI Baholash",         sub: "GPT-4 real vaqt tahlil",    pos: { top: "58%",  left: "4%"  }, color: "#a78bfa", dur: "8s"  },
  { icon: Globe,    label: "HEMIS SSO",           sub: "Davlat tizimi integratsiya", pos: { bottom: "10%", right: "6%" }, color: "#34d399", dur: "11s" },
  { icon: Zap,      label: "50K Concurrent",     sub: "Bir vaqtda foydalanuvchi",   pos: { bottom: "28%", left: "28%" }, color: "#fbbf24", dur: "6s"  },
];

/* ─── Orbital visualization for left panel ──────────────────────── */
function OrbitalViz() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 320, height: 320 }}>
      {/* Glow core */}
      <div className="absolute rounded-full pointer-events-none"
        style={{ width: 220, height: 220, background: "radial-gradient(circle, rgba(99,102,241,0.4) 0%, rgba(99,102,241,0.12) 50%, transparent 70%)", filter: "blur(32px)", animation: "glowPulse 4s ease-in-out infinite" }} />

      {/* Orbit rings */}
      <div className="orbit-ring absolute" style={{ width: 270, height: 270, animation: "rotateRing 30s linear infinite" }} />
      <div className="orbit-ring absolute" style={{ width: 220, height: 220, animation: "rotateRing 20s linear infinite reverse", borderColor: "rgba(34,211,238,0.1)" }} />
      <div className="orbit-ring absolute" style={{ width: 170, height: 170, borderColor: "rgba(167,139,250,0.12)", animation: "rotateRing 14s linear infinite" }} />

      {/* Orbiting dots */}
      <div className="absolute w-3 h-3 rounded-full"
        style={{ background: "radial-gradient(circle, #22d3ee, #6366f1)", boxShadow: "0 0 10px #22d3ee", animation: "orbitSpin 30s linear infinite", top: "calc(50% - 135px)", left: "50%", transformOrigin: "0 135px" }} />
      <div className="absolute w-2 h-2 rounded-full"
        style={{ background: "#a78bfa", boxShadow: "0 0 8px #a78bfa", animation: "orbitSpin 20s linear infinite reverse", top: "calc(50% - 110px)", left: "50%", transformOrigin: "0 110px" }} />
      <div className="absolute w-2 h-2 rounded-full"
        style={{ background: "#fbbf24", boxShadow: "0 0 6px #fbbf24", animation: "orbitSpin 14s linear infinite", top: "calc(50% - 85px)", left: "50%", transformOrigin: "0 85px" }} />

      {/* Core sphere */}
      <div className="relative z-10 rounded-full flex items-center justify-center"
        style={{
          width: 110, height: 110,
          background: "radial-gradient(circle at 36% 32%, #818cf8 0%, #4f46e5 40%, #1e1b4b 75%, #090720 100%)",
          boxShadow: "0 0 50px rgba(99,102,241,0.6), 0 0 100px rgba(99,102,241,0.2), inset -8px -10px 30px rgba(0,0,0,0.55)",
        }}>
        <div className="absolute top-3 left-5 rounded-full opacity-25 pointer-events-none"
          style={{ width: 36, height: 18, background: "radial-gradient(ellipse, rgba(255,255,255,0.7), transparent)" }} />
        <GraduationCap className="w-10 h-10 text-white/50" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router  = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuth  = useAuthStore((s) => s.isAuthenticated);

  const [mode, setMode]       = useState<LoginMode>("oauth");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm]       = useState({ login: "", password: "", email: "" });
  const [mounted, setMounted] = useState(false);

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
      setAuth(u, tokens.access, tokens.refresh);
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
      setAuth(u, tokens.access, tokens.refresh);
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
      setAuth(u, tokens.access, tokens.refresh);
      router.push(getRoleHome(u.role as UserRole));
    } catch (err: unknown) {
      const ex = err as { response?: { data?: { detail?: string } } };
      setError(ex.response?.data?.detail || "Email yoki parol xato.");
    } finally { setLoading(false); }
  };

  const activeTab = TABS.find((t) => t.key === mode)!;

  return (
    <div className="min-h-screen bg-cosmos flex overflow-hidden">

      {/* ═══ CHAP PANEL ════════════════════════════════════════════ */}
      <div className="hidden lg:flex flex-col w-[46%] relative overflow-hidden">
        {/* Deep bg */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(160deg, #020816 0%, #060d1f 45%, #0c1235 75%, #04060f 100%)" }} />
        <div className="absolute inset-0 grid-cosmos opacity-35" />

        <StarField count={50} opacity={0.35} meteors={2} />

        {/* Nebulalar */}
        <div className="absolute rounded-full opacity-18 pointer-events-none"
          style={{ width: 550, height: 550, background: "radial-gradient(circle, #6366f1, transparent 70%)", top: -120, left: -160, filter: "blur(80px)", animation: "nebulaFloat 18s ease-in-out infinite" }} />
        <div className="absolute rounded-full opacity-13 pointer-events-none"
          style={{ width: 420, height: 420, background: "radial-gradient(circle, #22d3ee, transparent 70%)", bottom: -60, right: -100, filter: "blur(70px)", animation: "nebulaFloat 22s ease-in-out infinite 5s" }} />
        <div className="absolute rounded-full opacity-10 pointer-events-none"
          style={{ width: 300, height: 300, background: "radial-gradient(circle, #a78bfa, transparent 70%)", top: "42%", right: "12%", filter: "blur(60px)", animation: "nebulaFloat 14s ease-in-out infinite 3s" }} />

        {/* Floating info cards */}
        {mounted && LEFT_CARDS.map(({ icon: Icon, label, sub, pos, color, dur }) => (
          <div key={label} className="floating-badge absolute"
            style={{
              ...pos,
              background: `${color}0a`,
              border: `1px solid ${color}22`,
              color: "#e2e8f0",
              animation: `floatY ${dur} ease-in-out infinite`,
            }}>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}16`, border: `1px solid ${color}28` }}>
              <Icon className="w-3.5 h-3.5" style={{ color }} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white leading-tight">{label}</p>
              <p className="text-[10px] text-slate-500 leading-tight">{sub}</p>
            </div>
          </div>
        ))}

        {/* Panel content */}
        <div className="relative z-10 flex flex-col justify-between h-full px-12 py-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5, #7c3aed)", boxShadow: "0 0 24px rgba(99,102,241,0.45)" }}>
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -inset-1 rounded-2xl opacity-20 blur-sm"
                style={{ background: "linear-gradient(135deg, #818cf8, #7c3aed)" }} />
            </div>
            <div>
              <span className="font-bold text-xl text-white">OsiyoNigohi</span>
            </div>
          </div>

          {/* Orbital visualization */}
          <div className="flex flex-col items-center gap-6">
            <OrbitalViz />
            <div className="text-center">
              <div className="badge-aurora mb-5 mx-auto w-fit">
                <Sparkles className="w-3.5 h-3.5" />
                Kosmik sifatdagi ta&apos;lim
              </div>
              <h2 className="font-black leading-none mb-4 tracking-tight" style={{ fontSize: "2.8rem" }}>
                <span className="text-white">Ta&apos;limni</span>
                <br />
                <span className="aurora-text" style={{ paddingBottom: 4 }}>yangi orbitaga</span>
                <br />
                <span className="text-white">olib chiqing</span>
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
                Blockchain kafolati, sun&apos;iy intellekt va real-vaqt nazorat bilan
                imtihon jarayonini butunlay o&apos;zgartiring.
              </p>
            </div>

            <div className="space-y-2.5 w-full max-w-xs">
              {[
                { text: "HEMIS tizimi bilan to'liq integratsiya",   color: "#22d3ee" },
                { text: "AES-256 shifrlangan savol havzasi",         color: "#a78bfa" },
                { text: "Hyperledger Fabric blockchain audit trail",  color: "#34d399" },
                { text: "GPT-4 tomonidan avtomatik baholash",         color: "#fbbf24" },
              ].map(({ text, color }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `${color}16`, border: `1px solid ${color}28` }}>
                    <CheckCircle className="w-3 h-3" style={{ color }} />
                  </div>
                  <span className="text-slate-300 text-xs">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-slate-700 text-xs">© 2026 OsiyoNigohi · NSPI</p>
        </div>
      </div>

      {/* ═══ O'NG PANEL ════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-10 relative">
        {/* Bg */}
        <div className="absolute inset-0 bg-cosmos" />
        <div className="absolute inset-0 grid-cosmos-dense opacity-25" />
        <div className="absolute pointer-events-none rounded-full opacity-[0.07]"
          style={{ width: 600, height: 600, background: "radial-gradient(circle, #6366f1, transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%, -50%)", filter: "blur(90px)" }} />

        {/* Mobile back */}
        <button onClick={() => router.push("/")}
          className="lg:hidden absolute top-6 left-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors z-10">
          <ChevronLeft className="w-4 h-4" /> Bosh sahifa
        </button>

        <div className="relative z-10 w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1, #7c3aed)", boxShadow: "0 0 20px rgba(99,102,241,0.4)" }}>
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">OsiyoNigohi</span>
          </div>

          {/* Title */}
          <div className="mb-7">
            <h1 className="text-3xl font-extrabold text-white mb-1.5 tracking-tight">
              Xush kelibsiz
            </h1>
            <p className="text-slate-500 text-sm">Tizimga kirish usulini tanlang</p>
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
                  <input type="email" placeholder="admin@osiyonigohi.uz"
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
