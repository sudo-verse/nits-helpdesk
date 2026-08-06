"use client";

import Link from "next/link";

import { cn } from "@/lib/utils/cn";

export type TabItem = {
  href: string;
  label: string;
  count?: number;
};

/**
 * The underline tab bar from task_management ("Unassigned (12) | Active |
 * Escalated | Resolved").
 *
 * Implemented as links rather than buttons so the selected tab lives in the
 * URL — shareable, back-button friendly, and readable by Server Components.
 */
export function Tabs({
  items,
  activeHref,
  className,
}: {
  items: readonly TabItem[];
  activeHref: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-outline-variant/30 hide-scrollbar flex overflow-x-auto border-b",
        "-mx-6 px-6 md:mx-0 md:px-0",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "text-title-md border-b-2 px-6 py-3 whitespace-nowrap transition-colors",
              active
                ? "border-primary text-primary"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/30 border-transparent",
            )}
          >
            {item.label}
            {item.count !== undefined && ` (${item.count})`}
          </Link>
        );
      })}
    </div>
  );
}
