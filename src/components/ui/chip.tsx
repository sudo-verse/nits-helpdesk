"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/icons";
import { cn } from "@/lib/utils/cn";

/**
 * Filter / department chip. Selected state mirrors the "Hostel" chip on
 * home_dashboard and the "All" chip on complaint_history.
 */
export function Chip({
  selected = false,
  icon,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  selected?: boolean;
  icon?: IconName;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "text-label-sm inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 font-mono whitespace-nowrap",
        "border transition-colors duration-150 active:scale-95",
        "focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2",
        selected
          ? "bg-secondary-container/20 text-secondary border-secondary/30 hover:bg-secondary-container/30"
          : "bg-surface-container-high text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-highest",
        className,
      )}
      {...props}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

/**
 * Horizontally scrolling chip rail. The design hides the scrollbar and bleeds
 * the rail to the screen edge on mobile so it reads as scrollable.
 */
export function ChipRail({
  className,
  children,
  bleed = true,
}: {
  className?: string;
  children: ReactNode;
  bleed?: boolean;
}) {
  return (
    <div
      className={cn(
        "hide-scrollbar overflow-x-auto pb-2",
        bleed && "-mx-6 px-6 sm:mx-0 sm:px-0",
        className,
      )}
    >
      <div className="flex w-max gap-2">{children}</div>
    </div>
  );
}

/**
 * The Low / Medium / High selector in report_complaint — a radio group styled
 * as chips, so it stays keyboard-navigable and announces as one control.
 */
export function RadioChip({
  className,
  children,
  tone = "primary",
  ...props
}: Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  children: ReactNode;
  tone?: "primary" | "secondary" | "error";
}) {
  const checkedClasses = {
    primary: "peer-checked:bg-primary-container peer-checked:text-on-primary-container",
    secondary:
      "peer-checked:bg-secondary-container peer-checked:text-on-secondary-container",
    error: "peer-checked:bg-error-container peer-checked:text-on-error-container",
  }[tone];

  return (
    <label className="cursor-pointer">
      <input type="radio" className="peer sr-only" {...props} />
      <div
        className={cn(
          "border-outline-variant text-on-surface-variant text-title-md rounded-full border px-4 py-2",
          "hover:bg-surface-container-highest transition-all peer-checked:border-transparent",
          "peer-focus-visible:outline-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2",
          checkedClasses,
          className,
        )}
      >
        {children}
      </div>
    </label>
  );
}
