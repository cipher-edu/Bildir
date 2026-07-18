"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { getRoleHome } from "@/lib/roles";
import { UserRole } from "@/types";

export default function RootPage() {
  const router = useRouter();
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated || !user) {
      router.replace("/login");
    } else {
      router.replace(getRoleHome(user.role as UserRole));
    }
  }, [_hasHydrated, isAuthenticated, user, router]);

  return null;
}
