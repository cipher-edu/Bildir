"use client";
import { useQuery } from "@tanstack/react-query";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { adminApi } from "@/lib/api";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/roles";
import { UserRole } from "@/types";
import { Users, UserCheck, UserX, Shield, TrendingUp } from "lucide-react";

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div className="glass rounded-2xl p-5 flex items-center gap-4 border border-white/[0.06]">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-white">{value}</p>
        <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
        {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
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

export default function AdminDashboard() {
  const { user } = useRoleGuard(["staff"]);

  const { data: statsData, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminApi.stats(),
    staleTime: 30_000,
    retry: false,
  });

  if (!user) return null;

  const stats = statsData?.data?.data ?? statsData?.data;
  const userStats  = stats?.users ?? null;
  const byRole: Record<string, number> = stats?.users?.by_role ?? {};

  const role      = user.role as UserRole;
  const roleColor = ROLE_COLORS[role] ?? "#6366f1";
  const roleLabel = ROLE_LABELS[role] ?? role;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div className="glass rounded-2xl p-6 border border-white/[0.06]">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
            style={{
              background: `linear-gradient(135deg, ${roleColor}55, ${roleColor}22)`,
              border: `1px solid ${roleColor}33`,
            }}
          >
            {(user.first_name?.[0] || user.email[0]).toUpperCase()}
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: roleColor }}>Xush kelibsiz</p>
            <h1 className="text-xl font-bold text-white">
              {user.full_name || `${user.first_name} ${user.last_name}`.trim() || user.email}
            </h1>
            <p className="text-sm text-slate-400">{roleLabel} · {user.university_name || "hemis-auth"}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl h-24 skeleton border border-white/[0.06]" />
          ))}
        </div>
      ) : userStats ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Jami foydalanuvchi"
            value={userStats.total ?? 0}
            icon={Users}
            color="text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
          />
          <StatCard
            label="Faol"
            value={userStats.active ?? 0}
            icon={UserCheck}
            color="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
            sub={userStats.total ? `${Math.round((userStats.active / userStats.total) * 100)}%` : undefined}
          />
          <StatCard
            label="Nofaol"
            value={userStats.inactive ?? 0}
            icon={UserX}
            color="text-red-400 bg-red-500/10 border-red-500/20"
          />
        </div>
      ) : null}

      {/* Role breakdown */}
      {Object.keys(byRole).length > 0 && (
        <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">Rollar bo'yicha taqsimot</h2>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {Object.entries(byRole).map(([r, count]) => {
              const pct = userStats?.total ? Math.round((count / userStats.total) * 100) : 0;
              const badge = ROLE_BADGE_COLORS[r] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20";
              return (
                <div key={r} className="px-5 py-3 flex items-center gap-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0 ${badge}`}>
                    {ROLE_LABELS[r as UserRole] ?? r}
                  </span>
                  <div className="flex-1 bg-white/[0.04] rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-indigo-500/60 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-white w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="glass rounded-2xl border border-white/[0.06] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-white">Tizim haqida</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Backend: <span className="text-slate-300">Django 5.1 + SimpleJWT</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            Frontend: <span className="text-slate-300">Next.js 15 + Zustand</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            Auth: <span className="text-slate-300">JWT HS256 / OAuth2 HEMIS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            DB: <span className="text-slate-300">SQLite (dev) / PostgreSQL (prod)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
