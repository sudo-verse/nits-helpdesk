import Link from "next/link";
import type { ReactNode } from "react";

import Image from "next/image";

/**
 * Standalone shell for /privacy and /terms — reachable without a session
 * (both are in middleware's PUBLIC_PATHS), and deliberately not wrapped in
 * AppShell, which assumes an authenticated user.
 */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-outline-variant/30 border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-6 py-4">
          <Image
            src="/logo.png"
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-lg object-contain"
          />
          <Link href="/login" className="text-title-md text-on-surface font-semibold">
            NITS HelpDesk
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-12">{children}</main>
    </div>
  );
}
