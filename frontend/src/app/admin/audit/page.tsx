"use client";
import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { auditApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import {
  Shield, ChevronLeft, ChevronRight, RefreshCw,
  CheckCircle, XCircle, Filter, X,
} from "lucide-react";

type AuditEntry = {
  id: number;
  action: string;
  actor_email: string;
  actor_name: string;
  target_email: string;
  target_name: string;
  success: boolean;
  ip_address: string | null;
  user_agent: string;
  extra: Record<string, unknown>;
  created_at: string;
};

type AuditMeta = { total: number; page: number; page_size: number };
type AuditResponse = { data: AuditEntry[]; meta: AuditMeta };

const ACTION_LABELS: Record<string, string> = {
  login_ok:        "Login (muvaffaqiyatli)",
  login_fail:      "Login (muvaffaqiyatsiz)",
  logout:          "Chiqish",
  user_create:     "Foydalanuvchi yaratildi",
  user_update:     "Foydalanuvchi yangilandi",
  user_deactivate: "Foydalanuvchi bloklandi",
  user_activate:   "Foydalanuvchi faollashtirildi",
  role_change:     "Rol o'zgartirildi",
  pwd_reset:       "Parol tiklash",
  hemis_sync:      "HEMIS sinxronlash",
};

const ACTION_COLORS: Record<string, string> = {
  login_ok:        "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  login_fail:      "bg-red-500/15 text-red-300 border-red-500/25",
  logout:          "bg-slate-500/15 text-slate-300 border-slate-500/25",
  user_create:     "bg-blue-500/15 text-blue-300 border-blue-500/25",
  user_update:     "bg-amber-500/15 text-amber-300 border-amber-500/25",
  user_deactivate: "bg-red-500/15 text-red-300 border-red-500/25",
  user_activate:   "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  role_change:     "bg-purple-500/15 text-purple-300 border-purple-500/25",
  pwd_reset:       "bg-orange-500/15 text-orange-300 border-orange-500/25",
  hemis_sync:      "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
};

function fmt(dt: string) {
  return new Date(dt).toLocaleString("uz-UZ", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function AuditPage() {
  const { user } = useAuthStore();
  const role = user?.role ?? "";
  const isAllowed = ["admin", "superadmin", "audit_inspector"].includes(role);

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  // local filter draft
  const [draft, setDraft] = useState({ action: "", success: "", date_from: "", date_to: "" });

  const params: Record<string, string> = { page: String(page), ...filters };

  const { data, isLoading, isFetching, refetch } = useQuery<AuditResponse>({
    queryKey: ["audit", params],
    queryFn: () => auditApi.list(params).then((r) => r.data.data),
    enabled: isAllowed,
    staleTime: 30_000,
  });

  const applyFilters = useCallback(() => {
    const f: Record<string, string> = {};
    if (draft.action)    f.action    = draft.action;
    if (draft.success)   f.success   = draft.success;
    if (draft.date_from) f.date_from = `${draft.date_from}T00:00:00`;
    if (draft.date_to)   f.date_to   = `${draft.date_to}T23:59:59`;
    setFilters(f);
    setPage(1);
    setShowFilters(false);
  }, [draft]);

  const clearFilters = useCallback(() => {
    setDraft({ action: "", success: "", date_from: "", date_to: "" });
    setFilters({});
    setPage(1);
  }, []);

  const totalPages = data ? Math.ceil(data.meta.total / (data.meta.page_size || 50)) : 1;
  const activeFilterCount = Object.keys(filters).length;

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="w-12 h-12 text-slate-600" />
        <p className="text-slate-400 text-sm">Ruxsat yo&apos;q</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            Audit loglar
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {data ? `Jami ${data.meta.total} ta yozuv` : "Yuklanmoqda…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400 border border-red-500/25 hover:bg-red-500/10 transition-colors"
            >
              <X className="w-3 h-3" /> Filtrni tozalash ({activeFilterCount})
            </button>
          )}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              showFilters
                ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                : "text-slate-300 border-white/10 hover:bg-white/5"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtr
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-300 border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Yangilash
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Amal turi</label>
            <select
              value={draft.action}
              onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))}
              className="bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
            >
              <option value="">Barchasi</option>
              {Object.entries(ACTION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Natija</label>
            <select
              value={draft.success}
              onChange={(e) => setDraft((d) => ({ ...d, success: e.target.value }))}
              className="bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
            >
              <option value="">Barchasi</option>
              <option value="true">Muvaffaqiyatli</option>
              <option value="false">Muvaffaqiyatsiz</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Sana (dan)</label>
            <input
              type="date"
              value={draft.date_from}
              onChange={(e) => setDraft((d) => ({ ...d, date_from: e.target.value }))}
              className="bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Sana (gacha)</label>
            <input
              type="date"
              value={draft.date_to}
              onChange={(e) => setDraft((d) => ({ ...d, date_to: e.target.value }))}
              className="bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-1">
            <button
              onClick={() => setShowFilters(false)}
              className="px-4 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
            >
              Bekor
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-1.5 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Qo&apos;llash
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data?.data.length ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
            <Shield className="w-8 h-8 opacity-40" />
            <p className="text-sm">Yozuvlar topilmadi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 whitespace-nowrap">Vaqt</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Amal</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Kim tomonidan</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Nima ustida</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">IP</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-400">Natija</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {data.data.map((entry) => (
                  <>
                    <tr
                      key={entry.id}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                      onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                    >
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap font-mono text-xs">
                        {fmt(entry.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${ACTION_COLORS[entry.action] ?? "bg-slate-500/15 text-slate-300 border-slate-500/25"}`}>
                          {ACTION_LABELS[entry.action] ?? entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white text-xs font-medium">{entry.actor_name || "—"}</div>
                        <div className="text-slate-500 text-xs">{entry.actor_email || "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white text-xs font-medium">{entry.target_name || "—"}</div>
                        <div className="text-slate-500 text-xs">{entry.target_email || "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">
                        {entry.ip_address ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {entry.success ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400 inline-block" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 inline-block" />
                        )}
                      </td>
                    </tr>
                    {expanded === entry.id && (
                      <tr key={`${entry.id}-detail`} className="bg-white/[0.02]">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="space-y-2">
                            {entry.user_agent && (
                              <div>
                                <span className="text-xs text-slate-500">User-Agent: </span>
                                <span className="text-xs text-slate-300 break-all">{entry.user_agent}</span>
                              </div>
                            )}
                            {Object.keys(entry.extra).length > 0 && (
                              <div>
                                <span className="text-xs text-slate-500 block mb-1">Qo&apos;shimcha ma&apos;lumot:</span>
                                <pre className="text-xs text-slate-300 bg-black/30 rounded-lg p-3 overflow-x-auto">
                                  {JSON.stringify(entry.extra, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {page}-sahifa / {totalPages}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isFetching}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                    p === page
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isFetching}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
