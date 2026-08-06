"use client";

import type { ComponentPropsWithoutRef } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";

/**
 * The search input from complaint_history and task_management: leading search
 * glyph, 12px radius, primary focus ring.
 */
export function SearchBar({
  className,
  containerClassName,
  onClear,
  value,
  ...props
}: ComponentPropsWithoutRef<"input"> & {
  containerClassName?: string;
  onClear?: () => void;
}) {
  const hasValue = typeof value === "string" && value.length > 0;

  return (
    <div className={cn("relative", containerClassName)}>
      <Icon
        name="search"
        size={20}
        className="text-outline pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
      />
      <input
        type="search"
        value={value}
        className={cn(
          "border-outline-variant bg-surface-bright w-full rounded-xl border py-3 pr-10 pl-12",
          "text-body-md text-on-surface placeholder:text-outline/70",
          "focus:border-primary focus:ring-primary transition-all outline-none focus:ring-1",
          // Safari renders its own clear button on type=search; we supply one.
          "[&::-webkit-search-cancel-button]:appearance-none",
          className,
        )}
        {...props}
      />
      {hasValue && onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="text-outline hover:text-on-surface absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 transition-colors"
        >
          <Icon name="close" size={18} />
        </button>
      )}
    </div>
  );
}
