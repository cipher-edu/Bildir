"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/lib/api";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/roles";
import { User, UserRole } from "@/types";

// ── Avatar: surati bo'lmasa harfdan avatar ──────────────────────
function Avatar({ user, size = 80 }: { user: User; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = [user.first_name?.[0], user.last_name?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || user.email[0].toUpperCase();

  const role = user.role as UserRole;
  const color = ROLE_COLORS[role] ?? "#6366f1";

  if (user.picture && !imgError) {
    return (
      <img
        src={user.picture}
        alt={user.full_name || user.email}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className="rounded-full object-cover border-2 border-white/10"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, ${color}cc, ${color}66)`,
        border: `2px solid ${color}44`,
      }}
    >
      {initials}
    </div>
  );
}

// ── Info qatori ─────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-white/5 last:border-0">
      <span className="text-gray-500 text-sm shrink-0">{label}</span>
      <span className="text-sm text-right text-gray-200 max-w-[220px]">{String(value)}</span>
    </div>
  );
}

// ── Asosiy sahifa ────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const { user, isReady } = useRoleGuard(["student", "teacher", "staff"]);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [refreshing, setRefreshing] = useState(false);

  // Har safar sahifa ochilganda /auth/me/ dan yangi ma'lumot olish
  useEffect(() => {
    if (!isReady || !user) return;
    setRefreshing(true);
    authApi.me()
      .then((res) => {
        const fresh: User = res.data?.data ?? res.data;
        if (fresh?.id) updateUser(fresh);
      })
      .catch(() => {/* tarmoq xatosi — store'dagi eski ma'lumot ishlatiladi */})
      .finally(() => setRefreshing(false));
  }, [isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isReady || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const role = user.role as UserRole;
  const roleColor = ROLE_COLORS[role] ?? "#6366f1";
  const roleLabel = ROLE_LABELS[role] ?? role;
  const isStudent = role === "student";
  const isTeacher = role === "teacher";

  async function handleLogout() {
    try { await authApi.logout(); } catch { /* ignore */ }
    useAuthStore.getState().logout();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Yuqori panel */}
      <div className="border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <span className="text-sm font-semibold text-gray-300">auth-starter</span>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-red-400 transition-colors"
        >
          Chiqish →
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-10 space-y-6">

        {/* Profil kartasi */}
        <div className="bg-gray-900 border border-white/8 rounded-2xl p-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar user={user} size={72} />
              {refreshing && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">
                {user.full_name || `${user.first_name} ${user.last_name}`.trim() || user.email}
              </h1>
              <p className="text-gray-400 text-sm truncate">{user.email}</p>
              <div
                className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${roleColor}22`,
                  color: roleColor,
                  border: `1px solid ${roleColor}44`,
                }}
              >
                {roleLabel}
              </div>
            </div>
          </div>

          {/* Kontakt */}
          {user.phone && (
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-sm text-gray-400">
              <span>📞</span>
              <span>{user.phone}</span>
            </div>
          )}
        </div>

        {/* Talaba ma'lumotlari */}
        {isStudent && (
          <div className="bg-gray-900 border border-white/8 rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Ta'lim ma'lumotlari
            </h2>
            <InfoRow label="Universitet"  value={user.university_name} />
            <InfoRow label="Fakultet"     value={user.faculty_name} />
            <InfoRow label="Yo'nalish"    value={user.specialty_name} />
            <InfoRow label="Guruh"        value={user.group_name} />
            <InfoRow label="Kurs"         value={user.study_year ? `${user.study_year}-kurs` : null} />
            <InfoRow label="Talaba ID"    value={user.student_id} />
            <InfoRow label="HEMIS ID"     value={user.hemis_id} />
          </div>
        )}

        {/* O'qituvchi / xodim ma'lumotlari */}
        {!isStudent && (
          <div className="bg-gray-900 border border-white/8 rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Ish ma'lumotlari
            </h2>
            <InfoRow label="Universitet"     value={user.university_name} />
            <InfoRow label="Fakultet"        value={user.faculty_name} />
            <InfoRow label="Lavozim"         value={user.position} />
            <InfoRow label="Ilmiy daraja"    value={user.academic_degree} />
            <InfoRow label="Ilmiy unvon"     value={user.academic_rank} />
            <InfoRow label="HEMIS ID"        value={user.hemis_id} />
          </div>
        )}

        {/* Tizim */}
        <div className="bg-gray-900 border border-white/8 rounded-2xl p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Tizim
          </h2>
          <InfoRow label="Til"               value={user.language === "uz" ? "O'zbek" : "Русский"} />
          <InfoRow label="Jinsi"             value={user.gender === "M" ? "Erkak" : user.gender === "F" ? "Ayol" : null} />
          <InfoRow
            label="So'nggi HEMIS sinxron"
            value={
              user.last_hemis_sync
                ? new Date(user.last_hemis_sync).toLocaleString("uz-UZ")
                : null
            }
          />
          <InfoRow
            label="Ro'yxatdan o'tgan"
            value={new Date(user.created_at).toLocaleDateString("uz-UZ")}
          />
        </div>

        <p className="text-center text-xs text-gray-600">
          Bu — auth-starter placeholder sahifasi. Yangi funksiyalar shu yerga qo'shiladi.
        </p>
      </div>
    </div>
  );
}
