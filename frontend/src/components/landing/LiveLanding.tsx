"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Radio, Users } from "lucide-react";
import { officeApi } from "@/lib/api";
import type { ResponsiblePerson } from "@/types";

function unwrapList<T>(res: { data?: unknown }): T[] {
  const body = res.data as { data?: T[] } | T[] | undefined;
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object" && Array.isArray((body as { data?: T[] }).data)) {
    return (body as { data: T[] }).data;
  }
  return [];
}

/** Sahifa yuqorisidagi scroll progress chizig'i */
export function ScrollProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setPct(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="landing-scroll-progress"
      style={{ width: `${pct}%` }}
      aria-hidden
    />
  );
}

/** Rahbariyat soni — public API */
export function useLandingLiveData() {
  const personsQuery = useQuery({
    queryKey: ["landing-persons-live", typeof window !== "undefined" ? window.localStorage.getItem("bildir_locale") : "uz"],
    queryFn: async () => unwrapList<ResponsiblePerson>(await officeApi.persons()),
    staleTime: 60_000,
    refetchInterval: 90_000,
  });

  const officialsCount = personsQuery.data?.length ?? 0;

  return {
    officialsCount,
    isLoading: personsQuery.isLoading,
    isError: personsQuery.isError,
    persons: personsQuery.data ?? [],
  };
}

type FeedItem = {
  id: string;
  icon: "survey" | "appeal" | "auth" | "sync" | "official";
  text: string;
  minutesAgo: number;
};

const BASE_FEED: Omit<FeedItem, "minutesAgo">[] = [
  {
    id: "1",
    icon: "survey",
    text: "Iqtisodiyot fakultetidan yangi anonim so'rovnoma qabul qilindi",
  },
  {
    id: "2",
    icon: "appeal",
    text: "Murojaat #1042 bo'lim boshlig'i tomonidan ko'rib chiqildi",
  },
  {
    id: "3",
    icon: "auth",
    text: "HEMIS SSO orqali yangi talaba muvaffaqiyatli kirdi",
  },
  {
    id: "4",
    icon: "sync",
    text: "O'quv sifati so'rovnomasi natijalari yangilandi",
  },
  {
    id: "5",
    icon: "sync",
    text: "AES-256 va HMAC shifrlash kalitlari yangilandi",
  },
];

function formatAgo(mins: number): string {
  if (mins < 1) return "hozirgina";
  if (mins < 60) return `${mins} daqiqa oldin`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} soat oldin`;
  return `${Math.floor(h / 24)} kun oldin`;
}

const ICON_EMOJI: Record<FeedItem["icon"], string> = {
  survey: "📥",
  appeal: "✅",
  auth: "🔑",
  sync: "📊",
  official: "🏛️",
};

/** Jonli faollik lenti — vaqt real yangilanadi */
export function LiveTicker({
  officialsCount = 0,
  className = "",
}: {
  officialsCount?: number;
  className?: string;
}) {
  const [tick, setTick] = useState(0);
  const [idx, setIdx] = useState(0);
  const [startedAt] = useState(() => Date.now());

  const feed = useMemo(() => {
    const base: FeedItem[] = BASE_FEED.map((f, i) => ({
      ...f,
      minutesAgo: [1, 5, 12, 25, 60][i] ?? 10,
    }));
    if (officialsCount > 0) {
      base.unshift({
        id: "officials",
        icon: "official",
        text: `Rahbariyat katalogida ${officialsCount} ta ochiq profil e'lon qilingan`,
        minutesAgo: 0,
      });
    }
    return base;
  }, [officialsCount]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % feed.length), 3800);
    return () => clearInterval(t);
  }, [feed.length]);

  const item = feed[idx % feed.length];
  // "jonli" his: vaqt o'tishi bilan minutesAgo sekin oshadi
  const drift = Math.floor((Date.now() - startedAt) / 60_000) + tick * 0;
  const ago = formatAgo(item.minutesAgo + (item.minutesAgo > 0 ? Math.min(drift, 3) : 0));

  return (
    <div
      className={`h-9 overflow-hidden relative rounded-xl border border-white/[0.07] bg-slate-950/50 backdrop-blur-sm px-3 flex items-center w-full sm:max-w-md shadow-md ${className}`}
    >
      <span className="live-dot mr-2.5" />
      <div key={`${item.id}-${idx}`} className="min-w-0 flex-1 animate-slide-soft">
        <p className="text-[10px] font-medium text-slate-300 truncate leading-tight">
          <span className="mr-1">{ICON_EMOJI[item.icon]}</span>
          <span className="text-cyan-300/90 font-semibold">{ago}</span>
          <span className="text-slate-500 mx-1">·</span>
          <span className="text-slate-400">{item.text}</span>
        </p>
      </div>
    </div>
  );
}

/** Tizim online / jonli metrikalar chizig'i */
export function LiveStatusStrip({
  officialsCount,
  isLoading,
}: {
  officialsCount: number;
  isLoading?: boolean;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px]">
      <span className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 text-emerald-200 font-semibold animate-soft-glow">
        <span className="live-dot" />
        Tizim online
      </span>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] text-slate-400">
        <Radio className="w-3 h-3 text-cyan-400/80" />
        <span className="tabular-nums text-slate-300 font-medium">{time}</span>
      </span>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] text-slate-400">
        <Users className="w-3 h-3 text-indigo-300/80" />
        {isLoading ? (
          <span className="text-slate-500">Yuklanmoqda…</span>
        ) : (
          <span>
            <span className="text-white font-bold tabular-nums">{officialsCount || "—"}</span>
            {" "}rahbariyat
          </span>
        )}
      </span>
      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] text-slate-400">
        <Activity className="w-3 h-3 text-violet-300/80" />
        SLA 72s · AES-256
      </span>
    </div>
  );
}

/** Hero mock ichidagi jonli progress barlar */
export function LiveAnalyticsBars({
  rows,
}: {
  rows: { l: string; v: number }[];
}) {
  const [vals, setVals] = useState(rows.map((r) => r.v));

  useEffect(() => {
    setVals(rows.map((r) => r.v));
  }, [rows]);

  useEffect(() => {
    const t = setInterval(() => {
      setVals((prev) =>
        prev.map((v, i) => {
          const base = rows[i]?.v ?? v;
          const jitter = Math.round((Math.random() - 0.45) * 12);
          return Math.max(28, Math.min(96, base + jitter));
        })
      );
    }, 3200);
    return () => clearInterval(t);
  }, [rows]);

  return (
    <div className="space-y-2.5">
      {rows.map((row, i) => (
        <div key={row.l}>
          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
            <span>{row.l}</span>
            <span className="tabular-nums text-slate-400">{vals[i]}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 transition-all duration-1000 ease-out"
              style={{ width: `${vals[i]}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Floating equalizer barlar */
export function LiveEqualizer({
  bars = 4,
  className = "",
}: {
  bars?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-end justify-between gap-1.5 h-28 ${className}`}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-md bg-gradient-to-t from-fuchsia-600/80 to-pink-300/70 origin-bottom animate-bar-wave"
          style={{
            height: `${45 + (i % 3) * 18}%`,
            animationDelay: `${i * 0.22}s`,
          }}
        />
      ))}
    </div>
  );
}
