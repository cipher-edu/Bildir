"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { passwordResetApi } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [sent, setSent]       = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await passwordResetApi.forgot(email);
      setSent(true);
      // Dev mode: token response'da keladi
      if (res.data?.data?.token) {
        setDevToken(res.data.data.token);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? "Xato yuz berdi. Qayta urinib ko'ring.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-cosmos flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Ko'rsatmalar yuborildi</h1>
            <p className="text-slate-400 mt-2 text-sm">
              {email} manziliga tiklash ko'rsatmalari yuborildi.
            </p>
          </div>

          {devToken && (
            <div className="cosmic-card p-4 text-left">
              <p className="text-xs text-amber-400 font-medium mb-2">🔧 Dev rejimi — Token:</p>
              <code className="text-xs text-slate-300 break-all font-mono">{devToken}</code>
              <button
                onClick={() => router.push(`/auth/reset-password?token=${devToken}`)}
                className="btn-primary w-full py-2.5 rounded-xl text-sm mt-3"
              >
                Parolni tiklash sahifasiga o'tish
              </button>
            </div>
          )}

          <Link href="/login" className="block text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            ← Kirish sahifasiga qaytish
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cosmos flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 font-black text-2xl text-white shadow-xl shadow-indigo-500/25 mb-4">
            E
          </div>
          <h1 className="text-2xl font-bold text-white">Parolni tiklash</h1>
          <p className="mt-2 text-sm text-slate-400">
            Email manzilingizni kiriting, ko'rsatmalar yuboramiz
          </p>
        </div>

        {/* Form */}
        <div className="cosmic-card p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Email manzil</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.uz"
                  required
                  className="input-dark w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/25 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="btn-primary w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              Ko'rsatmalarni yuborish
            </button>
          </form>

          <div className="pt-2 border-t border-white/5">
            <Link href="/login"
              className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={14} /> Kirish sahifasiga qaytish
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
