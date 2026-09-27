import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { getRoleGroup, getRoleHome, RoleGroup, ROLE_GROUP } from "@/lib/roles";
import { UserRole } from "@/types";

export function useRoleGuard(allowedGroups: RoleGroup[]) {
  const router = useRouter();

  // Selector-based subscription: faqat kerakli maydonlarni subscribe qilamiz
  const _hasHydrated    = useAuthStore((s) => s._hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user            = useAuthStore((s) => s.user);

  // Stabilize allowedGroups — inline array har render da yangi reference yaratadi
  const allowedRef = useRef(allowedGroups);
  allowedRef.current = allowedGroups;

  useEffect(() => {
    // Hydration tugaguncha kutamiz
    if (!_hasHydrated) return;

    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }

    // role faqat ma'lum UserRole qiymatlaridan biri bo'lsa tekshiramiz
    const role = user.role as UserRole;
    if (!(role in ROLE_GROUP)) {
      router.replace("/login");
      return;
    }

    const group = getRoleGroup(role);
    if (!allowedRef.current.includes(group)) {
      router.replace(getRoleHome(role));
    }
  }, [_hasHydrated, isAuthenticated, user, router]);

  return { user, isAuthenticated, isReady: _hasHydrated };
}