"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { isNavItemActive, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * Desktop sidebar.
 *
 * Width is standardised at 256px (`w-64`): three of the four Stitch screens
 * with a sidebar use w-64 and home_dashboard is the 240px outlier.
 */
export function SideNav({
  items,
  secondaryItems = [],
  unreadCount = 0,
}: {
  items: readonly NavItem[];
  secondaryItems?: readonly NavItem[];
  unreadCount?: number;
}) {
  const pathname = usePathname();

  const renderItem = (item: NavItem) => {
    const active = isNavItemActive(pathname, item.href);
    const showBadge = item.icon === "notifications" && unreadCount > 0;

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "text-title-md flex items-center gap-3 rounded-lg px-4 py-3 transition-colors",
            active
              ? "bg-primary-container text-on-primary-container font-medium"
              : "text-on-surface-variant hover:bg-surface-container-high/50",
          )}
        >
          <Icon name={item.icon} filled={active} />
          <span className="flex-1">{item.label}</span>
          {showBadge && (
            <span className="bg-error text-on-error flex min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-[10px] leading-5">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "bg-surface-container border-outline-variant/30 hidden border-r md:flex",
        "sticky top-0 h-dvh w-64 shrink-0 flex-col py-6",
      )}
    >
      <div className="mb-8 px-6">
        <Link href={items[0]?.href ?? "/"} className="flex items-center gap-2">
          <h1 className="text-headline-lg text-primary font-bold tracking-tight">
            NITS HelpDesk
          </h1>
        </Link>
      </div>

      <ul className="flex flex-col gap-2 px-4">{items.map(renderItem)}</ul>

      {secondaryItems.length > 0 && (
        <>
          <div className="border-outline-variant/30 mx-4 my-4 border-t" />
          <p className="text-label-sm text-outline px-6 pb-2 font-mono uppercase">
            Manage
          </p>
          <ul className="flex flex-col gap-1 px-4">
            {secondaryItems.map(renderItem)}
          </ul>
        </>
      )}
    </nav>
  );
}
