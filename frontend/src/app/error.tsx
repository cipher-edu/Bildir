"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw, Home, GraduationCap } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const router = useRouter();

  return (
    <div className="min-h-screen bg-cosmos flex items-center justify-center p-6 relative overflow-hidden">
      {/* Cosmic bg */}
      <div className="absolute inset-0 grid-cosmos opacity-40" />
      <div className="absolute w-[600px] h-[600px] rounded-full opacity-[0.07]"
        style={{
          background: "radial-gradient(circle, #ef4444, transparent 70%)",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          filter: "blur(100px)",
        }} />
      <div className="absolute w-[400px] h-[400px] rounded-full opacity-[0.06]"
        style={{
          background: "radial-gradient(circle, #6366f1, transparent 70%)",
          top: "20%", right: "10%",
          filter: "blur(80px)",
          animation: "nebulaFloat 12s ease-in-out infinite",
        }} />

      <div className="relative z-10 text-center max-w-lg w-full">
        {/* Icon */}
        <div className="relative mx-auto w-24 h-24 mb-8">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto"
            style={{
              background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))",
              border: "1px solid rgba(239,68,68,0.25)",
            }}>
            <AlertTriangle className="w-12 h-12 text-red-400" />
          </div>
          <div className="absolute -inset-2 rounded-3xl opacity-20 animate-glow-pulse"
            style={{ background: "radial-gradient(circle, rgba(239,68,68,0.5), transparent 70%)" }} />
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">Bildir</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
          Xatolik yuz berdi
        </h1>
        <p className="text-slate-400 mb-2 text-base leading-relaxed">
          Kutilmagan muammo kelib chiqdi. Sahifani yangilash yoki bosh sahifaga
          qaytish bilan davom eting.
        </p>

        {error.message && (
          <div className="mt-4 mb-6 px-4 py-3 rounded-2xl text-xs font-mono text-red-400/70 text-left"
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.12)",
            }}>
            {error.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <button onClick={reset}
            className="btn-primary flex items-center justify-center gap-2 px-7 py-3.5">
            <RefreshCw className="w-4 h-4" />
            Qayta urinish
          </button>
          <button onClick={() => router.push("/")}
            className="btn-secondary flex items-center justify-center gap-2 px-7 py-3.5">
            <Home className="w-4 h-4" />
            Bosh sahifa
          </button>
        </div>
      </div>
    </div>
  );
}
