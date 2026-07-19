"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  GraduationCap, ArrowRight, Shield, BarChart3, MessageSquareText,
  QrCode, EyeOff, Sparkles, CheckCircle2, Zap, Lock, Users,
  ClipboardList, Clock, FileText, X, ChevronRight, ChevronLeft,
  Building2, Star, Play, Pause, Send, Download, UserCheck, AlertTriangle, Loader2,
  Home, Scale, LogIn, LayoutGrid, Newspaper,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { getRoleHome } from "@/lib/roles";
import { UserRole } from "@/types";
import StarField from "@/components/ui/StarField";
import LandingExtraSections from "@/components/landing/LandingExtraSections";
import {
  LiveAnalyticsBars,
  LiveEqualizer,
  LiveStatusStrip,
  LiveTicker,
  ScrollProgress,
  useLandingLiveData,
} from "@/components/landing/LiveLanding";
import PublicMobileTabBar from "@/components/layout/PublicMobileTabBar";
import { SiteFooter } from "@/components/layout/SiteHeader";
import { useI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import LandingSurveysSection from "@/components/landing/LandingSurveysSection";

/* ── Data builders (i18n) ───────────────────────────────────── */

type TFn = (key: string) => string;

function buildHeroSlides(t: TFn) {
  return [
    {
      badge: t("landing.heroBadge"),
      title: t("landing.heroTitle1"),
      accent: t("landing.heroTitle2"),
      desc: t("landing.heroDesc"),
    },
    {
      badge: t("landing.hero2Badge"),
      title: t("landing.hero2Title"),
      accent: t("landing.hero2Accent"),
      desc: t("landing.hero2Desc"),
    },
    {
      badge: t("landing.hero3Badge"),
      title: t("landing.hero3Title"),
      accent: t("landing.hero3Accent"),
      desc: t("landing.hero3Desc"),
    },
  ];
}

function buildFeatures(t: TFn) {
  return [
    {
      icon: ClipboardList,
      title: t("landing.featSurvey"),
      desc: t("landing.featSurveyDesc"),
      color: "from-indigo-500 to-violet-600",
      glow: "rgba(99,102,241,0.4)",
      size: "lg:col-span-2",
    },
    {
      icon: EyeOff,
      title: t("landing.featPrivacy"),
      desc: t("landing.featPrivacyDesc"),
      color: "from-cyan-500 to-blue-600",
      glow: "rgba(34,211,238,0.35)",
      size: "lg:col-span-1",
    },
    {
      icon: BarChart3,
      title: t("landing.featAnalytics"),
      desc: t("landing.featAnalyticsDesc"),
      color: "from-fuchsia-500 to-pink-600",
      glow: "rgba(232,121,249,0.35)",
      size: "lg:col-span-1",
    },
    {
      icon: MessageSquareText,
      title: t("landing.featAppeal"),
      desc: t("landing.featAppealDesc"),
      color: "from-amber-500 to-orange-600",
      glow: "rgba(251,191,36,0.35)",
      size: "lg:col-span-2",
    },
    {
      icon: QrCode,
      title: t("landing.featShare"),
      desc: t("landing.featShareDesc"),
      color: "from-emerald-500 to-teal-600",
      glow: "rgba(16,185,129,0.35)",
      size: "lg:col-span-1",
    },
    {
      icon: Shield,
      title: t("landing.featHemis"),
      desc: t("landing.featHemisDesc"),
      color: "from-sky-500 to-indigo-600",
      glow: "rgba(14,165,233,0.35)",
      size: "lg:col-span-1",
    },
  ];
}

function buildSteps(t: TFn) {
  return [
    { n: "01", title: t("landing.step1Title"), desc: t("landing.step1Desc"), icon: Lock },
    { n: "02", title: t("landing.step2Title"), desc: t("landing.step2Desc"), icon: ClipboardList },
    { n: "03", title: t("landing.step3Title"), desc: t("landing.step3Desc"), icon: Sparkles },
    { n: "04", title: t("landing.step4Title"), desc: t("landing.step4Desc"), icon: BarChart3 },
  ];
}

const MARQUEE = [
  "HEMIS SSO", "AES-GCM", "HMAC", "KPI", "Excel", "72h SLA", "QR",
  "Dark UI", "Mobile-first", "Dashboard", "Risk", "Whistle",
];

type ShowcaseFlow = {
  id: string;
  title: string;
  tag: string;
  audience: string;
  desc: string;
  points: string[];
  steps: string[];
  metric: { value: string; label: string };
  icon: LucideIcon;
  gradient: string;
  accent: string;
  mock: "survey" | "analytics" | "appeal" | "share" | "leadership" | "sso";
};

function buildShowcase(t: TFn): ShowcaseFlow[] {
  return [
  {
    id: "survey",
    title: t("landing.scSurveyTitle"),
    tag: t("landing.scSurveyTag"),
    audience: t("landing.scSurveyAud"),
    desc: t("landing.scSurveyDesc"),
    points: [
      t("landing.scSurveyP1"),
      t("landing.scSurveyP2"),
      t("landing.scSurveyP3"),
      t("landing.scSurveyP4"),
    ],
    steps: [t("landing.stepEnter"), t("landing.stepPick"), t("landing.stepAnswer"), t("landing.stepDone")],
    metric: { value: "1 tap", label: t("landing.scSurveyM") },
    icon: ClipboardList,
    gradient: "from-indigo-600/45 via-violet-800/25 to-[#0a1020]",
    accent: "text-indigo-300 border-indigo-400/30 bg-indigo-500/15",
    mock: "survey",
  },
  {
    id: "analytics",
    title: t("landing.scAnalTitle"),
    tag: t("landing.scAnalTag"),
    audience: t("landing.scAnalAud"),
    desc: t("landing.scAnalDesc"),
    points: [
      t("landing.scAnalP1"),
      t("landing.scAnalP2"),
      t("landing.scAnalP3"),
      t("landing.scAnalP4"),
    ],
    steps: [t("landing.stepCollect"), t("landing.stepAgg"), t("landing.stepSlice"), t("landing.stepExport")],
    metric: { value: "Live", label: t("landing.scAnalM") },
    icon: BarChart3,
    gradient: "from-cyan-600/40 via-blue-900/30 to-[#0a1020]",
    accent: "text-cyan-300 border-cyan-400/30 bg-cyan-500/15",
    mock: "analytics",
  },
  {
    id: "appeal",
    title: t("landing.scAppealTitle"),
    tag: t("landing.scAppealTag"),
    audience: t("landing.scAppealAud"),
    desc: t("landing.scAppealDesc"),
    points: [
      t("landing.scAppealP1"),
      t("landing.scAppealP2"),
      t("landing.scAppealP3"),
      t("landing.scAppealP4"),
    ],
    steps: [t("landing.stepWrite"), t("landing.stepSubmit"), t("landing.stepReview"), t("landing.stepReply")],
    metric: { value: "72s", label: t("landing.scAppealM") },
    icon: MessageSquareText,
    gradient: "from-amber-600/35 via-rose-900/25 to-[#0a1020]",
    accent: "text-amber-300 border-amber-400/30 bg-amber-500/15",
    mock: "appeal",
  },
  {
    id: "share",
    title: t("landing.scShareTitle"),
    tag: t("landing.scShareTag"),
    audience: t("landing.scShareAud"),
    desc: t("landing.scShareDesc"),
    points: [
      t("landing.scShareP1"),
      t("landing.scShareP2"),
      t("landing.scShareP3"),
      t("landing.scShareP4"),
    ],
    steps: [t("landing.stepCreate"), t("landing.stepQr"), t("landing.stepShare"), t("landing.stepJoin")],
    metric: { value: "QR", label: t("landing.scShareM") },
    icon: QrCode,
    gradient: "from-emerald-600/35 via-teal-900/25 to-[#0a1020]",
    accent: "text-emerald-300 border-emerald-400/30 bg-emerald-500/15",
    mock: "share",
  },
  {
    id: "leadership",
    title: t("landing.scLeadTitle"),
    tag: t("landing.scLeadTag"),
    audience: t("landing.scLeadAud"),
    desc: t("landing.scLeadDesc"),
    points: [
      t("landing.officialsTitle"),
      t("landing.featAppeal"),
      t("landing.featPrivacy"),
      t("landing.featAnalytics"),
    ],
    steps: [t("landing.stepCollect"), t("nav.profile"), t("contact"), t("landing.stepShare")],
    metric: { value: "Open", label: t("landing.scLeadTag") },
    icon: Building2,
    gradient: "from-violet-600/40 via-fuchsia-900/20 to-[#0a1020]",
    accent: "text-violet-300 border-violet-400/30 bg-violet-500/15",
    mock: "leadership",
  },
  {
    id: "sso",
    title: t("landing.scSsoTitle"),
    tag: t("landing.scSsoTag"),
    audience: t("landing.scSsoAud"),
    desc: t("landing.scSsoDesc"),
    points: [
      t("landing.featHemisDesc"),
      t("landing.step1Desc"),
      t("landing.featPrivacyDesc"),
      t("landing.featAnalyticsDesc"),
    ],
    steps: ["SSO", t("login.loginPlaceholder"), "Token", t("nav.cabinet")],
    metric: { value: "API", label: t("landing.featHemis") },
    icon: Lock,
    gradient: "from-indigo-600/35 via-cyan-900/20 to-[#0a1020]",
    accent: "text-indigo-300 border-indigo-400/30 bg-indigo-500/15",
    mock: "sso",
  },
  ];
}

function buildPerks(t: TFn) {
  return [
    t("landing.featPrivacy"),
    t("landing.featAnalytics"),
    t("landing.featAppeal"),
    t("landing.officialsTitle"),
    t("landing.featShare"),
    t("landing.featHemis"),
  ];
}

/* ── Hooks ──────────────────────────────────────────────────── */

function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function useCountUp(target: number, active: boolean, duration = 1400) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const ease = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * ease));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return n;
}

