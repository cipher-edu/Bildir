"use client";

/**
 * CodePen uslubidagi pastki tab bar — landing va news sahifalari uchun.
 * Faqat mobil (md:hidden). News menyusi ham bor.
 */

import { usePathname } from "next/navigation";
import {
  Home, Newspaper, LayoutGrid, Users, LogIn, ArrowRight,
} from "lucide-react";
import AnimatedTabBar from "@/components/ui/AnimatedTabBar";
import { useAuthStore } from "@/stores/authStore";
import { getRoleHome } from "@/lib/roles";
import { UserRole } from "@/types";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  /** landing scroll spy yoki majburiy active id */
  activeId?: string;
  onChange?: (id: string) => void;
  hidden?: boolean;
};

export default function PublicMobileTabBar({
  activeId: activeProp,
  onChange,
  hidden = false,
}: Props) {
  const pathname = usePathname();
  const { t } = useI18n();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  const appHref =
    isAuthenticated && user
      ? getRoleHome(user.role as UserRole)
      : "/login";

  // news sahifalarida "news" active
  const derivedActive =
    activeProp ||
    (pathname === "/news" || pathname.startsWith("/news/")
      ? "news"
      : pathname === "/login"
      ? "login"
      : pathname === "/"
      ? "home"
      : "home");

  return (
    <div
      className="md:hidden fixed bottom-3 inset-x-0 z-[45] flex justify-center px-3 pb-safe-bottom pointer-events-none"
      data-public-menu="codepen-tab-bar"
    >
      <div className="w-full max-w-[22rem] sm:max-w-[26rem] pointer-events-auto">
        <AnimatedTabBar
          hidden={hidden}
          activeId={derivedActive}
          onChange={onChange}
          items={[
            {
              id: "home",
              label: t("nav.home"),
              icon: Home,
              color: "#ff8c00",
              href: "/",
            },
            {
              id: "news",
              label: t("nav.news"),
              icon: Newspaper,
              color: "#f54888",
              href: pathname === "/" ? "/#news" : "/news",
            },
            {
              id: "features",
              label: t("nav.features"),
              icon: LayoutGrid,
              color: "#4343f5",
              href: "/#features",
            },
            {
              id: "officials",
              label: t("nav.officials"),
              icon: Users,
              color: "#e0b115",
              href: "/#officials",
            },
            {
              id: "login",
              label: isAuthenticated ? t("nav.cabinet") : t("nav.login"),
              icon: isAuthenticated ? LogIn : ArrowRight,
              color: "#65ddb7",
              href: appHref || "/login",
            },
          ]}
        />
      </div>
    </div>
  );
}
