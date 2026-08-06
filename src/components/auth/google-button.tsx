"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { signInWithGoogle } from "@/lib/actions/auth";
import { cn } from "@/lib/utils/cn";

/** Google's brand mark, inlined exactly as it appears in splash_login. */
function GoogleMark() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleButton({
  className,
  next,
}: {
  className?: string;
  next?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await signInWithGoogle(next);
          // A successful call redirects, so reaching here means it failed.
          if (result?.status === "error") toast.error(result.message);
        })
      }
      className={cn(
        "bg-surface-container-lowest text-on-surface border-outline-variant hover:bg-surface-container",
        "flex h-12 w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 shadow-sm",
        "text-title-md transition-colors active:scale-95 duration-100 disabled:opacity-60",
        className,
      )}
    >
      {isPending ? (
        <span className="size-5 animate-spin rounded-full border-2 border-current/25 border-t-current" />
      ) : (
        <GoogleMark />
      )}
      Continue with Google
    </button>
  );
}
