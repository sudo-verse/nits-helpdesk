"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { ActionState } from "@/lib/actions/auth";
import { uploadAvatar } from "@/lib/actions/profile";
import { ROLE_META, type UserRole } from "@/lib/constants";

const initialState: ActionState = { status: "idle" };

/** The student ID card from notifications_profile, with a working avatar upload. */
export function ProfileCard({
  name,
  email,
  rollNumber,
  departmentName,
  avatarUrl,
  role,
}: {
  name: string | null;
  email: string;
  rollNumber: string | null;
  departmentName: string | null;
  avatarUrl: string | null;
  role: UserRole;
}) {
  const [state, formAction, isPending] = useActionState(uploadAvatar, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") toast.success(state.message ?? "Updated.");
    if (state.status === "error") toast.error(state.message);
  }, [state]);

  return (
    <Card surface="lowest" radius="xl" className="flex flex-col items-center p-4 text-center">
      <form ref={formRef} action={formAction} className="relative mb-2">
        <Avatar src={avatarUrl} name={name} size={96} className="border-2" />

        <label
          className="bg-primary text-on-primary absolute right-0 bottom-0 flex size-8 cursor-pointer items-center justify-center rounded-full shadow-sm transition-transform active:scale-90"
          title="Change photo"
        >
          {isPending ? (
            <span className="size-4 animate-spin rounded-full border-2 border-current/25 border-t-current" />
          ) : (
            <Icon name="edit" size={16} />
          )}
          <input
            type="file"
            name="avatar"
            accept="image/jpeg,image/png"
            className="sr-only"
            // Submitting on change keeps it to one interaction, matching the
            // design's single avatar affordance.
            onChange={() => formRef.current?.requestSubmit()}
          />
          <span className="sr-only">Change profile photo</span>
        </label>
      </form>

      <h2 className="text-title-md text-on-surface">{name ?? "Unnamed"}</h2>
      {departmentName && (
        <p className="text-label-sm text-outline mb-2 font-mono">{departmentName}</p>
      )}

      <div className="mb-2 flex flex-wrap justify-center gap-2">
        {rollNumber && <Badge tone="neutral">{rollNumber}</Badge>}
        <Badge tone="neutral" className="max-w-full truncate">{email}</Badge>
        {role !== "student" && (
          <Badge tone="primary" icon={ROLE_META[role].icon}>{ROLE_META[role].label}</Badge>
        )}
      </div>
    </Card>
  );
}
