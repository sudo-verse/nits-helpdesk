"use client";

import { useTheme } from "next-themes";
import { Toaster as SonnerToaster } from "sonner";

/**
 * Sonner, restyled onto the design tokens so toasts read as a Level-2 surface
 * (DESIGN.md "Elevation & Depth") rather than Sonner's stock white card.
 */
export function ToastProvider() {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="top-center"
      richColors={false}
      closeButton
      // Clear of the sticky glass header on mobile and the 64px bottom nav.
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            "!bg-surface-container-lowest !text-on-surface !border !border-outline-variant/40 !shadow-level2 !rounded-xl !font-sans",
          title: "!text-title-md !font-medium",
          description: "!text-body-md !text-on-surface-variant",
          actionButton:
            "!bg-primary !text-on-primary !rounded-lg !text-label-sm !font-mono",
          cancelButton:
            "!bg-surface-container-high !text-on-surface-variant !rounded-lg",
          closeButton:
            "!bg-surface-container-high !text-on-surface-variant !border-outline-variant/40",
          success: "!text-success",
          error: "!text-error",
        },
      }}
    />
  );
}
