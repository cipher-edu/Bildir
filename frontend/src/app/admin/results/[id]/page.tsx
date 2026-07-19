"use client";

import { use, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, BarChart3, Loader2, AlertCircle, RefreshCw,
  Users, MessageSquare, HelpCircle, TrendingUp, EyeOff, Eye,
  Building2, GraduationCap, UserRound, UsersRound,
  Search, LineChart as LineChartIcon, BarChart2, Download, ShieldCheck,
} from "lucide-react";
import { surveysApi } from "@/lib/api";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import type { SurveyResults } from "@/types";

function filenameFromDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf?.[1]) {
    try {
      return decodeURIComponent(utf[1].trim());
    } catch {
      /* ignore */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1]?.trim() || fallback;
}

type DimItem = {
  key: string;
  label: string;
  value: number;
  pct: number;
  average?: number;
};

type DimTimeline = {
  series_keys: string[];
  points: Array<{ date: string; values: Record<string, number> }>;
};

type DimensionData = {
  label: string;
  items: DimItem[];
  timeline?: DimTimeline;
};

function unwrapData<T>(res: { data?: { data?: T } | T }): T {
  const p = res.data as { data?: T } | T | undefined;
  if (p && typeof p === "object" && "data" in (p as object) && (p as { data: T }).data !== undefined) {
    return (p as { data: T }).data;
  }
  return p as T;
}

const Q_TYPE_LABEL: Record<string, string> = {
  single: "Bir tanlov",
  multiple: "Ko'p tanlov",
  text: "Yozma",
  textarea: "Batafsil",
  rating: "Yulduz",
  nps: "NPS",
  likert: "Likert",
};

const CHART_COLORS = [
  "#6366f1", "#22d3ee", "#a78bfa", "#34d399", "#fbbf24",
  "#f472b6", "#38bdf8", "#4ade80", "#fb923c", "#e879f9",
];

/* ── Timeline line chart ───────────────────────────────────── */

const WEEKDAYS_UZ = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];

function fillTimelineDays(
  data: { date: string; count: number }[]
): { date: string; count: number }[] {
  if (!data.length) return [];
  const map = new Map(data.map((d) => [d.date, d.count]));
  const dates = data.map((d) => d.date).filter(Boolean).sort();
  const start = new Date(dates[0] + "T12:00:00");
  const end = new Date(dates[dates.length - 1] + "T12:00:00");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return data;

  const out: { date: string; count: number }[] = [];
  const cur = new Date(start);
  let guard = 0;
  while (cur <= end && guard < 400) {
    const iso = cur.toISOString().slice(0, 10);
    out.push({ date: iso, count: map.get(iso) ?? 0 });
    cur.setDate(cur.getDate() + 1);
    guard += 1;
  }
  return out;
}

