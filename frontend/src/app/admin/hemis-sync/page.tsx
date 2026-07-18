"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  RefreshCw, Play, CheckCircle, XCircle, Loader2,
  Database, Users, BookOpen, GraduationCap, Layers,
  Building2, Clock, AlertTriangle, Settings, History,
  ChevronDown, ChevronUp, Terminal, Wifi, WifiOff,
  RotateCcw, Info, Shield,
} from "lucide-react";
import { catalogSyncApi } from "@/lib/api";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useToast } from "@/components/ToastProvider";

interface SyncStats {
  universities: number; faculties: number;
  specialties: number; groups: number; subjects: number;
}

interface SyncStatus {
  sync_id?:     string;
  running?:     boolean;
  started_at?:  string;
  finished_at?: string;
  success?:     boolean;
  log?:         string;
  stats?:       SyncStats;
  options?: { mock?: boolean };
}

interface HistoryItem {
  sync_id: string; started_at: string; finished_at?: string;
  mock: boolean; success: boolean; stats?: SyncStats;
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("uz-UZ", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(start?: string, end?: string) {
  if (!start || !end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function LogTerminal({ log, running }: { log: string; running: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [log]);

  const lines = log ? log.split("\n").filter(Boolean) : [];

  return (
    <div ref={ref}
      className="bg-[#060810] border border-white/10 rounded-xl font-mono text-xs text-slate-300 h-64 overflow-y-auto p-4 space-y-0.5">
      {lines.length === 0 && running && (
        <div className="flex items-center gap-2 text-indigo-400 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
          Sinxronlash boshlandi, log kutilmoqda…
        </div>
      )}
      {lines.length === 0 && !running && <p className="text-slate-600 italic">Log yo'q.</p>}
      {lines.map((line, i) => {
        const isError   = /xato|error|failed/i.test(line);
        const isSuccess = /✓|yakunlandi|success/i.test(line);
        const isWarn    = /⚠|mock|warning/i.test(line);
        const isHead    = /─+|={3,}/.test(line);
        return (
          <div key={i} className={`leading-relaxed whitespace-pre-wrap break-all ${
            isError ? "text-red-400" : isSuccess ? "text-emerald-400" : isWarn ? "text-amber-400" : isHead ? "text-slate-500" : "text-slate-300"
          }`}>{line}</div>
        );
      })}
      {running && (
        <div className="flex items-center gap-1.5 text-indigo-400 mt-1">
          <Loader2 size={10} className="animate-spin" />
          <span className="animate-pulse">Jarayon davom etmoqda…</span>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  const colors: Record<string, string> = {
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    cyan:   "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    emerald:"text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber:  "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${colors[color]}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-xl font-bold text-white">{value.toLocaleString()}</div>
        <div className="text-xs opacity-70">{label}</div>
      </div>
    </div>
  );
}

const INIT_CONFIG = {
  university_code:  "NSPI",
  university_name:  "Nukus Davlat Pedagogika Instituti",
  mock:             true,
  sync_faculties:   true,
  sync_specialties: true,
  sync_groups:      true,
  sync_subjects:    true,
};

export default function AdminHemisSyncPage() {
  const { user } = useRoleGuard(["staff"]);
  const { showSuccess, showError } = useToast();

  const [config, setConfig]             = useState(INIT_CONFIG);
  const [activeSyncId, setActiveSyncId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus]     = useState<SyncStatus | null>(null);
  const [showConfig, setShowConfig]     = useState(true);
  const [showHistory, setShowHistory]   = useState(false);
  const [userSyncRole, setUserSyncRole] = useState("all");
  const [userSyncLimit, setUserSyncLimit] = useState(50);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ["hemis-stats"],
    queryFn: () => catalogSyncApi.stats(),
    refetchInterval: activeSyncId ? 5000 : false,
  });

  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ["hemis-history"],
    queryFn: () => catalogSyncApi.history(),
    enabled: showHistory,
  });

  const stats: SyncStats = statsData?.data?.data?.stats ?? { universities: 0, faculties: 0, specialties: 0, groups: 0, subjects: 0 };
  const history: HistoryItem[] = historyData?.data?.data ?? [];

  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  }, []);

  const pollStatus = useCallback(async (sid: string) => {
    try {
      const res = await catalogSyncApi.status(sid);
      const d: SyncStatus = res.data?.data ?? {};
      setSyncStatus(d);
      if (d.stats) refetchStats();
      if (!d.running) {
        stopPolling();
        setActiveSyncId(null);
        refetchHistory();
        if (d.success) showSuccess("Sinxronlash muvaffaqiyatli yakunlandi!");
        else showError("Xato", "Sinxronlashda xato yuz berdi.");
      }
    } catch { /* ignore */ }
  }, [refetchStats, refetchHistory, showSuccess, showError, stopPolling]);

  function startPolling(sid: string) {
    stopPolling();
    pollingRef.current = setInterval(() => pollStatus(sid), 2000);
  }

  useEffect(() => () => stopPolling(), [stopPolling]);

  const startMut = useMutation({
    mutationFn: () => catalogSyncApi.start(config as unknown as Record<string, unknown>),
    onSuccess: (res) => {
      const d = res.data?.data;
      if (!d?.sync_id) return;
      setActiveSyncId(d.sync_id);
      setSyncStatus({ sync_id: d.sync_id, running: true, started_at: d.started_at });
      setShowConfig(false);
      startPolling(d.sync_id);
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showError("Xato", detail ?? "Sinxronlash boshlanmadi.");
    },
  });

  const userSyncMut = useMutation({
    mutationFn: () => catalogSyncApi.syncUsers({ role: userSyncRole, limit: userSyncLimit }),
    onSuccess: (res) => { showSuccess(`${res.data?.data?.synced ?? 0} ta foydalanuvchi sinxronlandi`); },
    onError: () => showError("Xato", "Foydalanuvchilar sinxronlanmadi."),
  });

  const isRunning = syncStatus?.running ?? false;
  const isAdmin   = ["admin", "superadmin"].includes(user?.role ?? "");

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="glass rounded-2xl py-16 text-center border border-amber-500/20">
        <Shield className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <p className="text-slate-300 font-medium">Ruxsat yo'q</p>
        <p className="text-slate-500 text-sm mt-1">Bu sahifa faqat admin va superadmin uchun</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center">
            <RefreshCw size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">HEMIS Sinxronlash</h1>
            <p className="text-sm text-slate-400">Katalog va foydalanuvchi ma'lumotlarini HEMIS dan yuklash</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${
          config.mock
            ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
            : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
        }`}>
          {config.mock ? <><WifiOff size={13} /> Mock rejimi</> : <><Wifi size={13} /> HEMIS API</>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Universitetlar" value={stats.universities} icon={Building2}     color="indigo" />
        <StatCard label="Fakultetlar"    value={stats.faculties}    icon={GraduationCap} color="cyan" />
        <StatCard label="Mutaxassislik"  value={stats.specialties}  icon={Layers}        color="violet" />
        <StatCard label="Guruhlar"       value={stats.groups}       icon={Users}         color="emerald" />
        <StatCard label="Fanlar"         value={stats.subjects}     icon={BookOpen}      color="amber" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Config + Controls */}
        <div className="xl:col-span-2 space-y-4">

          {/* Config panel */}
          <div className="cosmic-card overflow-hidden">
            <button onClick={() => setShowConfig(!showConfig)}
              className="w-full flex items-center justify-between px-5 py-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-2 text-white font-medium text-sm">
                <Settings size={15} className="text-indigo-400" /> Sozlamalar
              </div>
              {showConfig ? <ChevronUp size={15} className="text-slate-500" /> : <ChevronDown size={15} className="text-slate-500" />}
            </button>

            {showConfig && (
              <div className="p-5 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wide mb-1.5 block">Universitet kodi</label>
                    <input value={config.university_code} disabled={isRunning}
                      onChange={(e) => setConfig(c => ({ ...c, university_code: e.target.value.toUpperCase() }))}
                      className="input-dark w-full text-sm font-mono uppercase" placeholder="NSPI" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wide mb-1.5 block">Universitet nomi</label>
                    <input value={config.university_name} disabled={isRunning}
                      onChange={(e) => setConfig(c => ({ ...c, university_name: e.target.value }))}
                      className="input-dark w-full text-sm" placeholder="Nukus Davlat Pedagogika Instituti" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/[0.03]">
                  <div>
                    <p className="text-sm font-medium text-white">Mock rejimi</p>
                    <p className="text-xs text-slate-500">HEMIS API o'rniga test ma'lumotlar</p>
                  </div>
                  <button onClick={() => setConfig(c => ({ ...c, mock: !c.mock }))} disabled={isRunning}
                    className={`relative w-11 h-6 rounded-full transition-colors ${config.mock ? "bg-amber-500" : "bg-emerald-500"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${config.mock ? "left-0.5" : "left-5"}`} />
                  </button>
                </div>

                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Nimalarni sinxronlash</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "sync_faculties",   label: "Fakultetlar",   icon: GraduationCap },
                      { key: "sync_specialties", label: "Mutaxassislik", icon: Layers },
                      { key: "sync_groups",      label: "Guruhlar",      icon: Users },
                      { key: "sync_subjects",    label: "Fanlar",        icon: BookOpen },
                    ].map(({ key, label, icon: Icon }) => {
                      const active = config[key as keyof typeof config] as boolean;
                      return (
                        <button key={key} disabled={isRunning}
                          onClick={() => setConfig(c => ({ ...c, [key]: !c[key as keyof typeof c] }))}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                            active ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300" : "border-white/10 bg-white/[0.03] text-slate-500 hover:border-white/20"
                          }`}>
                          <Icon size={13} />
                          {label}
                          <span className={`ml-auto w-3 h-3 rounded-full border ${active ? "bg-indigo-500 border-indigo-400" : "border-slate-600"}`} />
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-600 mt-2 flex items-start gap-1.5">
                    <Info size={11} className="shrink-0 mt-0.5" />
                    Faqat tanlanganlar sinxronlanadi
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Start button */}
          <button onClick={() => startMut.mutate()} disabled={isRunning || startMut.isPending}
            className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all ${
              isRunning || startMut.isPending
                ? "bg-white/5 text-slate-500 cursor-not-allowed border border-white/10"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-600/25 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98]"
            }`}>
            {isRunning ? <><Loader2 size={18} className="animate-spin" /> Sinxronlanmoqda…</> : <><Play size={18} /> Sinxronlashni boshlash</>}
          </button>

          {/* Status card */}
          {syncStatus && (
            <div className={`cosmic-card p-4 space-y-2 border ${
              syncStatus.running ? "border-indigo-500/30 bg-indigo-500/[0.04]"
                : syncStatus.success ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                : "border-red-500/30 bg-red-500/[0.04]"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {syncStatus.running ? <Loader2 size={14} className="text-indigo-400 animate-spin" />
                    : syncStatus.success ? <CheckCircle size={14} className="text-emerald-400" />
                    : <XCircle size={14} className="text-red-400" />}
                  <span className="text-sm font-medium text-white">
                    {syncStatus.running ? "Jarayon…" : syncStatus.success ? "Muvaffaqiyatli" : "Xato yuz berdi"}
                  </span>
                </div>
                {syncStatus.sync_id && <code className="text-[10px] text-slate-500 font-mono">{syncStatus.sync_id.slice(0, 8)}…</code>}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock size={11} /> {fmtDate(syncStatus.started_at)}
                {syncStatus.finished_at && <> · {fmtDuration(syncStatus.started_at, syncStatus.finished_at)}</>}
              </div>
              {syncStatus.options?.mock && (
                <div className="flex items-center gap-1.5 text-xs text-amber-400">
                  <AlertTriangle size={11} /> Mock rejimida ishlandi
                </div>
              )}
            </div>
          )}

          {/* User sync */}
          <div className="cosmic-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-cyan-400" />
              <h3 className="font-semibold text-white text-sm">Foydalanuvchilar sinxronlash</h3>
            </div>
            <p className="text-xs text-slate-500">HEMIS dan talaba/o'qituvchi profillarini yangilash</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Rol</label>
                <select value={userSyncRole} onChange={(e) => setUserSyncRole(e.target.value)} disabled={userSyncMut.isPending}
                  className="input-dark w-full text-xs py-2">
                  <option value="all">Barchasi</option>
                  <option value="student">Talabalar</option>
                  <option value="teacher">O'qituvchilar</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Limit</label>
                <select value={userSyncLimit} onChange={(e) => setUserSyncLimit(Number(e.target.value))} disabled={userSyncMut.isPending}
                  className="input-dark w-full text-xs py-2">
                  {[25, 50, 100, 200, 500].map(n => <option key={n} value={n}>{n} ta</option>)}
                </select>
              </div>
            </div>
            <button onClick={() => userSyncMut.mutate()} disabled={userSyncMut.isPending}
              className="w-full py-2.5 rounded-xl bg-cyan-600/80 hover:bg-cyan-500 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors">
              {userSyncMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              {userSyncMut.isPending ? "Sinxronlanmoqda…" : "Profillarni yangilash"}
            </button>
            {userSyncMut.isSuccess && (
              <div className="text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle size={12} />
                {userSyncMut.data?.data?.data?.synced ?? 0} ta profil yangilandi
              </div>
            )}
          </div>
        </div>

        {/* Log + History */}
        <div className="xl:col-span-3 space-y-4">
          {/* Log terminal */}
          <div className="cosmic-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-emerald-400" />
                <span className="text-sm font-medium text-white">Sinxronlash logi</span>
                {isRunning && (
                  <span className="flex items-center gap-1 text-xs text-indigo-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" /> Jonli
                  </span>
                )}
              </div>
              <button onClick={() => setSyncStatus(null)} disabled={isRunning}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-30">
                Tozalash
              </button>
            </div>
            <div className="p-4">
              <LogTerminal log={syncStatus?.log ?? ""} running={isRunning} />
            </div>
            {syncStatus?.stats && !isRunning && (
              <div className="border-t border-white/5 px-5 py-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Yakuniy holat</p>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: "Univer.", val: syncStatus.stats.universities },
                    { label: "Fak.",    val: syncStatus.stats.faculties },
                    { label: "Yo'nal.", val: syncStatus.stats.specialties },
                    { label: "Guruh",   val: syncStatus.stats.groups },
                    { label: "Fan",     val: syncStatus.stats.subjects },
                  ].map(({ label, val }) => (
                    <div key={label} className="text-center bg-white/[0.03] border border-white/5 rounded-lg py-2">
                      <div className="text-base font-bold text-white">{val}</div>
                      <div className="text-[10px] text-slate-500">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* History */}
          <div className="cosmic-card overflow-hidden">
            <button onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between px-5 py-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-2 text-white font-medium text-sm">
                <History size={15} className="text-violet-400" /> Sinxronlash tarixi
              </div>
              {showHistory ? <ChevronUp size={15} className="text-slate-500" /> : <ChevronDown size={15} className="text-slate-500" />}
            </button>
            {showHistory && (
              <div className="divide-y divide-white/[0.04] max-h-64 overflow-y-auto">
                {history.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">Hali sinxronlash tarixi yo'q</div>
                ) : (
                  history.map((h) => (
                    <div key={h.sync_id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${h.success ? "bg-emerald-500" : "bg-red-500"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-slate-400 font-mono">{h.sync_id.slice(0, 8)}…</code>
                          {h.mock && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">Mock</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{fmtDate(h.started_at)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-300">{fmtDuration(h.started_at, h.finished_at)}</p>
                        {h.stats && <p className="text-[10px] text-slate-600">{h.stats.faculties}F · {h.stats.subjects}S</p>}
                      </div>
                      {h.success ? <CheckCircle size={15} className="text-emerald-400 shrink-0" /> : <XCircle size={15} className="text-red-400 shrink-0" />}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Info card */}
          <div className="cosmic-card p-5 border-indigo-500/20">
            <div className="flex items-start gap-3">
              <Shield size={15} className="text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-400 space-y-1.5">
                <p className="font-medium text-white">Sinxronlash haqida</p>
                <p>Mock rejimida HEMIS API ga murojaat qilinmaydi — test ma'lumotlar ishlatiladi.</p>
                <p>Real rejim uchun <code className="text-indigo-300">.env</code> da <code className="text-indigo-300">HEMIS_MOCK_MODE=False</code> va <code className="text-indigo-300">HEMIS_BACKEND_TOKEN</code> kerak.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
