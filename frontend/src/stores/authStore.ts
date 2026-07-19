/**
 * Auth store — tokenlar localStorage da SAQLANMAYDI (XSS himoya).
 * Access: faqat memory; refresh/access asosan httpOnly cookie (backend Set-Cookie).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types";

interface AuthState {
  user: User | null;
  /** Faqat xotira — persist qilinmaydi */
  accessToken: string | null;
  /** Legacy; cookie asosiy. Persist qilinmaydi */
  refreshToken: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;

  setAuth: (user: User, access?: string | null, refresh?: string | null) => void;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setHasHydrated: (v: boolean) => void;
  setUserOnly: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      setAuth: (user, access = null, refresh = null) => {
        set({
          user,
          accessToken: access || null,
          refreshToken: refresh || null,
          isAuthenticated: true,
        });
      },

      setUserOnly: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setAccessToken: (token) => set({ accessToken: token }),

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
        // Eski localStorage tokenlarini tozalash (migratsiya)
        try {
          if (typeof window !== "undefined") {
            const raw = localStorage.getItem("osiyonigohi-auth");
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.state) {
                delete parsed.state.accessToken;
                delete parsed.state.refreshToken;
                localStorage.setItem("osiyonigohi-auth", JSON.stringify(parsed));
              }
            }
          }
        } catch {
          /* ignore */
        }
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: "osiyonigohi-auth",
      // Faqat user + isAuthenticated — tokenlar localStorage da emas
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // Eski saqlangan tokenlarni xotiradan ham tozalash
        if (state) {
          state.accessToken = null;
          state.refreshToken = null;
        }
      },
    }
  )
);
