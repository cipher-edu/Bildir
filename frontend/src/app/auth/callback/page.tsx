"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, BookOpen } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/lib/api";

function CallbackInner() {
  const router       = useRouter();
  const params       = useSearchParams();
  const setAuth      = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState("");

  useEffect(() => {
    const access  = params.get("access");
    const refresh = params.get("refresh");

    if (!access || !refresh) {
      setError("Token ma'lumotlari topilmadi. Qaytadan kirish kerak.");
      return;
    }

    useAuthStore.getState().setAccessToken(access);

    authApi.me()
      .then((res) => {
        const user = res.data.data;
        setAuth(user, access, refresh);

        const { getRoleHome } = require("@/lib/roles");
        const home = getRoleHome(user.role);
        router.replace(home);
      })
      .catch(() => {
        setError("Foydalanuvchi ma'lumotlari olinmadi. Qaytadan kirish kerak.");
      });
  }, [params, setAuth, router]);

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="font-bold text-gray-900 mb-2">Xatolik yuz berdi</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors">
            Kirish sahifasiga qaytish
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">HEMIS orqali kirilmoqda...</span>
        </div>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </main>
    }>
      <CallbackInner />
    </Suspense>
  );
}
