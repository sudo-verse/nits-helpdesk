"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { isNavItemActive, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * Mobile bottom navigation.
 *
 * The active item is a filled pill (`bg-primary-container` + `'FILL' 1` icon)
 * exactly as in the Stitch screens. Labels are always shown — complaint_history
 * is the one screen that hides them, which reads as an oversight rather than
 * intent, so they are unified here.
 */
export function BottomNav({
  items,
  unreadCount = 0,
}: {
  items: readonly NavItem[];
  unreadCount?: number;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "bg-surface-container border-outline-variant/30 shadow-nav fixed bottom-0 z-50 w-full",
        "flex h-16 items-center justify-around rounded-t-xl border-t px-4 pb-safe",
        "md:hidden",
      )}
    >
      {items.map((item) => {
        const active = isNavItemActive(pathname, item.href);
        const showBadge = item.icon === "notifications" && unreadCount > 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-col items-center justify-center px-5 py-1",
              "transition-all duration-200 active:scale-90",
              active
                ? "bg-primary-container text-on-primary-container rounded-full"
                : "text-on-surface-variant hover:text-primary",
            )}
          >
            <span className="relative">
              <Icon name={item.icon} filled={active} size={24} />
              {showBadge && (
                <span
                  className="bg-error text-on-error absolute -top-1 -right-2 flex min-w-4 items-center justify-center rounded-full px-1 font-mono text-[10px] leading-4"
                  aria-hidden="true"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>
            <span className="text-label-sm mt-1 font-mono text-[10px]">
              {item.label}
            </span>
            {showBadge && (
              <span className="sr-only">{unreadCount} unread notifications</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
