"use client";

/**
 * Animated Tab Bar — CodePen VwKzaEm style
 * (abxlfazl / Dribbble: Mauricio Bucardo)
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type CSSProperties,
} from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type AnimatedTabItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  href?: string;
  onClick?: () => void;
  badge?: number;
};

type Props = {
  items: AnimatedTabItem[];
  activeId: string;
  onChange?: (id: string) => void;
  className?: string;
  hidden?: boolean;
};

export default function AnimatedTabBar({
  items,
  activeId,
  onChange,
  className = "",
  hidden = false,
}: Props) {
  const clipId = `anim-tab-clip-${useId().replace(/:/g, "")}`;
  const menuRef = useRef<HTMLElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<Map<string, HTMLElement>>(new Map());

  const activeIndex = Math.max(
    0,
    items.findIndex((i) => i.id === activeId)
  );

  const offsetBorder = useCallback(() => {
    const menu = menuRef.current;
    const border = borderRef.current;
    const slot = slotRefs.current.get(items[activeIndex]?.id ?? "");
    if (!menu || !border || !slot) return;

    const itemRect = slot.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const left =
      itemRect.left -
      menuRect.left -
      (border.offsetWidth - itemRect.width) / 2;

    border.style.transform = `translate3d(${Math.round(left)}px, 0, 0)`;
  }, [activeIndex, items]);

  useLayoutEffect(() => {
    offsetBorder();
  }, [offsetBorder, activeId, items.length]);

  useEffect(() => {
    const onResize = () => offsetBorder();
    window.addEventListener("resize", onResize);
    const t = window.setTimeout(offsetBorder, 120);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(t);
    };
  }, [offsetBorder]);

  const setSlotRef = (id: string) => (el: HTMLElement | null) => {
    if (el) slotRefs.current.set(id, el);
    else slotRefs.current.delete(id);
  };

  const handleSelect = (item: AnimatedTabItem) => {
    if (item.id !== activeId) onChange?.(item.id);
    item.onClick?.();
  };

  return (
    <div
      className={`anim-tab-wrap ${hidden ? "anim-tab-wrap--hidden" : ""} ${className}`}
      aria-hidden={hidden || undefined}
    >
      <nav ref={menuRef} className="anim-tab-menu" aria-label="Navigatsiya">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeId;
          const style = {
            ["--bgColorItem" as string]: item.color,
          } as CSSProperties;
          const cls = `anim-tab-item${active ? " is-active" : ""}`;
          // Faqat pure "#section" — button+scroll; qolganlari Link (/ , /news, /#features)
          const isHashOnly = !!item.href && item.href.startsWith("#");
          const isAppRoute = !!item.href && !isHashOnly;

          const body = (
            <>
              <Icon className="anim-tab-icon" strokeWidth={1.65} aria-hidden />
              <span className="sr-only">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="anim-tab-badge">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </>
          );

          return (
            <div
              key={item.id}
              ref={setSlotRef(item.id)}
              className="anim-tab-slot"
            >
              {isAppRoute ? (
                <Link
                  href={item.href!}
                  className={cls}
                  style={style}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  onClick={() => handleSelect(item)}
                >
                  {body}
                </Link>
              ) : (
                <button
                  type="button"
                  className={cls}
                  style={style}
                  aria-label={item.label}
                  aria-current={active ? "true" : undefined}
                  onClick={() => {
                    if (item.href?.startsWith("#")) {
                      const id = item.href.slice(1);
                      if (!id) {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      } else {
                        document
                          .getElementById(id)
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }
                    handleSelect(item);
                  }}
                >
                  {body}
                </button>
              )}
            </div>
          );
        })}

        <div
          ref={borderRef}
          className="anim-tab-border"
          style={{ clipPath: `url(#${clipId})` }}
          aria-hidden
        />
      </nav>

      <svg className="anim-tab-svg" aria-hidden>
        <defs>
          <clipPath
            id={clipId}
            clipPathUnits="objectBoundingBox"
            transform="scale(0.0049285362247413 0.021978021978022)"
          >
            <path d="M6.7,45.5c5.7,0.1,14.1-0.4,23.3-4c5.7-2.3,9.9-5,18.1-10.5c10.7-7.1,11.8-9.2,20.6-14.3c5-2.9,9.2-5.2,15.2-7c7.1-2.1,13.3-2.3,17.6-2.1c4.2-0.2,10.5,0.1,17.6,2.1c6.1,1.8,10.2,4.1,15.2,7c8.8,5,9.9,7.1,20.6,14.3c8.3,5.5,12.4,8.2,18.1,10.5c9.2,3.6,17.6,4.2,23.3,4H6.7z" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}
