"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3, Search, ChevronRight, Loader2, AlertCircle,
  EyeOff, Eye, ClipboardList,
} from "lucide-react";
import { surveysApi } from "@/lib/api";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import type { Survey } from "@/types";

function unwrapList(res: { data?: unknown }): Survey[] {
  const payload = (res as { data?: { data?: unknown } }).data;
  const inner = (payload as { data?: unknown })?.data ?? payload;
  if (Array.isArray(inner)) return inner as Survey[];
  return [];
}

const STATUS: Record<string, { label: string; cls: string }> = {
  draft:     { label: "Qoralama", cls: "bg-slate-500/15 text-slate-300 border-slate-500/25" },
  published: { label: "Nashr",    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" },
  closed:    { label: "Yopilgan", cls: "bg-amber-500/15 text-amber-300 border-amber-500/25" },
  archived:  { label: "Arxiv",    cls: "bg-rose-500/15 text-rose-300 border-rose-500/25" },
};

export default function AdminResultsListPage() {
  const { user, isReady } = useRoleGuard(["staff"]);
  const canView = ["admin", "superadmin", "audit_inspector"].includes(user?.role ?? "");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-surveys-results-list", statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      return unwrapList(await surveysApi.list(params));
    },
    enabled: isReady && canView,
    staleTime: 15_000,
  });

  const surveys = useMemo(() => {
    const list = data ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q)
    );
  }, [data, search]);

  const totals = useMemo(() => {
    const list = data ?? [];
    return {
      surveys: list.length,
      responses: list.reduce((a, s) => a + (s.response_count ?? 0), 0),
      published: list.filter((s) => s.status === "published").length,
    };
  }, [data]);

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
        Bu bo&apos;limga ruxsat yo&apos;q.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Natijalar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Barcha so&apos;rovnomalar — tanlang va dashboard orqali tahlil qiling
          </p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "So'rovnomalar", value: totals.surveys, color: "text-indigo-300" },
          { label: "Nashr etilgan", value: totals.published, color: "text-emerald-300" },
          { label: "Jami javoblar", value: totals.responses, color: "text-cyan-300" },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
          >
            <p className="text-[11px] text-slate-500 uppercase tracking-wide">{k.label}</p>
            <p className={`text-2xl font-extrabold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Qidirish..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300"
        >
          <option value="all">Barcha holat</option>
          <option value="published">Nashr</option>
          <option value="closed">Yopilgan</option>
          <option value="draft">Qoralama</option>
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm glass rounded-xl p-4 border border-red-500/20">
          <AlertCircle className="w-4 h-4" />
          Yuklashda xatolik
          <button type="button" onClick={() => refetch()} className="text-indigo-400 text-xs ml-2">
            Qayta
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className={`w-8 h-8 text-indigo-400 animate-spin ${isFetching ? "" : ""}`} />
        </div>
      ) : surveys.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center border border-white/[0.06]">
          <ClipboardList className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">So&apos;rovnoma topilmadi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {surveys.map((s) => {
            const st = STATUS[s.status] || STATUS.draft;
            return (
              <Link
                key={s.id}
                href={`/admin/results/${s.id}`}
                className="glass rounded-2xl border border-white/[0.06] p-4 flex items-center gap-4 hover:border-cyan-500/30 transition-colors group"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5 text-cyan-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-white truncate group-hover:text-cyan-200">
                      {s.title}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${st.cls}`}>
                      {st.label}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-slate-400 flex items-center gap-1">
                      {s.privacy_mode === "anonymous" ? (
                        <><EyeOff className="w-3 h-3" /> Anonim</>
                      ) : (
                        <><Eye className="w-3 h-3" /> Ochiq</>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>{s.question_count ?? 0} savol</span>
                    <span className="text-cyan-400/90 font-medium">
                      {s.response_count ?? 0} javob
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-300 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
