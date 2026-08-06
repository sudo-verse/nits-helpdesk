"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";

/**
 * The glass header used on every Stitch screen:
 * `sticky top-0 z-40 backdrop-blur-xl bg-surface/70 shadow-sm`.
 *
 * DESIGN.md reserves glassmorphism for exactly this — global headers and
 * sticky navigation.
 */
export function TopAppBar({
  title,
  showBack = false,
  backHref,
  user,
  actions,
  /** Hidden on desktop where the sidebar already provides the identity. */
  mobileOnly = false,
  className,
}: {
  title: ReactNode;
  showBack?: boolean;
  backHref?: string;
  user?: { name: string | null; avatarUrl: string | null } | null;
  actions?: ReactNode;
  mobileOnly?: boolean;
  className?: string;
}) {
  const router = useRouter();

  return (
    <header
      className={cn(
        "glass sticky top-0 z-40 w-full shadow-sm",
        mobileOnly && "md:hidden",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-content items-center justify-between gap-3 px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {showBack &&
            (backHref ? (
              <Link
                href={backHref}
                aria-label="Go back"
                className="text-primary hover:bg-surface-container-high/50 -ml-2 rounded-full p-2 transition-colors duration-100 active:scale-95"
              >
                <Icon name="arrow_back" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => router.back()}
                aria-label="Go back"
                className="text-primary hover:bg-surface-container-high/50 -ml-2 rounded-full p-2 transition-colors duration-100 active:scale-95"
              >
                <Icon name="arrow_back" />
              </button>
            ))}

          {typeof title === "string" ? (
            <h1 className="text-headline-lg-mobile text-primary truncate font-bold tracking-tight">
              {title}
            </h1>
          ) : (
            title
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {actions}
          <ThemeToggle />
          {user && (
            <Link href="/profile" aria-label="Your profile" className="ml-1">
              <Avatar src={user.avatarUrl} name={user.name} size={40} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