function formatDayLabel(iso: string): string {
  if (iso.length >= 10) return `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
  return iso;
}

function formatFullDate(iso: string): string {
  try {
    const d = new Date(iso + "T12:00:00");
    const wd = WEEKDAYS_UZ[d.getDay()];
    return `${wd}, ${formatDayLabel(iso)}.${iso.slice(0, 4)}`;
  } catch {
    return iso;
  }
}

/** Catmull-Rom → cubic bezier smooth path */
function smoothLinePath(
  pts: { x: number; y: number }[],
  tension = 0.35
): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  if (pts.length === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + ((p2.x - p0.x) * tension) / 2;
    const cp1y = p1.y + ((p2.y - p0.y) * tension) / 2;
    const cp2x = p2.x - ((p3.x - p1.x) * tension) / 2;
    const cp2y = p2.y - ((p3.y - p1.y) * tension) / 2;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

type TimelineMode = "daily" | "cumulative";
type RangeKey = "7" | "14" | "30" | "all";

function LineChart({
  data,
  height = 280,
}: {
  data: { date: string; count: number }[];
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [mode, setMode] = useState<TimelineMode>("daily");
  const [range, setRange] = useState<RangeKey>("all");
  const [showMa, setShowMa] = useState(true);
  const [showBars, setShowBars] = useState(true);

  const fullSeries = useMemo(() => fillTimelineDays(data), [data]);

  const series = useMemo(() => {
    if (range === "all" || fullSeries.length === 0) return fullSeries;
    const n = parseInt(range, 10);
    return fullSeries.slice(-n);
  }, [fullSeries, range]);

  const displaySeries = useMemo(() => {
    if (mode === "daily") return series;
    let acc = 0;
    return series.map((d) => {
      acc += d.count;
      return { date: d.date, count: acc };
    });
  }, [series, mode]);

  const maSeries = useMemo(() => {
    const window = 7;
    return displaySeries.map((_, i) => {
      const from = Math.max(0, i - window + 1);
      const slice = displaySeries.slice(from, i + 1);
      const avg = slice.reduce((a, d) => a + d.count, 0) / slice.length;
      return avg;
    });
  }, [displaySeries]);

  if (!fullSeries.length) {
    return (
      <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-xs text-slate-600">
        <TrendingUp className="w-8 h-8 opacity-40" />
        <span>Vaqt bo&apos;yicha ma&apos;lumot yo&apos;q</span>
      </div>
    );
  }

  const w = 800;
  const h = height;
  const pad = { t: 24, r: 20, b: 40, l: 44 };
  const values = displaySeries.map((d) => d.count);
  const maxY = Math.max(...values, 1) * 1.08;
  const total = series.reduce((a, d) => a + d.count, 0);
  const peak = series.reduce((a, d) => (d.count > a.count ? d : a), series[0]);
  const avg = Math.round((total / Math.max(series.length, 1)) * 10) / 10;
  const last7 = series.slice(-7).reduce((a, d) => a + d.count, 0);
  const prev7 = series.slice(-14, -7).reduce((a, d) => a + d.count, 0);
  const trendPct =
    prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : last7 > 0 ? 100 : 0;

  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const pts = displaySeries.map((d, i) => {
    const x =
      pad.l +
      (displaySeries.length === 1
        ? innerW / 2
        : (i / (displaySeries.length - 1)) * innerW);
    const y = pad.t + innerH - (d.count / maxY) * innerH;
    return { x, y, raw: series[i]?.count ?? d.count, ...d };
  });

  const maPts = pts.map((p, i) => ({
    x: p.x,
    y: pad.t + innerH - (maSeries[i] / maxY) * innerH,
  }));

  const line = smoothLinePath(pts);
  const maLine = smoothLinePath(maPts, 0.4);
  const area = `${line} L ${pts[pts.length - 1].x.toFixed(2)} ${(pad.t + innerH).toFixed(2)} L ${pts[0].x.toFixed(2)} ${(pad.t + innerH).toFixed(2)} Z`;

  const labelStep = Math.max(1, Math.ceil(displaySeries.length / 7));
  const hi = hover != null ? pts[hover] : null;
  const barW = Math.min(
    14,
    Math.max(3, (innerW / Math.max(displaySeries.length, 1)) * 0.55)
  );

  // nice Y ticks
  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const t = i / tickCount;
    return { t, value: Math.round(maxY * t) };
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "daily" as const, label: "Kunlik" },
              { id: "cumulative" as const, label: "Yig‘indi" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                mode === m.id
                  ? "bg-indigo-600 text-white shadow-[0_0_16px_rgba(99,102,241,0.4)]"
                  : "bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
          <span className="w-px h-6 bg-white/10 self-center mx-0.5" />
          {(
            [
              { id: "7" as const, label: "7k" },
              { id: "14" as const, label: "14k" },
              { id: "30" as const, label: "30k" },
              { id: "all" as const, label: "Hammasi" },
            ] as const
          ).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                range === r.id
                  ? "bg-cyan-600/80 text-white"
                  : "bg-white/[0.03] border border-white/10 text-slate-500 hover:text-slate-300"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setShowBars((v) => !v)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
              showBars
                ? "border-violet-500/40 bg-violet-500/15 text-violet-200"
                : "border-white/10 text-slate-500"
            }`}
          >
            Ustunlar
          </button>
          <button
            type="button"
            onClick={() => setShowMa((v) => !v)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
              showMa
                ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
                : "border-white/10 text-slate-500"
            }`}
          >
            7k o‘rtacha
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          {
            label: "Davr jami",
            value: String(total),
            sub: `${series.length} kun`,
            cls: "from-indigo-500/15 to-transparent border-indigo-500/20",
            valCls: "text-white",
          },
          {
            label: "Eng yuqori",
            value: String(peak.count),
            sub: formatDayLabel(peak.date),
            cls: "from-cyan-500/15 to-transparent border-cyan-500/20",
            valCls: "text-cyan-300",
          },
          {
            label: "Kunlik o‘rtacha",
            value: String(avg),
            sub: mode === "cumulative" ? "yig‘indi rejimi" : "kunlik",
            cls: "from-violet-500/15 to-transparent border-violet-500/20",
            valCls: "text-violet-300",
          },
          {
            label: "7 kun trend",
            value: `${trendPct > 0 ? "+" : ""}${trendPct}%`,
            sub: prev7 ? `${prev7} → ${last7}` : `${last7} javob`,
            cls:
              trendPct >= 0
                ? "from-emerald-500/15 to-transparent border-emerald-500/20"
                : "from-rose-500/15 to-transparent border-rose-500/20",
            valCls: trendPct >= 0 ? "text-emerald-300" : "text-rose-300",
          },
        ].map((k) => (
          <div
            key={k.label}
            className={`rounded-xl border bg-gradient-to-br px-3 py-2.5 ${k.cls}`}
          >
            <p className="text-[10px] text-slate-500">{k.label}</p>
            <p className={`text-xl font-extrabold tabular-nums tracking-tight ${k.valCls}`}>
              {k.value}
            </p>
            <p className="text-[10px] text-slate-600 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart canvas */}
      <div className="relative rounded-2xl border border-white/[0.07] bg-[#060b18]/80 overflow-hidden">
        {/* ambient glow */}
        <div className="absolute top-0 left-1/4 w-1/2 h-24 bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative p-2 sm:p-4">
          <svg
            viewBox={`0 0 ${w} ${h}`}
            className="w-full h-auto select-none"
            style={{ minHeight: 240 }}
            preserveAspectRatio="xMidYMid meet"
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id="areaGradPro" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.5" />
                <stop offset="40%" stopColor="#6366f1" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#312e81" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="barGradPro" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.08" />
              </linearGradient>
              <linearGradient id="strokeGradPro" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="50%" stopColor="#a5b4fc" />
                <stop offset="100%" stopColor="#c4b5fd" />
              </linearGradient>
              <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <clipPath id="plotClip">
                <rect x={pad.l} y={pad.t} width={innerW} height={innerH} />
              </clipPath>
            </defs>

            {/* background plot */}
            <rect
              x={pad.l}
              y={pad.t}
              width={innerW}
              height={innerH}
              fill="rgba(15,23,42,0.35)"
              rx="8"
            />

            {/* horizontal grid + Y labels */}
            {yTicks.map(({ t, value }) => {
              const y = pad.t + innerH * (1 - t);
              return (
                <g key={t}>
                  <line
                    x1={pad.l}
                    x2={w - pad.r}
                    y1={y}
                    y2={y}
                    stroke="rgba(148,163,184,0.12)"
                    strokeDasharray={t === 0 ? "0" : "5 5"}
                  />
                  <text
                    x={pad.l - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="11"
                    fontFamily="ui-sans-serif,system-ui"
                  >
                    {value}
                  </text>
                </g>
              );
            })}

            <g clipPath="url(#plotClip)">
              {/* Bars */}
              {showBars &&
                pts.map((p, i) => {
                  const barH = Math.max(0, pad.t + innerH - p.y);
                  const active = hover === i;
                  return (
                    <rect
                      key={`bar-${p.date}`}
                      x={p.x - barW / 2}
                      y={p.y}
                      width={barW}
                      height={barH}
                      rx={2}
                      fill="url(#barGradPro)"
                      opacity={active ? 0.95 : 0.45}
                      className="transition-opacity duration-150"
                    />
                  );
                })}

              {/* Area + smooth line */}
              <path d={area} fill="url(#areaGradPro)" opacity={0.9} />
              <path
                d={line}
                fill="none"
                stroke="url(#strokeGradPro)"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                filter="url(#softGlow)"
              />

              {/* Moving average */}
              {showMa && displaySeries.length >= 3 && (
                <path
                  d={maLine}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.8"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  opacity={0.85}
                />
              )}
            </g>

            {/* X labels + interaction */}
            {pts.map((p, i) => (
              <g key={p.date}>
                <rect
                  x={
                    p.x -
                    (displaySeries.length > 1
                      ? innerW / displaySeries.length / 2
                      : 24)
                  }
                  y={pad.t}
                  width={
                    displaySeries.length > 1
                      ? Math.max(innerW / displaySeries.length, 6)
                      : 48
                  }
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  style={{ cursor: "crosshair" }}
                />
                {(i % labelStep === 0 || i === pts.length - 1) && (
                  <text
                    x={p.x}
                    y={h - 14}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="ui-sans-serif,system-ui"
                  >
                    {formatDayLabel(p.date)}
                  </text>
                )}
              </g>
            ))}

            {/* Hover crosshair + point */}
            {hi && (
              <g pointerEvents="none">
                <line
                  x1={hi.x}
                  x2={hi.x}
                  y1={pad.t}
                  y2={pad.t + innerH}
                  stroke="rgba(165,180,252,0.5)"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                />
                <line
                  x1={pad.l}
                  x2={w - pad.r}
                  y1={hi.y}
                  y2={hi.y}
                  stroke="rgba(165,180,252,0.2)"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                />
                <circle
                  cx={hi.x}
                  cy={hi.y}
                  r="8"
                  fill="rgba(99,102,241,0.25)"
                />
                <circle
                  cx={hi.x}
                  cy={hi.y}
                  r="4.5"
                  fill="#c7d2fe"
                  stroke="#312e81"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Default end point when no hover */}
            {!hi && pts.length > 0 && (
              <circle
                cx={pts[pts.length - 1].x}
                cy={pts[pts.length - 1].y}
                r="4"
                fill="#a5b4fc"
                stroke="#1e1b4b"
                strokeWidth="2"
                pointerEvents="none"
              />
            )}
          </svg>

          {/* Floating tooltip near cursor (right side if left half) */}
          {hi && (
            <div
              className="pointer-events-none absolute z-10 min-w-[140px] rounded-2xl border border-indigo-400/35 bg-[#0b1224]/95 backdrop-blur-xl px-3.5 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
              style={{
                top: 16,
                left: hi.x / w > 0.55 ? 16 : undefined,
                right: hi.x / w > 0.55 ? undefined : 16,
              }}
            >
              <p className="text-[10px] text-indigo-200/80 font-medium">
                {formatFullDate(hi.date)}
              </p>
              <p className="text-lg font-extrabold text-white tabular-nums mt-0.5">
                {mode === "cumulative" ? hi.count : hi.raw}
                <span className="text-[11px] font-normal text-slate-400 ml-1">
                  {mode === "cumulative" ? "yig‘indi" : "javob"}
                </span>
              </p>
              {mode === "cumulative" && hi.raw !== hi.count && (
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Shu kun: <span className="text-slate-300">{hi.raw}</span>
                </p>
              )}
              {showMa && hover != null && (
                <p className="text-[10px] text-amber-300/90 mt-1 border-t border-white/5 pt-1">
                  7k o‘rt: {maSeries[hover].toFixed(1)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 px-4 pb-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 rounded bg-gradient-to-r from-cyan-300 to-violet-300" />
            {mode === "daily" ? "Kunlik javoblar" : "Yig‘indi"}
          </span>
          {showMa && (
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 rounded border-t-2 border-dashed border-amber-400" />
              7 kunlik o‘rtacha
            </span>
          )}
          {showBars && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-violet-400/50" />
              Ustun
            </span>
          )}
        </div>
      </div>

      <p className="text-[10px] text-slate-600 text-center">
        {series[0]?.date} — {series[series.length - 1]?.date}
        {" · "}
        {series.length} kun
        {" · "}
        sichqonchani grafik ustida yuriting
      </p>
    </div>
  );
}

/* ── Multi-series line chart (kesimlar dinamikasi) ─────────── */

function MultiSeriesLineChart({
  seriesKeys,
  points,
  height = 240,
  range = "all",
  mode = "daily",
}: {
  seriesKeys: string[];
  points: Array<{ date: string; values: Record<string, number> }>;
  height?: number;
  range?: RangeKey;
  mode?: TimelineMode;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const series = useMemo(() => {
    if (!points.length) return [];
    if (range === "all") return points;
    const n = parseInt(range, 10);
    return points.slice(-n);
  }, [points, range]);

  const display = useMemo(() => {
    if (mode === "daily") return series;
    const acc: Record<string, number> = {};
    for (const k of seriesKeys) acc[k] = 0;
    return series.map((p) => {
      const values: Record<string, number> = {};
      for (const k of seriesKeys) {
        acc[k] = (acc[k] || 0) + (p.values[k] || 0);
        values[k] = acc[k];
      }
      return { date: p.date, values };
    });
  }, [series, seriesKeys, mode]);

  if (!display.length || !seriesKeys.length) {
    return (
      <div className="h-[180px] flex flex-col items-center justify-center gap-2 text-xs text-slate-600">
        <LineChartIcon className="w-7 h-7 opacity-40" />
        <span>Line chart uchun ma&apos;lumot yo&apos;q</span>
      </div>
    );
  }

  const w = 720;
  const h = height;
  const pad = { t: 18, r: 14, b: 36, l: 40 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  let maxY = 1;
  for (const p of display) {
    for (const k of seriesKeys) {
      maxY = Math.max(maxY, p.values[k] || 0);
    }
  }
  maxY *= 1.1;

  const xAt = (i: number) =>
    pad.l +
    (display.length === 1 ? innerW / 2 : (i / (display.length - 1)) * innerW);
  const yAt = (v: number) => pad.t + innerH - (v / maxY) * innerH;

  const paths = seriesKeys.map((key, si) => {
    const pts = display.map((p, i) => ({
      x: xAt(i),
      y: yAt(p.values[key] || 0),
    }));
    return {
      key,
      color: CHART_COLORS[si % CHART_COLORS.length],
      d: smoothLinePath(pts),
      pts,
    };
  });

  const labelStep = Math.max(1, Math.ceil(display.length / 6));
  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const t = i / tickCount;
    return { t, value: Math.round(maxY * t) };
  });
  const hi = hover != null ? display[hover] : null;

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl border border-white/[0.07] bg-[#060b18]/80 overflow-hidden">
        <div className="absolute top-0 left-1/3 w-1/3 h-16 bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative p-2 sm:p-3">
          <svg
            viewBox={`0 0 ${w} ${h}`}
            className="w-full h-auto select-none"
            style={{ minHeight: 200 }}
            preserveAspectRatio="xMidYMid meet"
            onMouseLeave={() => setHover(null)}
          >
            {yTicks.map((tick) => {
              const y = pad.t + innerH - tick.t * innerH;
              return (
                <g key={tick.value}>
                  <line
                    x1={pad.l}
                    x2={w - pad.r}
                    y1={y}
                    y2={y}
                    stroke="rgba(148,163,184,0.08)"
                    strokeWidth="1"
                  />
                  <text
                    x={pad.l - 6}
                    y={y + 3}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="9"
                  >
                    {tick.value}
                  </text>
                </g>
              );
            })}

            {display.map((p, i) =>
              i % labelStep === 0 || i === display.length - 1 ? (
                <text
                  key={p.date}
                  x={xAt(i)}
                  y={h - 10}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="9"
                >
                  {formatDayLabel(p.date)}
                </text>
              ) : null
            )}

            {paths.map((path) => (
              <path
                key={path.key}
                d={path.d}
                fill="none"
                stroke={path.color}
                strokeWidth="2.2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}

            {/* hover hit areas */}
            {display.map((_, i) => (
              <rect
                key={i}
                x={xAt(i) - Math.max(innerW / display.length / 2, 6)}
                y={pad.t}
                width={Math.max(innerW / display.length, 12)}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            ))}

            {hover != null && (
              <line
                x1={xAt(hover)}
                x2={xAt(hover)}
                y1={pad.t}
                y2={pad.t + innerH}
                stroke="rgba(165,180,252,0.35)"
                strokeWidth="1"
                strokeDasharray="3 3"
                pointerEvents="none"
              />
            )}

            {hover != null &&
              paths.map((path) => {
                const pt = path.pts[hover];
                if (!pt) return null;
                return (
                  <circle
                    key={path.key}
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    fill={path.color}
                    stroke="#0b1224"
                    strokeWidth="1.5"
                    pointerEvents="none"
                  />
                );
              })}
          </svg>

          {hi && (
            <div
              className="pointer-events-none absolute z-10 max-w-[220px] rounded-xl border border-white/15 bg-[#0b1224]/95 backdrop-blur-xl px-3 py-2 shadow-xl"
              style={{
                top: 10,
                left: hover != null && xAt(hover) / w > 0.55 ? 12 : undefined,
                right: hover != null && xAt(hover) / w > 0.55 ? undefined : 12,
              }}
            >
              <p className="text-[10px] text-slate-400 mb-1.5">
                {formatFullDate(hi.date)}
                {mode === "cumulative" ? " · yig‘indi" : ""}
              </p>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {seriesKeys.map((k, i) => (
                  <div
                    key={k}
                    className="flex items-center justify-between gap-3 text-[11px]"
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          background: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                      <span className="text-slate-300 truncate">{k}</span>
                    </span>
                    <span className="font-semibold text-white tabular-nums shrink-0">
                      {hi.values[k] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
        {seriesKeys.map((k, i) => (
          <span
            key={k}
            className="inline-flex items-center gap-1.5 text-[10px] text-slate-400"
          >
            <span
              className="w-2.5 h-0.5 rounded"
              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            {k.length > 22 ? k.slice(0, 20) + "…" : k}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Dimension card: dual view + filters ───────────────────── */

function DimensionCard({
  dim,
  icon: Icon,
  color,
}: {
  dim: DimensionData;
  icon: ComponentType<{ className?: string }>;
  color: string;
}) {
  const [view, setView] = useState<"bars" | "line">("bars");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [range, setRange] = useState<RangeKey>("all");
  const [lineMode, setLineMode] = useState<TimelineMode>("daily");

  const items = dim.items || [];
  const hasAvg = items.some((i) => i.average != null);
  const timeline = dim.timeline;
  const allSeriesKeys = useMemo(() => {
    if (timeline?.series_keys?.length) return timeline.series_keys;
    return items.filter((i) => i.key !== "_other").map((i) => i.label);
  }, [timeline, items]);

  const searchLower = search.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (i.key === "_other" && searchLower) return false;
      if (searchLower && !i.label.toLowerCase().includes(searchLower)) return false;
      if (selected && !selected.has(i.label) && i.key !== "_other") return false;
      return true;
    });
  }, [items, searchLower, selected]);

  const activeSeries = useMemo(() => {
    let keys = allSeriesKeys;
    if (searchLower) {
      keys = keys.filter((k) => k.toLowerCase().includes(searchLower));
    }
    if (selected) {
      keys = keys.filter((k) => selected.has(k));
    }
    return keys;
  }, [allSeriesKeys, searchLower, selected]);

  const toggleSeries = (label: string) => {
    setSelected((prev) => {
      const base = prev ?? new Set(allSeriesKeys);
      const next = new Set(base);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      if (next.size === 0) return new Set(); // empty = nothing shown
      if (next.size === allSeriesKeys.length) return null; // all = null
      return next;
    });
  };

  const selectAll = () => setSelected(null);
  const selectNone = () => setSelected(new Set());

  const isSelected = (label: string) =>
    selected === null ? true : selected.has(label);

  return (
    <div className="glass rounded-2xl border border-white/[0.06] p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 ${color}`}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white">{dim.label}</h3>
            <p className="text-[10px] text-slate-500">
              {items.filter((i) => i.key !== "_other").length} ta qiymat
              {hasAvg ? " · o'rtacha ball" : ""}
            </p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex p-0.5 rounded-lg bg-black/30 border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setView("bars")}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
              view === "bars"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
            title="Ustun / gorizontal"
          >
            <BarChart2 className="w-3 h-3" />
            Joriy
          </button>
          <button
            type="button"
            onClick={() => setView("line")}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
              view === "line"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
            title="Line chart"
          >
            <LineChartIcon className="w-3 h-3" />
            Line
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`${dim.label} bo'yicha qidirish…`}
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-black/30 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40"
          />
        </div>

        {view === "line" && (
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "daily" as const, label: "Kunlik" },
                { id: "cumulative" as const, label: "Yig‘indi" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setLineMode(m.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                  lineMode === m.id
                    ? "bg-indigo-600 text-white"
                    : "bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                {m.label}
              </button>
            ))}
            <span className="w-px h-5 bg-white/10 self-center mx-0.5" />
            {(
              [
                { id: "7" as const, label: "7k" },
                { id: "14" as const, label: "14k" },
                { id: "30" as const, label: "30k" },
                { id: "all" as const, label: "Hammasi" },
              ] as const
            ).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                  range === r.id
                    ? "bg-cyan-600/80 text-white"
                    : "bg-white/[0.03] border border-white/10 text-slate-500 hover:text-slate-300"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        {/* Series multi-select chips */}
        {allSeriesKeys.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-slate-500 font-medium">
                Qiymatlar filtri
                {selected !== null && (
                  <span className="text-slate-600">
                    {" "}
                    · {selected.size}/{allSeriesKeys.length}
                  </span>
                )}
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[10px] text-indigo-300/80 hover:text-indigo-200 px-1.5 py-0.5"
                >
                  Hammasi
                </button>
                <button
                  type="button"
                  onClick={selectNone}
                  className="text-[10px] text-slate-500 hover:text-slate-300 px-1.5 py-0.5"
                >
                  Tozalash
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-0.5">
              {allSeriesKeys
                .filter(
                  (k) =>
                    !searchLower || k.toLowerCase().includes(searchLower)
                )
                .map((k, i) => {
                  const on = isSelected(k);
                  const colorIdx = allSeriesKeys.indexOf(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => toggleSeries(k)}
                      className={`inline-flex items-center gap-1 max-w-full px-2 py-1 rounded-lg text-[10px] border transition-all ${
                        on
                          ? "border-white/20 bg-white/[0.07] text-slate-200"
                          : "border-white/5 bg-transparent text-slate-600 opacity-60"
                      }`}
                      title={k}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          background: on
                            ? CHART_COLORS[colorIdx % CHART_COLORS.length]
                            : "#475569",
                        }}
                      />
                      <span className="truncate">
                        {k.length > 28 ? k.slice(0, 26) + "…" : k}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {items.length === 0 && !timeline?.points?.length ? (
        <p className="text-xs text-slate-600 py-4 text-center">
          Bu kesimda ma&apos;lumot yo&apos;q
          <span className="block text-[10px] mt-1 text-slate-700">
            (eski javoblarda meta bo&apos;lmasligi mumkin — yangi topshirishlar yig&apos;iladi)
          </span>
        </p>
      ) : view === "bars" ? (
        <>
          {filteredItems.length === 0 ? (
            <p className="text-xs text-slate-600 py-4 text-center">
              Filter bo&apos;yicha natija yo&apos;q
            </p>
          ) : (
            <HorizontalBars items={filteredItems} maxBars={20} />
          )}
          {hasAvg && filteredItems.some((i) => i.average != null) && (
            <div className="pt-2 border-t border-white/[0.05] space-y-1.5">
              <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                O&apos;rtacha (rating/NPS/likert)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {filteredItems
                  .filter((i) => i.average != null && i.key !== "_other")
                  .map((i) => (
                    <span
                      key={i.key}
                      className="text-[10px] px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300"
                      title={i.label}
                    >
                      <span className="text-slate-500">
                        {i.label.length > 18
                          ? i.label.slice(0, 16) + "…"
                          : i.label}
                        :{" "}
                      </span>
                      <span className="font-semibold text-cyan-300">
                        {i.average}
                      </span>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <MultiSeriesLineChart
          seriesKeys={activeSeries}
          points={timeline?.points || []}
          range={range}
          mode={lineMode}
        />
      )}
    </div>
  );
}

function HorizontalBars({
  items,
  maxBars = 12,
}: {
  items: { label: string; value: number; pct: number }[];
  maxBars?: number;
}) {
  const slice = items.slice(0, maxBars);
  const maxV = Math.max(...slice.map((i) => i.value), 1);
  if (!slice.length) {
    return <p className="text-xs text-slate-600 py-4 text-center">Ma&apos;lumot yo&apos;q</p>;
  }
  return (
    <div className="space-y-2.5">
      {slice.map((item, i) => (
        <div key={item.label + i}>
          <div className="flex justify-between text-[11px] mb-1 gap-2">
            <span className="text-slate-300 truncate max-w-[70%]" title={item.label}>
              {item.label}
            </span>
            <span className="text-slate-500 tabular-nums shrink-0">
              {item.value} · {item.pct}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(2, (item.value / maxV) * 100)}%`,
                background: `linear-gradient(90deg, ${CHART_COLORS[i % CHART_COLORS.length]}, ${CHART_COLORS[(i + 1) % CHART_COLORS.length]}88)`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function VerticalBars({
  items,
}: {
  items: { label: string; value: number; pct: number }[];
}) {
  const maxV = Math.max(...items.map((i) => i.value), 1);
  if (!items.length) {
    return <p className="text-xs text-slate-600 py-4 text-center">Ma&apos;lumot yo&apos;q</p>;
  }
  return (
    <div className="flex items-end gap-1.5 sm:gap-2 h-40 px-1">
      {items.map((item, i) => (
        <div key={item.label} className="flex-1 flex flex-col items-center gap-1 min-w-0 h-full justify-end">
          <span className="text-[10px] text-slate-400 tabular-nums">{item.value}</span>
          <div
            className="w-full max-w-[36px] rounded-t-lg transition-all duration-500"
            style={{
              height: `${Math.max(4, (item.value / maxV) * 100)}%`,
              background: CHART_COLORS[i % CHART_COLORS.length],
              boxShadow: `0 0 12px ${CHART_COLORS[i % CHART_COLORS.length]}44`,
            }}
            title={`${item.label}: ${item.value} (${item.pct}%)`}
          />
          <span className="text-[9px] text-slate-500 truncate w-full text-center" title={item.label}>
            {item.label.length > 6 ? item.label.slice(0, 5) + "…" : item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function Donut({
  items,
  size = 140,
}: {
  items: { label: string; value: number; pct: number }[];
  size?: number;
}) {
  const total = items.reduce((a, i) => a + i.value, 0) || 1;
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  if (!items.length) {
    return <p className="text-xs text-slate-600 py-4 text-center">Ma&apos;lumot yo&apos;q</p>;
  }
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg width={size} height={size} viewBox="0 0 140 140" className="shrink-0">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="16" />
        {items.map((item, i) => {
          const len = (item.value / total) * c;
          const el = (
            <circle
              key={i}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth="16"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
        <text x="70" y="68" textAnchor="middle" fill="#e2e8f0" fontSize="18" fontWeight="700">
          {total}
        </text>
        <text x="70" y="84" textAnchor="middle" fill="#64748b" fontSize="9">
          jami
        </text>
      </svg>
      <div className="space-y-1.5 flex-1 min-w-0">
        {items.slice(0, 8).map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="text-slate-300 truncate flex-1">{item.label}</span>
            <span className="text-slate-500 tabular-nums">{item.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminResultsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, isReady } = useRoleGuard(["staff"]);
  const canView = ["admin", "superadmin", "audit_inspector"].includes(user?.role ?? "");
  const [chartMode, setChartMode] = useState<"bar" | "hbar" | "donut">("hbar");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { data: results, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["survey-results-dashboard", id],
    queryFn: async () => unwrapData<SurveyResults>(await surveysApi.results(id)),
    enabled: isReady && canView && !!id,
    staleTime: 10_000,
  });

  const handleExportExcel = async () => {
    if (!id || exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const res = await surveysApi.resultsExport(id);
      const blob = res.data as Blob;
      // Backend xato JSON qaytarsa blob ichida bo'lishi mumkin
      if (blob.type && blob.type.includes("application/json")) {
        const text = await blob.text();
        let msg = "Eksport muvaffaqiyatsiz";
        try {
          const j = JSON.parse(text);
          msg = j.detail || j.message || msg;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const name = filenameFromDisposition(
        res.headers?.["content-disposition"] as string | undefined,
        `natijalar_${id.slice(0, 8)}.xlsx`
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name.endsWith(".xlsx") ? name : `${name}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Excel yuklab bo'lmadi";
      setExportError(msg);
    } finally {
      setExporting(false);
    }
  };

  const kpis = useMemo(() => {
    if (!results) return [];
    return [
      {
        label: "Javoblar",
        value: results.response_count,
        icon: MessageSquare,
        color: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20",
      },
      {
        label: "Topshirgan",
        value: results.participation_submitted,
        icon: Users,
        color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
      },
      {
        label: "Boshlagan",
        value: results.participation_started ?? 0,
        icon: TrendingUp,
        color: "text-amber-300 bg-amber-500/10 border-amber-500/20",
      },
      {
        label: "Savollar",
        value: results.question_count ?? results.questions?.length ?? 0,
        icon: HelpCircle,
        color: "text-indigo-300 bg-indigo-500/10 border-indigo-500/20",
      },
    ];
  }, [results]);

  if (!isReady || !user) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-slate-400">
        Ruxsat yo&apos;q
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/results"
            className="text-xs text-slate-500 hover:text-cyan-400 flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Natijalar ro&apos;yxati
          </Link>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            {results?.title || "Natijalar dashboard"}
          </h1>
          {results && (
            <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
              <span className="px-2 py-0.5 rounded-full border border-white/10 text-slate-400">
                {results.status || "—"}
              </span>
              <span className="px-2 py-0.5 rounded-full border border-white/10 text-slate-400 flex items-center gap-1">
                {results.privacy_mode === "anonymous" ? (
                  <><EyeOff className="w-3 h-3" /> Anonim</>
                ) : (
                  <><Eye className="w-3 h-3" /> Ochiq</>
                )}
              </span>
              {results.track_participation === false && (
                <span className="px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-300">
                  Ishtirokchilar yopiq
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleExportExcel()}
            disabled={!results || exporting}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-semibold shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-colors"
            title="Barcha natijalarni himoyalangan Excel fayl sifatida yuklash"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {exporting ? "Tayyorlanmoqda…" : "Natijalarni olish"}
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <Link
            href={`/admin/surveys/${id}`}
            className="px-3 py-2 rounded-xl border border-white/10 text-xs text-slate-300 hover:bg-white/5"
          >
            So&apos;rovnoma
          </Link>
        </div>
      </div>

      {exportError && (
        <div className="flex items-center gap-2 text-red-400 text-sm glass rounded-xl p-3 border border-red-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {exportError}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm glass rounded-xl p-4 border border-red-500/20">
          <AlertCircle className="w-4 h-4" />
          Natijalarni yuklab bo&apos;lmadi
        </div>
      )}

      {results && (
        <>
          {/* Excel himoya eslatmasi */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 flex gap-3 items-start">
            <ShieldCheck className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
            <div className="min-w-0 text-[11px] text-slate-400 leading-relaxed">
              <p className="text-emerald-200/90 font-semibold text-xs mb-0.5">
                Excel eksport himoyasi
              </p>
              <p>
                Yuklab olingan faylda varaqlar parol bilan himoyalangan va{" "}
                <span className="text-slate-300">HMAC-SHA256 muhr</span> bor.
                Tahrir qilinsa muhr buziladi — fayl rasmiy manba sifatida yaroqsiz.
                Mahalliy Excel fayl o&apos;zini o&apos;zi yo&apos;q qila olmaydi;
                kafolat kriptografik tekshiruv orqali beriladi.
              </p>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map((k) => (
              <div
                key={k.label}
                className={`rounded-2xl border p-4 flex items-center gap-3 ${k.color}`}
              >
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${k.color}`}>
                  <k.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-white">{k.value}</p>
                  <p className="text-[11px] opacity-70">{k.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Timeline line chart */}
          <div className="glass rounded-2xl border border-white/[0.06] p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Javoblar dinamikasi</h2>
                  <p className="text-[11px] text-slate-500">
                    Kun bo&apos;yicha topshirilgan javoblar (line chart)
                  </p>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full border border-white/10 text-slate-400 tabular-nums self-start">
                {(results.timeline || []).length} kunlik nuqta · {results.response_count} jami
              </span>
            </div>
            <LineChart data={results.timeline || []} />
          </div>

          {/* Dimensions: fakultet, kurs, jins, guruh — dual view + filters */}
          {results.dimensions && Object.keys(results.dimensions).length > 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Kesimlar bo&apos;yicha tahlil</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Fakultet, kurs, jins va guruh — joriy (ustun) yoki line chart.
                  Har bir kesimda qidiruv, qiymat filtri va vaqt oralig&apos;i bor.
                  Shaxs bog&apos;lanishi yo&apos;q (anonim meta snapshot).
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {(
                  [
                    { key: "faculty", icon: Building2, color: "text-indigo-300" },
                    { key: "study_year", icon: GraduationCap, color: "text-amber-300" },
                    { key: "gender", icon: UserRound, color: "text-pink-300" },
                    { key: "group", icon: UsersRound, color: "text-cyan-300" },
                  ] as const
                ).map(({ key, icon, color }) => {
                  const dim = results.dimensions?.[key];
                  if (!dim) return null;
                  return (
                    <DimensionCard
                      key={key}
                      dim={dim as DimensionData}
                      icon={icon}
                      color={color}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Chart mode switch */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-white">Savollar bo&apos;yicha taqsimot</h2>
            <div className="flex p-0.5 rounded-xl bg-black/30 border border-white/10">
              {(
                [
                  { id: "hbar" as const, label: "Gorizontal" },
                  { id: "bar" as const, label: "Ustun" },
                  { id: "donut" as const, label: "Donut" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setChartMode(m.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    chartMode === m.id
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Questions */}
          <div className="grid gap-4">
            {(results.questions || []).map((q, qi) => {
              const items =
                q.distribution_labeled?.length
                  ? q.distribution_labeled
                  : Object.entries(q.distribution || {})
                      .filter(([k]) => !k.startsWith("_"))
                      .map(([key, value]) => ({
                        key,
                        label: key,
                        value,
                        pct: q.count ? Math.round((value / q.count) * 1000) / 10 : 0,
                      }));

              return (
                <div
                  key={q.question_id}
                  className="glass rounded-2xl border border-white/[0.06] p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-indigo-300/70 font-semibold mb-1">
                        Savol {qi + 1} · {Q_TYPE_LABEL[q.q_type] || q.q_type}
                        {q.average != null ? ` · o'rtacha ${q.average}` : ""}
                      </p>
                      <p className="text-sm font-semibold text-white leading-snug">{q.text}</p>
                    </div>
                    <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                      n = {q.count}
                    </span>
                  </div>

                  {chartMode === "hbar" && <HorizontalBars items={items} />}
                  {chartMode === "bar" && <VerticalBars items={items} />}
                  {chartMode === "donut" && <Donut items={items} />}
                </div>
              );
            })}
          </div>

          {results.response_count === 0 && (
            <p className="text-center text-sm text-slate-500 py-8">
              Hali javob yo&apos;q — nashr qilingan so&apos;rovnomaga ishtirokchilar javob bersin.
            </p>
          )}
        </>
      )}
    </div>
  );
}
