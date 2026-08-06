"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // The server can't know the resolved theme, so render a stable placeholder
  // until after hydration rather than flashing the wrong icon or aria-label.
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={
        mounted
          ? isDark
            ? "Switch to light theme"
            : "Switch to dark theme"
          : "Switch to dark theme"
      }
      className={cn(
        "text-on-surface-variant hover:bg-surface-container-high/50 active:scale-95",
        "flex size-10 items-center justify-center rounded-full transition-colors duration-100",
        className,
      )}
    >
      {mounted ? (
        <Icon name={isDark ? "light_mode" : "dark_mode"} size={20} />
      ) : (
        <Icon name="dark_mode" size={20} />
      )}
    </button>
  );
}

