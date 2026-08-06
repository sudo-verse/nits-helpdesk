import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Centred canvas for the auth screens, with the soft blurred colour blooms
 * from splash_login providing depth behind the card.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div
        aria-hidden="true"
        className="bg-primary-fixed absolute -top-32 -left-32 size-64 rounded-full opacity-50 blur-3xl dark:opacity-20"
      />
      <div
        aria-hidden="true"
        className="bg-secondary-fixed-dim absolute -right-32 -bottom-32 size-64 rounded-full opacity-30 blur-3xl dark:opacity-15"
      />

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center px-6 py-12">
        {children}
      </main>
    </div>
  );
}
