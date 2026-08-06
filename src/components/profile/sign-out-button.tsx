"use client";

import { useTransition } from "react";

import { Icon } from "@/components/ui/icon";
import { signOut } from "@/lib/actions/auth";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => void signOut())}
      className="hover:bg-error-container/30 text-error group flex w-full items-center gap-4 p-4 text-left transition-colors disabled:opacity-60"
    >
      {isPending ? (
        <span className="size-6 animate-spin rounded-full border-2 border-current/25 border-t-current" />
      ) : (
        <Icon name="logout" />
      )}
      <span className="text-title-md flex-1">Sign out</span>
    </button>
  );
}
