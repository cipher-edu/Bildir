"use client";
import Link from "next/link";
import { GraduationCap, Home, ArrowLeft, Telescope } from "lucide-react";
import StarField from "@/components/ui/StarField";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cosmos flex items-center justify-center p-6 relative overflow-hidden">
      <StarField count={40} opacity={0.3} />

      {/* Nebula */}
      <div className="absolute inset-0 grid-cosmos opacity-30 pointer-events-none" />
      <div className="absolute w-[700px] h-[700px] rounded-full opacity-[0.08] pointer-events-none"
        style={{
          background: "radial-gradient(circle, #6366f1, transparent 70%)",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          filter: "blur(100px)",
        }} />
      <div className="absolute w-[400px] h-[400px] rounded-full opacity-[0.06] pointer-events-none"
        style={{
          background: "radial-gradient(circle, #22d3ee, transparent 70%)",
          top: "15%", right: "5%",
          filter: "blur(80px)",
        }} />

      <div className="relative z-10 text-center max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-700 flex items-center justify-center shadow-glow-sm">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-white">
            OsiyoNigohi
          </span>
        </div>

        {/* 404 */}
        <div className="relative mb-8">
          <p className="text-[140px] sm:text-[180px] font-black leading-none text-transparent"
            style={{
              WebkitTextStroke: "1.5px rgba(99,102,241,0.3)",
              backgroundImage: "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(34,211,238,0.2))",
              WebkitBackgroundClip: "text",
            }}>
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(34,211,238,0.08))",
                border: "1px solid rgba(99,102,241,0.25)",
              }}>
              <Telescope className="w-10 h-10 text-indigo-400" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
          Sahifa topilmadi
        </h1>
        <p className="text-slate-400 leading-relaxed mb-10">
          Siz qidirayotgan sahifa kosmosda yo&apos;qoldi yoki hali yaratilmagan.
          <br />Orqaga qayting yoki bosh sahifadan boshlang.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/"
            className="btn-primary flex items-center justify-center gap-2 px-8 py-3.5 text-sm">
            <Home className="w-4 h-4" />
            Bosh sahifaga
          </Link>
          <Link href="/dashboard"
            className="btn-secondary flex items-center justify-center gap-2 px-8 py-3.5 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