/* ── Small UI ───────────────────────────────────────────────── */

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useInView<HTMLDivElement>(0.12);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(28px)",
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function MagneticButton({
  children,
  className = "",
  href,
}: {
  children: ReactNode;
  className?: string;
  href: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const onMove = (e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    el.style.transform = `translate(${x * 0.12}px, ${y * 0.18}px) scale(1.03)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "";
  };
  return (
    <Link
      ref={ref}
      href={href}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`transition-transform duration-200 will-change-transform ${className}`}
    >
      {children}
    </Link>
  );
}

/* ── 3D Card Tilt Component ─────────────────────────────────── */
function TiltCard({ children, className, glowColor }: { children: React.ReactNode; className?: string; glowColor?: string }) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [active, setActive] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateXValue = ((centerY - y) / centerY) * 8; // max 8deg
    const rotateYValue = ((x - centerX) / centerX) * 8; // max 8deg
    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
  };

  const handleMouseEnter = () => {
    setActive(true);
  };

  const handleMouseLeave = () => {
    setActive(false);
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-200 ease-out will-change-transform ${className}`}
      style={{
        transform: active ? `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)` : "none",
      }}
    >
      {children}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */

export default function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const { t } = useI18n();
  const { officialsCount, isLoading: liveLoading } = useLandingLiveData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const HERO_SLIDES = buildHeroSlides(t);
  const FEATURES = buildFeatures(t);
  const STEPS = buildSteps(t);
  const SHOWCASE = buildShowcase(t);
  const PERKS = buildPerks(t);

  // Hero text slider
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);

  // Showcase slider
  const [showIdx, setShowIdx] = useState(0);
  const [showPaused, setShowPaused] = useState(false);

  // Feature highlight
  const [featHover, setFeatHover] = useState<number | null>(null);

  // Parallax
  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);

  // Spotlight mouse position state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const statsRef = useInView<HTMLDivElement>(0.3);

  // Jonli statistikalar — real rahbariyat + brend metrikalar
  const liveStats = [
    { value: 100, suffix: "%", label: t("landing.statAnon") },
    { value: 72, suffix: "s", label: t("landing.statSla") },
    {
      value: officialsCount > 0 ? officialsCount : 256,
      suffix: officialsCount > 0 ? "" : "-bit",
      label: officialsCount > 0 ? t("landing.statLeaders") : t("landing.statEncrypt"),
    },
    { value: 1, suffix: " tap", label: t("landing.statQr") },
  ];

  const [activeTab, setActiveTab] = useState("#");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll spy to update active mobile tab
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 250;
      const departmentEl = document.getElementById("department");
      const featuresEl = document.getElementById("features");
      const officialsEl = document.getElementById("officials");

      const newsEl = document.getElementById("news");
      if (officialsEl && scrollPos >= officialsEl.offsetTop) {
        setActiveTab("#officials");
      } else if (newsEl && scrollPos >= newsEl.offsetTop) {
        setActiveTab("#news");
      } else if (featuresEl && scrollPos >= featuresEl.offsetTop) {
        setActiveTab("#features");
      } else if (departmentEl && scrollPos >= departmentEl.offsetTop) {
        setActiveTab("#department");
      } else {
        setActiveTab("#");
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll + Escape closes mobile menu
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (heroPaused) return;
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % HERO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, [heroPaused]);

  useEffect(() => {
    if (showPaused) return;
    const t = setInterval(() => setShowIdx((i) => (i + 1) % SHOWCASE.length), 7000);
    return () => clearInterval(t);
  }, [showPaused]);

  // Global mouse move tracker for spotlight glow
  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const onHeroMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setMx(((e.clientX - r.left) / r.width - 0.5) * 18);
    setMy(((e.clientY - r.top) / r.height - 0.5) * 14);
  }, []);

  const appHref =
    isAuthenticated && user
      ? getRoleHome(user.role as UserRole)
      : "/login";

  const hero = HERO_SLIDES[heroIdx];

  return (
    <div className="min-h-screen text-slate-100 relative overflow-x-hidden bg-[#020617] pb-28 md:pb-0">
      <style>{`
        @keyframes pulseDash {
          to {
            stroke-dashoffset: -400;
          }
        }
        .animate-pulse-dash {
          animation: pulseDash 3s linear infinite;
        }
        @keyframes orbit3d {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-orbit-3d {
          animation: orbit3d 20s linear infinite;
        }
      `}</style>
      <ScrollProgress />
      <div className="fixed inset-0 -z-20 bg-[#020617]" />
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        {/* Spotlight cursor glow */}
        <div
          className="absolute w-[520px] h-[520px] rounded-full bg-gradient-to-r from-indigo-500/10 via-cyan-500/8 to-transparent blur-[100px] transition-transform duration-150 ease-out"
          style={{
            transform: `translate(${mousePos.x - 260}px, ${mousePos.y - 260}px)`,
          }}
        />
        <div className="absolute top-[-15%] right-[-10%] w-[60vw] h-[60vw] max-w-[640px] max-h-[640px] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] left-[-15%] w-[55vw] h-[55vw] max-w-[560px] max-h-[560px] rounded-full bg-fuchsia-600/15 blur-[110px] animate-nebula" />
        <div className="absolute top-[40%] left-[40%] w-[30vw] h-[30vw] max-w-[320px] max-h-[320px] rounded-full bg-cyan-500/10 blur-[90px] animate-blob" />
        <div className="absolute inset-0 landing-mesh opacity-60" />
        <div className="absolute inset-x-0 top-0 h-40 landing-scanline opacity-40" />
        <StarField count={72} opacity={0.32} meteors={5} />
      </div>

      {/* Nav */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          scrolled || menuOpen
            ? "border-b border-white/[0.07] bg-[#020617]/90 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
            : "bg-transparent"
        }`}
      >
        {/* Top bar — hamburger/X doim overlay ustida */}
        <div className="relative z-[60] max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
            onClick={() => setMenuOpen(false)}
          >
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-400 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-[0_0_24px_rgba(99,102,241,0.45)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <GraduationCap className="w-5 h-5 text-white" />
              <span className="absolute inset-0 rounded-2xl border border-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="sm:block">
              <p className="text-sm font-extrabold tracking-tight landing-text-live">
                {t("brand")}
              </p>
              <p className="text-[10px] text-slate-500 -mt-0.5 flex items-center gap-1.5">
                <span className="live-dot !w-1.5 !h-1.5" />
                {t("brandSub")}
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            {[
              { href: "#department", label: t("nav.department") },
              { href: "#news", label: t("nav.news") },
              { href: "#features", label: t("nav.features") },
              { href: "#anticorruption", label: t("nav.honesty") },
              { href: "#officials", label: t("nav.officials") },
              { href: "/whistle", label: t("nav.whistle") },
              { href: "/risk", label: t("nav.risk") },
            ].map((l) => (
              l.href.startsWith("/") ? (
                <Link
                  key={l.href}
                  href={l.href}
                  className="px-3.5 py-2 rounded-xl text-[13px] text-slate-400 hover:text-white hover:bg-white/[0.07] transition-all duration-200"
                >
                  {l.label}
                </Link>
              ) : (
                <a
                  key={l.href}
                  href={l.href}
                  className="px-3.5 py-2 rounded-xl text-[13px] text-slate-400 hover:text-white hover:bg-white/[0.07] transition-all duration-200"
                >
                  {l.label}
                </a>
              )
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <MagneticButton
              href={appHref}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-[0_0_24px_rgba(99,102,241,0.35)] landing-shine"
            >
              {isAuthenticated ? t("nav.cabinet") : t("nav.login")}
              <ArrowRight className="w-4 h-4" />
            </MagneticButton>
            {/* Zamonaviy hamburger: 3 chiziq → X */}
            <button
              type="button"
              className={`m-burger md:hidden relative z-[70] ${menuOpen ? "is-open" : ""}`}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Menyuni yopish" : "Menyuni ochish"}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-drawer"
            >
              <span className="m-burger-lines" aria-hidden>
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Fullscreen Mobile Drawer */}
      <div
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-hidden={!menuOpen}
        className={`md:hidden fixed inset-0 z-40 transition-all duration-300 ease-out ${
          menuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          type="button"
          className="absolute inset-0 bg-[#020617]/80 backdrop-blur-xl"
          aria-label="Menyuni yopish"
          onClick={() => setMenuOpen(false)}
        />
        <div
          className={`absolute inset-x-0 top-16 bottom-0 bg-gradient-to-b from-[#0a1020] via-[#020617] to-[#020617] border-t border-white/[0.08] shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
            menuOpen ? "translate-y-0" : "translate-y-4"
          }`}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-indigo-600/15 to-transparent" />
          <div className="relative flex-1 overflow-y-auto px-4 pb-8 pt-4">
            <div className="flex items-center justify-between mb-4 px-1">
              <div>
                <p className="text-[10px] font-bold text-indigo-300/90 uppercase tracking-[0.16em]">
                  Menyu
                </p>
                <p className="text-sm font-bold text-white mt-0.5">Tez navigatsiya</p>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-white/12 bg-white/[0.04] text-[11px] font-bold text-slate-200 active:scale-95 transition-transform"
              >
                <X className="w-3.5 h-3.5" />
                {t("common.close")}
              </button>
            </div>

            {/* Grid quick actions */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {[
                {
                  href: "#department",
                  label: t("nav.department"),
                  icon: Building2,
                  tone: "from-sky-500/25 to-indigo-600/20 text-sky-200 border-sky-400/25",
                },
                {
                  href: "#news",
                  label: t("nav.news"),
                  icon: Newspaper,
                  tone: "from-violet-500/25 to-fuchsia-600/20 text-violet-200 border-violet-400/25",
                },
                {
                  href: "#features",
                  label: t("nav.features"),
                  icon: LayoutGrid,
                  tone: "from-indigo-500/25 to-blue-700/20 text-indigo-200 border-indigo-400/25",
                },
                {
                  href: "#officials",
                  label: t("nav.officials"),
                  icon: Users,
                  tone: "from-amber-500/20 to-orange-700/15 text-amber-100 border-amber-400/25",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex flex-col items-start gap-3 p-3.5 rounded-2xl border bg-gradient-to-br active:scale-[0.98] transition-transform ${item.tone}`}
                  >
                    <span className="w-10 h-10 rounded-xl bg-black/25 border border-white/10 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="text-[13px] font-extrabold text-white">{item.label}</span>
                  </a>
                );
              })}
            </div>

            <nav className="space-y-2">
              {[
                {
                  href: "#department",
                  label: t("nav.department"),
                  icon: Building2,
                  desc: t("landing.deptDesc"),
                  ico: "bg-sky-500/15 text-sky-300 border-sky-400/25",
                },
                {
                  href: "#news",
                  label: t("nav.news"),
                  icon: Newspaper,
                  desc: t("landing.newsSub"),
                  ico: "bg-violet-500/15 text-violet-300 border-violet-400/25",
                },
                {
                  href: "#features",
                  label: t("nav.features"),
                  icon: ClipboardList,
                  desc: t("landing.ctaDesc"),
                  ico: "bg-indigo-500/15 text-indigo-300 border-indigo-400/25",
                },
                {
                  href: "#officials",
                  label: t("nav.officials"),
                  icon: Users,
                  desc: t("landing.officialsSub"),
                  ico: "bg-amber-500/15 text-amber-300 border-amber-400/25",
                },
              ].map((l) => {
                const Icon = l.icon;
                return (
                  <a
                    key={`list-${l.href}`}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="m-nav-tile group"
                  >
                    <div className={`m-nav-ico ${l.ico}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white">{l.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{l.desc}</p>
                    </div>
                    <span className="w-8 h-8 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-slate-500 group-active:text-indigo-300">
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </a>
                );
              })}
            </nav>

            <div className="mt-6 space-y-2.5">
              <Link
                href={appHref}
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2.5 h-12 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white text-sm font-extrabold shadow-[0_12px_32px_rgba(99,102,241,0.4)] active:scale-[0.98] transition-transform"
              >
                {isAuthenticated ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    Kabinetga o&apos;tish
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Tizimga kirish
                  </>
                )}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/privacy"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl border border-white/12 bg-white/[0.03] text-slate-200 text-sm font-semibold active:scale-[0.98] transition-transform"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Maxfiylik siyosati
              </Link>
              <p className="text-center text-[10px] text-slate-500 pt-2">
                Navoiy davlat universiteti · Komplayens
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section
        className="relative pt-28 sm:pt-32 pb-10 sm:pb-16 px-4"
        onMouseMove={onHeroMove}
        onMouseLeave={() => {
          setMx(0);
          setMy(0);
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
            <div
              className="space-y-6"
              onMouseEnter={() => setHeroPaused(true)}
              onMouseLeave={() => setHeroPaused(false)}
            >
              <div className="space-y-3">
                <LiveStatusStrip
                  officialsCount={officialsCount}
                  isLoading={liveLoading}
                />
                <div className="space-y-2">
                  <p className="text-[11px] sm:text-xs font-semibold text-sky-200/90 tracking-wide">
                    Navoiy davlat universiteti
                  </p>
                  <p className="text-[11px] sm:text-[12px] text-slate-400 leading-snug max-w-md">
                    Korrupsiyaga qarshi kurash{" "}
                    <span className="text-indigo-200 font-semibold">
                      «Komplayens nazorat» tizimini boshqarish bo&apos;limi
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div
                  key={`badge-${heroIdx}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 text-[11px] font-semibold text-indigo-200 animate-slide-soft"
                >
                  <span className="live-dot" />
                  Bildir · {hero.badge}
                </div>

                <LiveTicker officialsCount={officialsCount} />
              </div>

              <div key={`title-${heroIdx}`} className="animate-slide-soft min-h-[9.5rem] sm:min-h-[10.5rem]">
                <h1 className="text-4xl sm:text-5xl lg:text-[3.15rem] font-black tracking-tight leading-[1.08]">
                  <span className="text-white">{hero.title}</span>
                  <br />
                  <span className="landing-text-live">
                    {hero.accent}
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-slate-400 max-w-lg leading-relaxed mt-4">
                  {hero.desc}
                </p>
              </div>

              {/* Hero slider controls */}
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {HERO_SLIDES.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setHeroIdx(i)}
                      className="relative h-1.5 rounded-full overflow-hidden transition-all duration-300"
                      style={{ width: i === heroIdx ? 36 : 12 }}
                      aria-label={`Slide ${i + 1}`}
                    >
                      <span className="absolute inset-0 bg-white/15 rounded-full" />
                      {i === heroIdx && (
                        <span
                          key={heroIdx}
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-full"
                          style={{
                            animation: heroPaused ? "none" : "heroProgress 4.5s linear forwards",
                            width: heroPaused ? "40%" : undefined,
                          }}
                        />
                      )}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setHeroPaused((p) => !p)}
                  className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  title={heroPaused ? "Davom" : "Pauza"}
                >
                  {heroPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
                <div className="flex gap-1 ml-auto sm:ml-0">
                  <button
                    type="button"
                    onClick={() => setHeroIdx((i) => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
                    className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 hover:border-indigo-400/30 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroIdx((i) => (i + 1) % HERO_SLIDES.length)}
                    className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 hover:border-indigo-400/30 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <MagneticButton
                  href={appHref}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-[0_12px_40px_rgba(99,102,241,0.4)] landing-shine"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {isAuthenticated ? t("landing.toCabinet") : t("landing.start")}
                </MagneticButton>
                <a
                  href="#features"
                  className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.09] hover:border-indigo-400/30 text-slate-200 text-sm font-semibold transition-all duration-300"
                >
                  {t("nav.features")}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-[12px] text-slate-500">
                {[t("landing.featHemis"), t("landing.statAnon"), "Mobile-first"].map((label) => (
                  <span key={label} className="inline-flex items-center gap-1.5 hover:text-slate-300 transition-colors">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/80" />
                    {label}
                  </span>
                ))}
              </div>

              {/* Dynamic Live Pulse Heartbeat Wave */}
              <div className="pt-4 border-t border-white/[0.06] max-w-md">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-400" />
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tizim himoyalanganlik to&apos;lqini</span>
                  </div>
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">SSL: 256-bit AES</span>
                </div>
                <div className="h-9 relative w-full overflow-hidden bg-slate-950/20 rounded-xl border border-white/[0.04]">
                  <svg className="w-full h-full text-indigo-400/35" viewBox="0 0 400 40" preserveAspectRatio="none">
                    <path
                      d="M 0 20 Q 30 20 60 20 T 120 20 T 180 20 T 210 20 L 215 5 L 220 35 L 225 10 L 230 30 L 235 20 Q 260 20 290 20 T 350 20 T 400 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      className="animate-pulse"
                    />
                    <path
                      d="M 0 20 Q 30 20 60 20 T 120 20 T 180 20 T 210 20 L 215 5 L 220 35 L 225 10 L 230 30 L 235 20 Q 260 20 290 20 T 350 20 T 400 20"
                      fill="none"
                      stroke="url(#pulse-gradient)"
                      strokeWidth="1.5"
                      strokeDasharray="400"
                      strokeDashoffset="400"
                      className="animate-pulse-dash"
                    />
                    <defs>
                      <linearGradient id="pulse-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity="0" />
                        <stop offset="50%" stopColor="#818cf8" stopOpacity="1" />
                        <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>

            {/* Parallax visual stack */}
            <div className="relative h-[400px] sm:h-[440px]">
              <div
                className="absolute inset-0 transition-transform duration-300 ease-out"
                style={{ transform: `translate(${mx * 0.3}px, ${my * 0.3}px)` }}
              >
                <div className="absolute top-8 right-2 sm:right-6 w-[86%] max-w-[330px] rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 shadow-2xl animate-float-card landing-card-hover landing-shine"
                  style={{ ["--r" as string]: "4deg", animationDelay: "0.4s" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-cyan-300" />
                    <span className="text-xs font-semibold text-slate-300">Kesimlar tahlili</span>
                    <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-bold text-emerald-300">
                      <span className="live-dot !w-1.5 !h-1.5" /> Live
                    </span>
                  </div>
                  <LiveAnalyticsBars
                    rows={[
                      { l: "Fakultet", v: 72 },
                      { l: "Kurs", v: 54 },
                      { l: "Jins", v: 61 },
                    ]}
                  />
                </div>
              </div>

              <div
                className="absolute bottom-2 left-0 sm:left-1 w-[90%] max-w-[360px] transition-transform duration-300 ease-out"
                style={{ transform: `translate(${mx * -0.4}px, ${my * -0.35}px)` }}
              >
                <div
                  className="rounded-3xl border border-indigo-400/30 bg-gradient-to-b from-[#141c38]/95 to-[#0a1020]/95 backdrop-blur-xl p-5 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.5)] animate-float-card landing-shine"
                  style={{ ["--r" as string]: "-2deg" }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="relative w-10 h-10 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-md">
                        <ClipboardList className="w-5 h-5" />
                        <span className="absolute -inset-1 rounded-xl border border-indigo-400/40 animate-[ringPulse_2.2s_ease-out_infinite]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">O&apos;quv sifati</p>
                        <p className="text-[10px] text-slate-500">Anonim · 5 savol</p>
                      </div>
                    </div>
                    <span className="text-[9px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/25 font-bold animate-pulse-slow">
                      Faol
                    </span>
                  </div>
                  <div className="rounded-2xl bg-black/30 border border-white/[0.06] p-3.5 mb-3">
                    <div className="h-1 rounded-full bg-white/5 mb-3 overflow-hidden">
                      <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 mb-1.5">Savol 2 / 5</p>
                    <p className="text-sm text-white font-medium leading-snug">
                      Dars materiallaridan qoniqasizmi?
                    </p>
                    <div className="flex gap-1.5 mt-3">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div
                          key={n}
                          className={`flex-1 h-9 rounded-lg border flex items-center justify-center text-xs font-bold transition-all duration-300 hover:scale-110 cursor-default ${
                            n === 4
                              ? "bg-indigo-600 border-indigo-400/50 text-white shadow-[0_0_16px_rgba(99,102,241,0.45)]"
                              : "border-white/10 text-slate-500 bg-white/[0.03] hover:border-indigo-400/30 hover:text-indigo-200"
                          }`}
                        >
                          {n}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-400" /> Muhrlangan
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <QrCode className="w-3 h-3" /> QR ulashish
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats with count-up — jonli ma'lumotlar */}
          <div ref={statsRef.ref} className="mt-14 sm:mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {liveStats.map((s, i) => (
              <StatCard key={s.label} stat={s} active={statsRef.visible} delay={i * 80} />
            ))}
          </div>
        </div>
      </section>


      {/* Department intro */}
      <section id="department" className="relative py-14 sm:py-20 px-4 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="relative rounded-[2rem] border border-white/[0.1] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-600/25 via-[#0a1228] to-emerald-700/20" />
              <div className="relative p-6 sm:p-10">
                <div className="flex flex-col lg:flex-row lg:items-start gap-8">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-300/90 mb-2">
                      Loyiha · Bildir
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
                      Navoiy davlat universiteti
                    </h2>
                    <p className="mt-2 text-base sm:text-lg text-indigo-100/90 font-semibold leading-snug">
                      Korrupsiyaga qarshi kurash
                      <br />
                      <span className="text-cyan-200">
                        «Komplayens nazorat» tizimini boshqarish bo&apos;limi
                      </span>
                    </p>
                    <p className="mt-4 text-sm text-slate-300/90 leading-relaxed max-w-xl">
                      Bildir — bo&apos;limning raqamli platformasi. Ochiqlik, shaffoflik
                      va jamoatchilik nazorati asosida so&apos;rovnomalar, murojaatlar
                      va tahlil orqali korrupsiyaga qarshi kurash madaniyatini
                      rivojlantiradi.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 w-full lg:w-[320px] shrink-0">
                    {[
                      { t: "Ochiqlik", d: "Jarayonlar shaffof" },
                      { t: "Nazorat", d: "Komplayens monitoring" },
                      { t: "Murojaat", d: "72 soat ichida javob" },
                      { t: "Tahlil", d: "Agregat natijalar" },
                    ].map((x) => (
                      <div
                        key={x.t}
                        className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur-sm px-3.5 py-3 landing-card-hover"
                      >
                        <p className="text-sm font-bold text-white">{x.t}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{x.d}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/[0.08]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-300/80 mb-4">
                    Bo&apos;limning asosiy vazifalari
                  </p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      {
                        title: "Komplayens nazorat",
                        desc: "Ichki tartib-qoidalar va korrupsiyaga qarshi talablar bajarilishini monitoring qilish.",
                      },
                      {
                        title: "So'rovnomalar o'tkazish",
                        desc: "Anonim va ochiq so'rovnomalar orqali jamoatchilik fikrini o'rganish va tahlil qilish.",
                      },
                      {
                        title: "Murojaatlarni qabul qilish",
                        desc: "Yozma va fayl biriktirilgan murojaatlarni qabul qilib, belgilangan muddatda javob berish.",
                      },
                      {
                        title: "Oshkoralik va profilaktika",
                        desc: "Halollik madaniyati, ochiqlik va korrupsiyaga qarshi profilaktik ishlarni tashkil etish.",
                      },
                      {
                        title: "Tahlil va hisobot",
                        desc: "Kesimlar, dinamika va agregat ko'rsatkichlar asosida rahbariyatga hisobot tayyorlash.",
                      },
                      {
                        title: "Rahbariyat bilan ishlash",
                        desc: "Rahbariyat ma'lumotlarini yuritish, muloqotni ta'minlash.",
                      },
                    ].map((v) => (
                      <div
                        key={v.title}
                        className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 hover:border-cyan-400/30 hover:bg-cyan-500/[0.06] transition-all landing-card-hover"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          </span>
                          <div>
                            <p className="text-sm font-bold text-white">{v.title}</p>
                            <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">
                              {v.desc}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-white/[0.06]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-300/80 mb-3">
                    Platforma imkoniyatlari (Bildir)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Anonim so'rovnomalar",
                      "HEMIS SSO",
                      "Jonli dashboard",
                      "Kesimlar tahlili",
                      "Excel eksport",
                      "Murojaat + fayl",
                      "72 soat SLA",
                      "QR ulashish",
                      "Rahbariyat",
                      "Maxfiylik muhri",
                    ].map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-indigo-400/25 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/20 transition-colors"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Halollik (prezident) → Yangiliklar → Rahbariyat */}
      <LandingExtraSections />

      {/* Faol so'rovnomalar */}
      <LandingSurveysSection />

      {/* Features */}
      <section id="features" className="relative py-16 sm:py-24 px-4 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-300/80 mb-3">
              {t("landing.features")}
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {t("landing.ctaTitle")}
            </h2>
            <p className="text-slate-400 mt-3 text-sm sm:text-base">
              {t("landing.ctaDesc")}
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 60} className={f.size || "col-span-1"}>
                <TiltCard glowColor={f.glow} className="h-full">
                  <article
                    onMouseEnter={() => setFeatHover(i)}
                    onMouseLeave={() => setFeatHover(null)}
                    className="group relative h-full rounded-[2rem] border border-white/[0.08] bg-slate-950/40 backdrop-blur-md p-6 sm:p-8 overflow-hidden landing-card-hover landing-shine flex flex-col justify-between"
                  >
                  <div
                    className="absolute -top-16 -right-12 w-48 h-48 rounded-full blur-3xl transition-opacity duration-500"
                    style={{
                      background: f.glow,
                      opacity: featHover === i ? 0.6 : 0.12,
                    }}
                  />
                  
                  <div className="flex flex-col md:flex-row md:items-start gap-5 h-full justify-between w-full">
                    <div className="flex-1 space-y-4">
                      <div
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}
                      >
                        <f.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-100 transition-colors">
                          {f.title}
                        </h3>
                        <p className="text-sm text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                          {f.desc}
                        </p>
                      </div>
                    </div>

                    {/* Bento Grid Special Interactive Inner Cards */}
                    {f.title === t("landing.featSurvey") && (
                      <div className="w-full md:w-56 shrink-0 mt-4 md:mt-0 p-4 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-sm space-y-3">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>Savol 4/10</span>
                          <span className="text-emerald-400 font-bold">Faol</span>
                        </div>
                        <p className="text-xs text-white font-medium leading-snug">Ta&apos;lim jarayoni sizni qoniqtiradimi?</p>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 w-2/5 animate-pulse-slow" />
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="h-7 text-[9px] rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 flex items-center justify-center font-bold">Ha</div>
                          <div className="h-7 text-[9px] rounded-lg border border-white/5 bg-white/5 text-slate-400 flex items-center justify-center">Yo&apos;q</div>
                        </div>
                      </div>
                    )}

                    {f.title === "Jonli analitika" && (
                      <div className="w-full md:w-44 shrink-0 mt-4 md:mt-0 p-3 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-sm">
                        <LiveEqualizer bars={5} className="h-24" />
                      </div>
                    )}

                    {f.title === t("landing.featAppeal") && (
                      <div className="w-full md:w-56 shrink-0 mt-4 md:mt-0 p-4 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-sm space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold">SLA 72s</span>
                          <span className="text-[9px] text-slate-500">Murojaat #284</span>
                        </div>
                        <div className="h-2 w-3/4 rounded bg-white/10" />
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          <span>Ko&apos;rib chiqilmoqda</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="relative mt-4 flex items-center gap-1 text-[11px] font-semibold text-indigo-300/0 group-hover:text-indigo-300 transition-all duration-300 translate-y-1 group-hover:translate-y-0 cursor-pointer">
                    Batafsil <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </article>
              </TiltCard>
            </Reveal>
          ))}
          </div>
        </div>
      </section>

      {/* Showcase — platform life flows */}
      <section id="showcase" className="relative py-16 sm:py-24 px-4 scroll-mt-20 overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute top-1/3 -left-16 w-64 h-64 rounded-full bg-cyan-500/10 blur-[90px]" />
          <div className="absolute bottom-1/4 -right-12 w-72 h-72 rounded-full bg-violet-600/10 blur-[100px]" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          <Reveal className="mb-8 sm:mb-10">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 text-[11px] font-bold text-cyan-100 mb-4">
                  <Zap className="w-3.5 h-3.5" />
                  Hayotiy oqimlar · end-to-end
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  Platforma{" "}
                  <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300 bg-clip-text text-transparent">
                    hayotiy oqimlari
                  </span>
                </h2>
                <p className="text-slate-400 mt-3 text-sm sm:text-base leading-relaxed">
                  So&apos;rovnomadan tahlilgacha, murojaatdan rahbariyatgacha —
                  Bildir jarayonlari bir-biriga bog&apos;langan, shaffof va xavfsiz.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start lg:self-auto">
                <div className="hidden sm:flex items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 mr-1">
                  <span className="text-sm font-black text-white tabular-nums">
                    {String(showIdx + 1).padStart(2, "0")}
                  </span>
                  <span className="text-slate-600 text-xs">/</span>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {String(SHOWCASE.length).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1.5">
                  <button
                    type="button"
                    onClick={() => setShowIdx((i) => (i - 1 + SHOWCASE.length) % SHOWCASE.length)}
                    className="p-2.5 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                    aria-label="Oldingi oqim"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPaused((p) => !p)}
                    className="p-2.5 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                    aria-label={showPaused ? "Davom ettirish" : "Pauza"}
                  >
                    {showPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowIdx((i) => (i + 1) % SHOWCASE.length)}
                    className="p-2.5 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                    aria-label="Keyingi oqim"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Flow tabs */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none -mx-1 px-1">
            {SHOWCASE.map((s, i) => {
              const Icon = s.icon;
              const active = i === showIdx;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setShowIdx(i)}
                  className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-[12px] font-semibold transition-all duration-300 ${
                    active
                      ? "border-cyan-400/40 bg-cyan-500/15 text-white shadow-[0_0_24px_rgba(34,211,238,0.15)]"
                      : "border-white/[0.07] bg-white/[0.02] text-slate-400 hover:text-slate-200 hover:border-white/15"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? "text-cyan-300" : "text-slate-500"}`} />
                  <span className="whitespace-nowrap">{s.title}</span>
                </button>
              );
            })}
          </div>

          <div
            className="relative overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] border border-white/[0.1] min-h-[480px] sm:min-h-[440px]"
            onMouseEnter={() => setShowPaused(true)}
            onMouseLeave={() => setShowPaused(false)}
          >
            {SHOWCASE.map((s, i) => {
              const Icon = s.icon;
              const active = i === showIdx;
              return (
                <div
                  key={s.id}
                  className={`absolute inset-0 transition-all duration-700 ease-out ${
                    active
                      ? "opacity-100 translate-x-0 z-10"
                      : i < showIdx
                      ? "opacity-0 -translate-x-10 z-0 pointer-events-none"
                      : "opacity-0 translate-x-10 z-0 pointer-events-none"
                  }`}
                  aria-hidden={!active}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient}`} />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.09),transparent_55%)]" />
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                  <div className="relative grid lg:grid-cols-[1.05fr_0.95fr] gap-6 lg:gap-10 p-5 sm:p-8 lg:p-10 h-full items-center">
                    {/* Copy */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${s.accent}`}>
                          <Icon className="w-3 h-3" />
                          {s.tag}
                        </span>
                        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-white/12 bg-black/25 text-slate-300">
                          {s.audience}
                        </span>
                      </div>

                      <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
                        {s.title}
                      </h3>
                      <p className="mt-3 text-sm sm:text-[15px] text-slate-300/95 leading-relaxed max-w-lg">
                        {s.desc}
                      </p>

                      {/* Mini pipeline */}
                      <div className="mt-5 flex flex-wrap items-center gap-1.5">
                        {s.steps.map((st, si) => (
                          <div key={st} className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 bg-black/30 text-[10px] font-bold text-slate-200">
                              <span className="text-cyan-400/90 tabular-nums">{si + 1}</span>
                              {st}
                            </span>
                            {si < s.steps.length - 1 && (
                              <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>

                      <ul className="mt-5 space-y-2.5">
                        {s.points.map((p) => (
                          <li key={p} className="flex items-start gap-2.5 text-[13px] text-slate-200 leading-snug">
                            <span className="mt-0.5 w-5 h-5 rounded-md bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                            </span>
                            {p}
                          </li>
                        ))}
                      </ul>

                      <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm px-4 py-3">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-cyan-300" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-white leading-none">{s.metric.value}</p>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{s.metric.label}</p>
                        </div>
                      </div>
                    </div>

                    {/* Interactive mock */}
                    <div className="flex justify-center lg:justify-end">
                      <ShowcaseMock flow={s} active={active} />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Bottom progress */}
            <div className="absolute bottom-0 inset-x-0 z-20 p-4 sm:p-5">
              <div className="flex items-center gap-3 max-w-md mx-auto">
                {SHOWCASE.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setShowIdx(i)}
                    className="flex-1 group/dot"
                    aria-label={s.title}
                  >
                    <div className="h-1 rounded-full bg-white/15 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          i === showIdx
                            ? "bg-gradient-to-r from-cyan-400 to-indigo-400 w-full duration-[5000ms] ease-linear"
                            : i < showIdx
                            ? "bg-white/50 w-full duration-300"
                            : "w-0 duration-300"
                        }`}
                        style={
                          i === showIdx && showPaused
                            ? { transitionDuration: "0ms" }
                            : undefined
                        }
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative py-16 sm:py-20 px-4 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="rounded-[2rem] border border-white/[0.08] bg-gradient-to-br from-indigo-600/15 via-[#0a1020]/80 to-violet-600/10 p-6 sm:p-10 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/15 blur-3xl rounded-full animate-pulse-slow" />
              <div className="relative">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-300/80 mb-2">
                  Ishtirok yo&apos;li
                </p>
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
                  4 qadamda ishtirok
                </h2>
                <p className="text-sm text-slate-400 mb-8 max-w-xl">
                  Talaba yoki xodim sifatida so&apos;rovnomaga qanday qo&apos;shilasiz —
                  qisqa va aniq yo&apos;l xaritasi.
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {STEPS.map((s, i) => (
                    <div
                      key={s.n}
                      className="group relative rounded-2xl border border-white/10 bg-black/25 backdrop-blur-sm p-5 hover:border-indigo-400/40 hover:bg-indigo-500/[0.08] transition-all duration-300 landing-card-hover landing-shine"
                      style={{ transitionDelay: `${i * 40}ms` }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-3xl font-black text-indigo-400/35 group-hover:text-indigo-400/60 transition-colors">
                          {s.n}
                        </p>
                        <s.icon className="w-5 h-5 text-indigo-300/50 group-hover:text-indigo-300 group-hover:scale-110 transition-all" />
                      </div>
                      <h3 className="text-base font-bold text-white mb-1.5">{s.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                        {s.desc}
                      </p>
                      {i < STEPS.length - 1 && (
                        <div className="hidden lg:block absolute top-1/2 -right-2 w-4 h-px bg-gradient-to-r from-indigo-400/40 to-transparent" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Why */}
      <section id="why" className="relative py-16 sm:py-24 px-4 scroll-mt-20">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-300/80 mb-3">
              Afzalliklar
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
              Zamonaviy talaba uchun yaratilgan
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6">
              Qorong&apos;u interfeys, tezkor animatsiyalar, mobil navigatsiya va
              shaffof maxfiylik.
            </p>
            <ul className="space-y-3">
              {PERKS.map((p, i) => (
                <li
                  key={p}
                  className="flex items-start gap-3 text-sm text-slate-300 group hover:text-white transition-colors"
                  style={{ transitionDelay: `${i * 30}ms` }}
                >
                  <span className="mt-0.5 w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-emerald-500/25 transition-all">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Zap, title: "Tezkor", sub: "Bir savol — bir ekran", c: "hover:border-amber-400/30" },
              { icon: Shield, title: "Xavfsiz", sub: "AES + HMAC muhr", c: "hover:border-cyan-400/30" },
              { icon: Users, title: "HEMIS", sub: "SSO integratsiya", c: "hover:border-indigo-400/30" },
              { icon: Building2, title: "Rahbariyat", sub: "Ochiq muloqot", c: "hover:border-violet-400/30" },
              { icon: Clock, title: "SLA 72s", sub: "Murojaat javobi", c: "hover:border-rose-400/30" },
              { icon: FileText, title: "Excel", sub: "Himoyalangan eksport", c: "hover:border-emerald-400/30" },
            ].map((c, i) => (
              <Reveal key={c.title} delay={i * 50}>
                <div
                  className={`h-full rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 landing-card-hover landing-shine ${c.c} hover:bg-white/[0.06]`}
                >
                  <c.icon className="w-5 h-5 text-cyan-300 mb-3 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-bold text-white">{c.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{c.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Second marquee reverse */}
      <div className="relative py-4 overflow-hidden opacity-70">
        <div className="flex w-max animate-marquee-reverse">
          {[...MARQUEE].reverse().concat([...MARQUEE].reverse()).map((t, i) => (
            <span
              key={`r-${t}-${i}`}
              className="mx-4 text-sm font-semibold text-slate-600 whitespace-nowrap"
            >
              {t} ·
            </span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <section className="relative py-16 sm:py-24 px-4 overflow-hidden">
        {/* Decorative elements behind the card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[600px] h-[300px] rounded-full bg-indigo-500/10 blur-[120px]" />
        
        <Reveal>
          <div className="max-w-4xl mx-auto relative rounded-[2.5rem] border border-white/10 bg-slate-950/40 backdrop-blur-2xl overflow-hidden group shadow-[0_24px_70px_-15px_rgba(99,102,241,0.25)]">
            {/* Ambient gradients */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.18),transparent_50%),radial-gradient(circle_at_70%_70%,rgba(217,70,239,0.12),transparent_50%)]" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
            
            {/* Glowing orbs */}
            <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-indigo-500/10 blur-[90px] animate-pulse-slow" />
            <div className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full bg-fuchsia-500/10 blur-[90px] animate-nebula" />

            <div className="relative px-6 sm:px-16 py-12 sm:py-20 text-center">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 text-[11px] font-bold text-indigo-200 mb-6 shadow-[0_0_15px_rgba(99,102,241,0.15)] animate-[pulse_3s_infinite]">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin-slow" />
                {t("landing.ctaTitle")}
              </div>
              
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4 leading-tight">
                {t("landing.ctaTitle")}
              </h2>
              
              <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto mb-10 leading-relaxed">
                {t("landing.ctaDesc")}
              </p>
              
              <div className="flex flex-wrap justify-center items-center gap-4">
                <MagneticButton
                  href={appHref}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-extrabold shadow-[0_0_24px_rgba(99,102,241,0.35)] hover:shadow-indigo-500/40 hover:scale-[1.03] transition-all"
                >
                  {isAuthenticated ? t("landing.toCabinet") : t("nav.login")}
                  <ArrowRight className="w-4 h-4" />
                </MagneticButton>
                
                <Link
                  href="/privacy"
                  className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl border border-white/10 bg-white/[0.02] text-slate-300 text-sm font-semibold hover:bg-white/5 hover:text-white hover:border-white/20 hover:scale-[1.02] transition-all"
                >
                  {t("nav.privacy")}
                </Link>
              </div>

              {/* Security Credibility Badges */}
              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mt-12 pt-8 border-t border-white/[0.06] text-slate-400">
                {[
                  { icon: Shield, label: t("landing.statAnon"), desc: t("landing.featPrivacyDesc") },
                  { icon: Lock, label: t("landing.statEncrypt"), desc: t("landing.featPrivacy") },
                  { icon: Clock, label: t("landing.statSla"), desc: t("landing.featAppealDesc") },
                ].map((badge, idx) => {
                  const Icon = badge.icon;
                  return (
                    <div key={idx} className="flex flex-col items-center justify-center p-3 rounded-2xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.08] transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-2">
                        <Icon className="w-4 h-4 text-indigo-400" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-200">{badge.label}</span>
                      <span className="text-[9px] text-slate-500 mt-0.5 hidden sm:inline">{badge.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <SiteFooter />

      {/* CodePen pastki menu (mobil) — news ham bor */}
      <PublicMobileTabBar
        hidden={menuOpen}
        activeId={
          activeTab === "#" || activeTab === "home"
            ? "home"
            : activeTab === "login"
            ? "login"
            : activeTab.replace(/^#/, "") || "home"
        }
        onChange={(id) => {
          if (id === "home") {
            setActiveTab("#");
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else if (id === "login") {
            setActiveTab("login");
          } else {
            setActiveTab(`#${id}`);
            document
              .getElementById(id)
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }}
      />

    </div>
  );
}

function StatCard({
  stat,
  active,
  delay,
}: {
  stat: { value: number; suffix: string; label: string };
  active: boolean;
  delay: number;
}) {
  const n = useCountUp(stat.value, active);
  return (
    <div
      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm px-4 py-4 text-center landing-card-hover landing-shine hover:border-indigo-400/30 relative overflow-hidden"
      style={{
        opacity: active ? 1 : 0,
        transform: active ? "none" : "translateY(16px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
      <p className="text-2xl sm:text-3xl font-black landing-text-live tabular-nums">
        {n}
        {stat.suffix}
      </p>
      <p className="text-[11px] text-slate-500 mt-1 font-medium">{stat.label}</p>
    </div>
  );
}

/** Vizual mock — har bir hayotiy oqim uchun alohida UI skrin */
function ShowcaseMock({ flow, active }: { flow: ShowcaseFlow; active: boolean }) {
  // Survey states
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [surveyStep, setSurveyStep] = useState(3);
  const [surveyProgress, setSurveyProgress] = useState(38);
  const [surveyDone, setSurveyDone] = useState(false);

  // Analytics states
  const [days, setDays] = useState<7 | 30>(7);

  // Appeal states
  const [appealStep, setAppealStep] = useState(1);
  const [appealSent, setAppealSent] = useState(true);

  // Share states
  const [copied, setCopied] = useState(false);

  // SSO states
  const [ssoStep, setSsoStep] = useState(1);

  // Reset states when flow changes or becomes inactive
  useEffect(() => {
    if (!active) {
      setSelectedOpt(null);
      setSurveyStep(3);
      setSurveyProgress(38);
      setSurveyDone(false);
      setDays(7);
      setAppealStep(1);
      setAppealSent(true);
      setCopied(false);
      setSsoStep(1);
    }
  }, [active, flow.id]);

  const handleSurveyClick = (k: number) => {
    setSelectedOpt(k);
    setTimeout(() => {
      if (surveyStep < 5) {
        setSurveyStep((v) => v + 1);
        setSurveyProgress((v) => Math.min(100, v + 15));
        setSelectedOpt(null);
      } else {
        setSurveyDone(true);
        setSurveyProgress(100);
      }
    }, 600);
  };

  const handleSendAppeal = () => {
    setAppealSent(true);
    setAppealStep(1);
    const t1 = setTimeout(() => setAppealStep(2), 1200);
    const t2 = setTimeout(() => setAppealStep(3), 2500);
  };

  const copyToClipboard = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-[340px] rounded-[1.35rem] border border-white/15 bg-[#0b1224]/90 backdrop-blur-xl shadow-[0_28px_60px_-20px_rgba(0,0,0,0.65)] overflow-hidden landing-shine">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.07] bg-white/[0.03]">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-400/85" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/85" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/85" />
        <span className="ml-2 text-[10px] text-slate-500 font-medium truncate">
          bildir · {flow.tag.toLowerCase()}
        </span>
      </div>

      <div className="p-4 sm:p-5 min-h-[280px]">
        {flow.mock === "survey" && (
          <div className="space-y-4">
            {surveyDone ? (
              <div className="space-y-4 text-center py-6">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 animate-pulse-slow" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">So&apos;rovnoma yakunlandi</p>
                  <p className="text-[11px] text-slate-400 mt-1">Sizning anonim javobingiz shifrlangan va muhrlangan holda yuborildi.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSurveyDone(false);
                    setSurveyStep(3);
                    setSurveyProgress(38);
                    setSelectedOpt(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                  Qaytadan boshlash
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-slate-400">Savol {surveyStep} / 5</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-300 font-semibold">
                    Anonim
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 transition-all duration-500"
                    style={{ width: `${surveyProgress}%` }}
                  />
                </div>
                <p className="text-sm font-semibold text-white leading-snug">
                  {surveyStep === 3
                    ? "Dars sifati sizni qoniqtiradimi?"
                    : surveyStep === 4
                    ? "O&apos;quv xonalari texnik jihozlanganmi?"
                    : "Platforma qulayligi qanday?"}
                </p>
                <div className="space-y-2">
                  {["Juda yaxshi", "Yaxshi", "O'rtacha", "Qoniqarsiz"].map((opt, k) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSurveyClick(k)}
                      className={`w-full flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[12px] text-left transition-all duration-300 ${
                        selectedOpt === k
                          ? "border-indigo-400 bg-indigo-500/25 text-white scale-[1.02] shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                          : "border-white/[0.08] bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/5"
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                          selectedOpt === k
                            ? "border-indigo-400"
                            : "border-slate-500"
                        }`}
                      >
                        {selectedOpt === k && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {flow.mock === "analytics" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tahlil filtri</span>
              <div className="flex p-0.5 rounded-lg bg-white/[0.04] border border-white/5">
                {[7, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d as 7 | 30)}
                    className={`px-2.5 py-1 rounded-md text-[9px] font-bold transition-all ${
                      days === d
                        ? "bg-cyan-500/25 border border-cyan-400/30 text-white"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {d} kun
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: days === 7 ? "1.2k" : "5.4k", l: "Javob" },
                { v: days === 7 ? "86%" : "92%", l: "Ishtirok" },
                { v: days === 7 ? "4.2" : "4.5", l: "O'rtacha" },
              ].map((k, i) => (
                <div
                  key={k.l}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 py-2.5 text-center"
                  style={{
                    opacity: active ? 1 : 0.4,
                    transform: active ? "none" : "translateY(6px)",
                    transition: `all 0.5s ease ${i * 90}ms`,
                  }}
                >
                  <p className="text-sm font-black text-cyan-200 tabular-nums">{k.v}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">{k.l}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-black/30 p-3 h-28 flex items-end gap-1.5">
              {(days === 7
                ? [40, 65, 45, 80, 55, 90, 70]
                : [75, 40, 85, 50, 95, 60, 80]
              ).map((h, k) => (
                <div
                  key={k}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-cyan-600/80 to-sky-300/70 transition-all duration-500 ease-out"
                  style={{
                    height: active ? `${h}%` : "8%",
                  }}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Fakultet kesimi · {days} kun</span>
              <span className="inline-flex items-center gap-1 text-cyan-300 font-semibold cursor-pointer hover:underline">
                <Download className="w-3 h-3" /> Excel
              </span>
            </div>
          </div>
        )}

        {flow.mock === "appeal" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-white">Yangi murojaat</p>
              <span className="text-[9px] px-2 py-0.5 rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-200 font-bold">
                SLA 72s
              </span>
            </div>
            {appealSent ? (
              <div className="space-y-2.5">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 space-y-1.5">
                  <p className="text-xs text-white font-medium leading-snug">Rektorat binosi isitish tizimini yaxshilash to&apos;g&apos;risida...</p>
                  <div className="h-6 rounded border border-dashed border-white/10 bg-black/20 flex items-center justify-center gap-1.5 text-[9px] text-slate-400">
                    <FileText className="w-3 h-3" /> taklif.pdf · 1.8 MB
                  </div>
                </div>
                <div className="space-y-1.5">
                  {[
                    { s: "Yuborildi", c: "text-slate-400", step: 1 },
                    { s: "Ko'rib chiqilmoqda", c: "text-amber-300", step: 2 },
                    { s: "Javob berildi (Fayl biriktirildi)", c: "text-emerald-300", step: 3 },
                  ].map((row) => (
                    <div
                      key={row.s}
                      className={`flex items-center gap-2 text-[11px] transition-all duration-300 ${
                        appealStep >= row.step ? "opacity-100" : "opacity-30"
                      }`}
                    >
                      {appealStep >= row.step ? (
                        <CheckCircle2 className={`w-3.5 h-3.5 ${row.c}`} />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-slate-600" />
                      )}
                      <span className={appealStep >= row.step ? row.c : "text-slate-500"}>{row.s}</span>
                    </div>
                  ))}
                </div>
                {appealStep === 3 && (
                  <div className="p-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-[10px] text-emerald-200 leading-snug animate-[fadeIn_0.4s_ease-out_forwards]">
                    <strong>Admin javobi:</strong> Murojaat o&apos;rganildi, issiqlik tizimi sozlandi va sinovdan o&apos;tkazildi.
                  </div>
                )}
                <div className="flex justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAppealSent(false);
                      setAppealStep(0);
                    }}
                    className="text-[10px] text-slate-400 hover:text-white"
                  >
                    Yangi yozish
                  </button>
                  {appealStep < 3 && (
                    <button
                      type="button"
                      onClick={() => setAppealStep((s) => s + 1)}
                      className="text-[10px] text-indigo-400 font-bold hover:underline"
                    >
                      Keyingi status ➔
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  placeholder="Murojaat matnini kiriting..."
                  className="w-full h-20 rounded-xl border border-white/[0.08] bg-black/20 p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-400"
                  defaultValue="Kutubxona darsliklarini yangilash masalasida..."
                  id="mock-textarea"
                />
                <button
                  type="button"
                  onClick={handleSendAppeal}
                  className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-100 py-2.5 rounded-xl bg-amber-500/20 border border-amber-400/25 hover:bg-amber-500/30 transition-all"
                >
                  <Send className="w-3.5 h-3.5" /> Yuborish
                </button>
              </div>
            )}
          </div>
        )}

        {flow.mock === "share" && (
          <div className="space-y-4">
            <p className="text-[11px] font-bold text-white">So&apos;rovnomani ulashing</p>
            <div className="flex justify-center">
              <div
                className={`w-28 h-28 rounded-2xl border border-white/15 bg-white p-2.5 shadow-lg transition-all duration-500 cursor-pointer ${
                  active ? "scale-100 rotate-0" : "scale-90 opacity-70"
                } hover:scale-105 hover:rotate-3`}
                title="Skan qilish"
              >
                <div className="w-full h-full grid grid-cols-5 gap-0.5">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-[1px] ${
                        [0, 1, 2, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 21, 22, 24].includes(i)
                          ? "bg-slate-900"
                          : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 text-[10px] text-slate-400 font-mono truncate select-all">
                bildir.uz/s/a7f3-9d0b
              </div>
              <button
                type="button"
                onClick={copyToClipboard}
                className="px-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-[10px] text-slate-300 hover:bg-white/5 active:scale-95 transition-all"
              >
                {copied ? "Nusxalandi! ✓" : "Nusxa"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a
                href="https://t.me/share/url?url=https://bildir.uz/s/a7f3-9d0b"
                target="_blank"
                rel="noreferrer"
                className="text-center text-[11px] font-semibold py-2 rounded-xl border border-sky-400/25 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20 active:scale-95 transition-all"
              >
                Telegram
              </a>
              <a
                href="https://api.whatsapp.com/send?text=https://bildir.uz/s/a7f3-9d0b"
                target="_blank"
                rel="noreferrer"
                className="text-center text-[11px] font-semibold py-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 active:scale-95 transition-all"
              >
                WhatsApp
              </a>
            </div>
          </div>
        )}

        {flow.mock === "leadership" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-white">Rahbariyat</p>
              <span className="text-[9px] text-violet-300 font-semibold">ochiq</span>
            </div>
            {[
              { n: "Rektor", p: "Rahbariyat", a: true, phone: "+998 79 223-3009" },
              { n: "Prorektor", p: "O'quv ishlari", a: false, phone: "+998 79 223-3010" },
              { n: "Bo'lim boshlig'i", p: "Komplayens", a: false, phone: "+998 79 223-3011" },
            ].map((r, i) => (
              <div
                key={r.n}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-300 cursor-pointer ${
                  r.a && active
                    ? "border-violet-400/35 bg-violet-500/10 scale-[1.02]"
                    : "border-white/[0.08] bg-white/[0.03] hover:border-white/20"
                }`}
                style={{
                  opacity: active ? 1 : 0.4,
                  transform: active ? "none" : "translateX(8px)",
                  transitionDelay: `${i * 90}ms`,
                }}
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/30 to-indigo-600/20 border border-white/10 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4 text-violet-200" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-white truncate">{r.n}</p>
                  <p className="text-[10px] text-slate-500 truncate">{r.p}</p>
                </div>
                {r.a && active && (
                  <a href={`tel:${r.phone}`} className="text-[10px] text-violet-300 hover:underline">
                    Aloqa
                  </a>
                )}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-1">
              <AlertTriangle className="w-3 h-3 text-amber-400/70" />
              Kontakt va qabul vaqti ochiq
            </div>
          </div>
        )}

        {flow.mock === "sso" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-white">HEMIS Single Sign-On</p>
              <span className="text-[9px] px-2 py-0.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 text-indigo-300 font-bold">
                Xavfsiz ulanish
              </span>
            </div>

            {ssoStep === 1 && (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl border border-white/[0.08] bg-black/20 space-y-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 block">Talaba ID / Login</label>
                    <input
                      type="text"
                      placeholder="378201100..."
                      className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      defaultValue="310211100481"
                      disabled
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 block">Parol</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      defaultValue="studentpass123"
                      disabled
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSsoStep(2);
                    setTimeout(() => setSsoStep(3), 1800);
                  }}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/10 active:scale-98 transition-all flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" /> HEMIS orqali kirish
                </button>
              </div>
            )}

            {ssoStep === 2 && (
              <div className="space-y-4 text-center py-6 animate-pulse">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                <div>
                  <p className="text-xs font-bold text-white">Avtorizatsiya tekshirilmoqda...</p>
                  <p className="text-[10px] text-slate-400 mt-1">HEMIS API xavfsiz shifrlash kanali (SSL) orqali ulanmoqda</p>
                </div>
              </div>
            )}

            {ssoStep === 3 && (
              <div className="space-y-4 text-center py-4 animate-[fadeIn_0.4s_ease-out_forwards]">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Muvaffaqiyatli ulandingiz!</p>
                  <p className="text-[9px] text-slate-400 mt-1">Tizimga kirildi. Sizning talaba ma&apos;lumotlaringiz muvaffaqiyatli yuklandi.</p>
                </div>
                <div className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-left text-[10px] space-y-1">
                  <p className="text-slate-400">Roli: <span className="text-white font-bold">Talaba</span></p>
                  <p className="text-slate-400">Fakultet: <span className="text-white font-bold">Iqtisodiyot</span></p>
                  <p className="text-slate-400">Token: <span className="text-emerald-400 font-mono text-[9px]">sha256:7f4c...</span></p>
                </div>
                <button
                  type="button"
                  onClick={() => setSsoStep(1)}
                  className="text-[10px] text-slate-500 hover:text-slate-300 underline"
                >
                  Chiqish / Qayta kirish
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
