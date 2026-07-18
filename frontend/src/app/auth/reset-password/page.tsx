"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, CheckCircle, Loader2 } from "lucide-react";
import { passwordResetApi } from "@/lib/api";

function ResetPasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get("token") ?? "";

  const [newPwd, setNewPwd]       = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace("/auth/forgot-password");
    }
  }, [token, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPwd.length < 8) {
      setError("Parol kamida 8 belgidan iborat bo'lishi kerak.");
      return;
    }
    if (newPwd !== confirm) {
      setError("Parollar mos emas.");
      return;
    }

    setLoading(true);
    try {
      await passwordResetApi.reset(token, newPwd);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? "Token yaroqsiz yoki muddati tugagan.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-cosmos flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Parol yangilandi!</h2>
          <p className="text-sm text-slate-400">Kirish sahifasiga yo'naltirilmoqda…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cosmos flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 font-black text-2xl text-white shadow-xl shadow-indigo-500/25 mb-4">
            E
          </div>
          <h1 className="text-2xl font-bold text-white">Yangi parol o'rnating</h1>
          <p className="mt-2 text-sm text-slate-400">Kamida 8 ta belgidan iborat kuchli parol tanlang</p>
        </div>

        <div className="cosmic-card p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Yangi parol</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Yangi parolingiz"
                  required
                  minLength={8}
                  className="input-dark w-full pl-10 pr-10 py-2.5 rounded-xl text-sm"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {newPwd && (
                <div className="mt-2 flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                      newPwd.length >= [3, 6, 8, 12][i]
                        ? ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"][Math.min(i, 3)]
                        : "bg-white/10"
                    }`} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Parolni tasdiqlang</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Parolni qayta kiriting"
                  required
                  className="input-dark w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                />
              </div>
              {confirm && newPwd !== confirm && (
                <p className="text-xs text-red-400 mt-1">Parollar mos emas</p>
              )}
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/25 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !newPwd || !confirm || newPwd !== confirm}
              className="btn-primary w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              Parolni yangilash
            </button>
          </form>

          <div className="pt-2 border-t border-white/5 text-center">
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
              Kirish sahifasiga qaytish
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cosmos flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
