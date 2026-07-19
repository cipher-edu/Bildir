"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { adminApi, auditApi, surveysApi, complianceApi } from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/roles";
import { UserRole } from "@/types";
import { 
  Users, UserCheck, UserX, Shield, TrendingUp, Activity, 
  Terminal, ArrowUpRight, Database, Cpu, History, 
  ClipboardList, RefreshCw, LayoutGrid, AlertTriangle, Loader2
} from "lucide-react";
import Link from "next/link";

function unwrapList<T>(res: { data?: unknown }): T[] {
  const payload = (res as { data?: { data?: unknown } }).data;
  const inner = (payload as { data?: unknown })?.data ?? payload;
  if (Array.isArray(inner)) return inner as T[];
  return [];
}

function StatCard({ label, value, icon: Icon, color, sub, glow }: {
  label: string; value: string | number; icon: React.ElementType; color: string; sub?: string; glow?: string;
}) {
  return (
    <div className="glass rounded-2xl p-5 flex items-center gap-4 border border-white/[0.06] hover:border-white/10 transition-all relative overflow-hidden group">
      <div 
        className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none"
        style={{ background: glow || "rgba(255,255,255,0.2)" }}
      />
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${color}`}>
        <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-white truncate">{value}</p>
        <p className="text-xs text-slate-500 uppercase tracking-wide truncate">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  student:         "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  teacher:         "bg-violet-500/10 text-violet-400 border-violet-500/20",
  methodist:       "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  department_head: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  proctor:         "bg-red-500/10 text-red-400 border-red-500/20",
  admin:           "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  superadmin:      "bg-rose-500/10 text-rose-400 border-rose-500/20",
  audit_inspector: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

const ACTION_LABELS: Record<string, string> = {
  login_ok:        "Login (Muvaffaqiyatli)",
  login_fail:      "Login (Muammoli)",
  logout:          "Tizimdan chiqish",
  user_create:     "Foydalanuvchi qo'shildi",
  user_update:     "Foydalanuvchi tahrirlandi",
  user_deactivate: "User bloklandi",
  user_activate:   "User faollashtirildi",
  role_change:     "Rol o'zgartirildi",
  pwd_reset:       "Parol yangilandi",
  hemis_sync:      "HEMIS sinxronizatsiya",
};

const ACTION_COLORS: Record<string, string> = {
  login_ok:        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  login_fail:      "bg-red-500/10 text-red-400 border-red-500/20",
  logout:          "bg-slate-500/10 text-slate-400 border-slate-500/20",
  user_create:     "bg-blue-500/10 text-blue-400 border-blue-500/20",
  user_update:     "bg-amber-500/10 text-amber-400 border-amber-500/20",
  user_deactivate: "bg-red-500/10 text-red-400 border-red-500/20",
  user_activate:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  role_change:     "bg-purple-500/10 text-purple-400 border-purple-500/20",
  pwd_reset:       "bg-orange-500/10 text-orange-400 border-orange-500/20",
  hemis_sync:      "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

export default function AdminDashboard() {
  const { user } = useRoleGuard(["staff"]);
  const { t } = useI18n();
  const [selectedAuditLog, setSelectedAuditLog] = useState<number | null>(null);

  // Stats query
  const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminApi.stats().then((r) => r.data?.data ?? r.data),
    staleTime: 30_000,
    retry: false,
  });

  const { data: kpi, refetch: refetchKpi } = useQuery({
    queryKey: ["compliance-kpi"],
    queryFn: async () => {
      const r = await complianceApi.kpi();
      const body = r.data as { data?: Record<string, number> };
      return body?.data ?? {};
    },
    staleTime: 30_000,
    retry: false,
  });

  // Recent audit query (last 5 entries)
  const { data: auditData, isLoading: isAuditLoading, refetch: refetchAudit } = useQuery({
    queryKey: ["admin-recent-audit"],
    queryFn: () => auditApi.list({ page_size: "5" }).then((r) => r.data.data),
    staleTime: 15_000,
    retry: false,
  });

  // Recent surveys query
  const { data: surveysData, isLoading: isSurveysLoading, refetch: refetchSurveys } = useQuery({
    queryKey: ["admin-recent-surveys"],
    queryFn: () => surveysApi.list().then((r) => unwrapList<any>(r)),
    staleTime: 30_000,
    retry: false,
  });

  if (!user) return null;

  const userStats = statsData?.users ?? null;
  const byRole: Record<string, number> = statsData?.users?.by_role ?? {};

  const role = user.role as UserRole;
  const roleColor = ROLE_COLORS[role] ?? "#6366f1";
  const roleLabel = ROLE_LABELS[role] ?? role;

  const handleRefreshAll = () => {
    refetchStats();
    refetchAudit();
    refetchSurveys();
    refetchKpi();
  };

  const auditLogs = auditData?.data ?? [];
  const surveysCount = surveysData?.length ?? 0;

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out_forwards]">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* KPI — email/Telegram yo'q, faqat panel */}
      <div>
        <h2 className="text-sm font-bold text-slate-300 mb-3">{t("admin.kpi.title")}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard
            label={t("admin.kpi.openAppeals")}
            value={kpi?.open_appeals ?? "—"}
            icon={ClipboardList}
            color="bg-amber-500/10 text-amber-400 border-amber-500/20"
          />
          <StatCard
            label={t("admin.kpi.lateAppeals")}
            value={kpi?.late_appeals ?? "—"}
            icon={AlertTriangle}
            color="bg-rose-500/10 text-rose-400 border-rose-500/20"
          />
          <StatCard
            label={t("admin.kpi.activeSurveys")}
            value={kpi?.active_surveys ?? "—"}
            icon={Activity}
            color="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
          />
          <StatCard
            label={t("admin.kpi.publishedNews")}
            value={kpi?.published_news ?? "—"}
            icon={LayoutGrid}
            color="bg-violet-500/10 text-violet-400 border-violet-500/20"
          />
          <StatCard
            label={t("admin.kpi.risksOpen")}
            value={kpi?.risks_open ?? "—"}
            icon={AlertTriangle}
            color="bg-orange-500/10 text-orange-400 border-orange-500/20"
          />
          <StatCard
            label={t("admin.kpi.whistleOpen")}
            value={kpi?.whistle_open ?? "—"}
            icon={Shield}
            color="bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
          />
        </div>
      </div>

      {/* Header Banner */}
      <div className="glass rounded-2xl p-6 border border-white/[0.06] relative overflow-hidden">
        <div 
          className="absolute -right-20 -top-20 w-56 h-56 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ background: roleColor }}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white border"
              style={{
                background: `linear-gradient(135deg, ${roleColor}35, ${roleColor}15)`,
                borderColor: `${roleColor}30`,
              }}
            >
              {(user.first_name?.[0] || user.email[0]).toUpperCase()}
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: roleColor }}>Xavfsiz Boshqaruv Tizimi</p>
              <h1 className="text-xl font-black text-white">
                {user.full_name || `${user.first_name} ${user.last_name}`.trim() || user.email}
              </h1>
              <p className="text-sm text-slate-400">{roleLabel} · {user.university_name || "Bildir"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRefreshAll}
            className="self-start sm:self-center flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-300 border border-white/10 hover:border-indigo-400/30 hover:bg-white/5 rounded-xl transition-all active:scale-95 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Ma&apos;lumotlarni yangilash
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isStatsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl h-24 skeleton border border-white/[0.06]" />
          ))
        ) : (
          <>
            <StatCard
              label="Jami foydalanuvchi"
              value={userStats?.total ?? 0}
              icon={Users}
              color="text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
              sub="Tizimda ro'yxatdan o'tganlar"
              glow="rgba(99,102,241,0.3)"
            />
            <StatCard
              label="Faol foydalanuvchilar"
              value={userStats?.active ?? 0}
              icon={UserCheck}
              color="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
              sub={userStats?.total ? `${Math.round((userStats.active / userStats.total) * 100)}% faollik nisbati` : "0% nisbat"}
              glow="rgba(16,185,129,0.3)"
            />
            <StatCard
              label="So'rovnomalar"
              value={surveysCount}
              icon={ClipboardList}
              color="text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
              sub="Faol va yakunlanganlar"
              glow="rgba(6,182,212,0.3)"
            />
            <StatCard
              label="Tizim Himoyasi"
              value="Faol"
              icon={Shield}
              color="text-rose-400 bg-rose-500/10 border-rose-500/20"
              sub="SSL & JWT xavfsizligi"
              glow="rgba(244,63,94,0.3)"
            />
          </>
        )}
      </div>

      {/* Bento breakdown section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Breakdown & System Specs (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Role Breakdown */}
          {Object.keys(byRole).length > 0 && (
            <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-sm font-bold text-white">Rollar bo&apos;yicha taqsimot</h2>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Ulushi %</span>
              </div>
              <div className="divide-y divide-white/[0.04] p-2">
                {Object.entries(byRole).map(([r, count]) => {
                  const pct = userStats?.total ? Math.round((count / userStats.total) * 100) : 0;
                  const badge = ROLE_BADGE_COLORS[r] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20";
                  return (
                    <div key={r} className="px-4 py-3 flex items-center gap-4 hover:bg-white/[0.01] rounded-xl transition-colors">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 min-w-[110px] text-center justify-center ${badge}`}>
                        {ROLE_LABELS[r as UserRole] ?? r}
                      </span>
                      <div className="flex-1 bg-white/[0.04] rounded-full h-2 overflow-hidden border border-white/[0.03]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-400 w-8 text-left">{pct}%</span>
                      <span className="text-sm font-extrabold text-white w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Management Tools */}
          <div className="glass rounded-2xl border border-white/[0.06] p-5">
            <div className="flex items-center gap-2 mb-4">
              <LayoutGrid className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">Tezkor boshqaruv havolalari</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Foydalanuvchilar ro'yxati", desc: "Tizim a'zolarini ko'rish va boshqarish", href: "/admin/users", badge: "A'zolar" },
                { label: "Audit monitoringi", desc: "Jonli tizim faoliyati loglari", href: "/admin/audit", badge: "Audit" },
                { label: "HEMIS integratsiyasi", desc: "SSO sinxronlash va statuslar", href: "/admin/hemis-sync", badge: "Sync" },
                { label: "So'rovnomalar boshqaruvi", desc: "Faol so'rovnomalarni ko'rish", href: "/admin/surveys", badge: "O'qish" },
              ].map((act) => (
                <Link
                  key={act.label}
                  href={act.href}
                  className="group flex flex-col justify-between p-4 rounded-xl border border-white/[0.06] bg-white/[0.01] hover:border-indigo-400/30 hover:bg-indigo-500/[0.04] transition-all duration-300"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-white group-hover:text-indigo-200 transition-colors">{act.label}</p>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                    <p className="text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors">{act.desc}</p>
                  </div>
                  <span className="self-start text-[9px] px-2 py-0.5 mt-2 rounded border border-white/10 bg-white/5 text-slate-400 group-hover:border-indigo-500/20 group-hover:bg-indigo-500/10 group-hover:text-indigo-300 transition-all font-semibold">
                    {act.badge}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Activity Audit logs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Live System Activity Card */}
          <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col h-full justify-between">
            <div>
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <h2 className="text-sm font-bold text-white">Jonli xavfsizlik faolligi</h2>
                </div>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>

              {isAuditLoading ? (
                <div className="p-10 text-center">
                  <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Loglar yuklanmoqda...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <History className="w-8 h-8 opacity-30 mx-auto" />
                  <p className="text-xs">Hozircha hech qanday amal amalga oshirilmadi</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {auditLogs.map((log: any) => {
                    const isSelected = selectedAuditLog === log.id;
                    const dateStr = new Date(log.created_at).toLocaleTimeString("uz-UZ", {
                      hour: "2-digit", minute: "2-digit", second: "2-digit"
                    });
                    return (
                      <div
                        key={log.id}
                        onClick={() => setSelectedAuditLog(isSelected ? null : log.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-white/[0.04] border-indigo-500/30 shadow-md"
                            : "bg-white/[0.01] border-transparent hover:border-white/[0.05] hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${ACTION_COLORS[log.action] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}>
                            {ACTION_LABELS[log.action] ?? log.action}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">{dateStr}</span>
                        </div>
                        <p className="text-[11px] font-bold text-white mt-1.5 truncate">
                          {log.actor_name || log.actor_email}
                        </p>
                        {log.ip_address && (
                          <p className="text-[9px] text-slate-600 font-mono mt-0.5">IP: {log.ip_address}</p>
                        )}
                        
                        {isSelected && (
                          <div className="mt-3 pt-2.5 border-t border-white/[0.04] text-[10px] space-y-1.5 animate-[fadeIn_0.3s_ease-out_forwards]">
                            <p className="text-slate-400"><strong className="text-slate-500 font-medium">Email:</strong> {log.actor_email || "—"}</p>
                            <p className="text-slate-400"><strong className="text-slate-500 font-medium">Nima ustida:</strong> {log.target_name || log.target_email || "—"}</p>
                            <p className="text-slate-400 break-all"><strong className="text-slate-500 font-medium">Agent:</strong> {log.user_agent}</p>
                            {Object.keys(log.extra || {}).length > 0 && (
                              <pre className="text-[8px] bg-black/40 text-slate-300 p-2 rounded overflow-x-auto mt-1 max-h-24 font-mono">
                                {JSON.stringify(log.extra, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/[0.05] bg-white/[0.01]">
              <Link
                href="/admin/audit"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-white/10 hover:border-indigo-400/30 hover:bg-white/5 text-xs text-slate-300 hover:text-white transition-all font-bold"
              >
                Barcha loglarni ko&apos;rish <History className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* System info diagnostics */}
      <div className="glass rounded-2xl border border-white/[0.06] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-white">Tizim holati diagnostikasi</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.01] space-y-1.5">
            <div className="flex items-center gap-2 text-slate-500">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Dastur yadrosi</span>
            </div>
            <p className="text-white font-extrabold">Django 5.1</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold inline-block">Online</span>
          </div>

          <div className="p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.01] space-y-1.5">
            <div className="flex items-center gap-2 text-slate-500">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ma&apos;lumotlar bazasi</span>
            </div>
            <p className="text-white font-extrabold">PostgreSQL</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold inline-block">Ulanish faol</span>
          </div>

          <div className="p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.01] space-y-1.5">
            <div className="flex items-center gap-2 text-slate-500">
              <Activity className="w-3.5 h-3.5 text-rose-400" />
              <span>Kesh tizimi</span>
            </div>
            <p className="text-white font-extrabold">Redis Cache</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold inline-block">Tezkor</span>
          </div>

          <div className="p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.01] space-y-1.5">
            <div className="flex items-center gap-2 text-slate-500">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>API Himoya</span>
            </div>
            <p className="text-white font-extrabold">SimpleJWT</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold inline-block">AES-256</span>
          </div>
        </div>
      </div>
    </div>
  );
}
