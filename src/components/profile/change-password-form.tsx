"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import type { ActionState } from "@/lib/actions/auth";
import { changePassword } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";

const initialState: ActionState = { status: "idle" };

export function ChangePasswordForm({
  hasPasswordIdentity,
}: {
  hasPasswordIdentity: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    changePassword,
    initialState,
  );
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state.status === "success") toast.success(state.message ?? "Updated.");
  }, [state]);

  return (
    <Card as="form" action={formAction} className="flex flex-col gap-4 p-6">
      <CardTitle>
        <Icon name="security" className="text-outline" />
        {hasPasswordIdentity ? "Change password" : "Set a password"}
      </CardTitle>

      {!hasPasswordIdentity && (
        <p className="text-body-md text-on-surface-variant">
          Your account currently signs in with Google only. Set a password to also
          be able to sign in with your institute email directly.
        </p>
      )}

      {hasPasswordIdentity && (
        <Field label="Current password" error={fieldErrors?.currentPassword?.[0]}>
          <Input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </Field>
      )}

      <Field label="New password" error={fieldErrors?.newPassword?.[0]}>
        <Input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="••••••••"
        />
      </Field>

      <Field label="Confirm new password" error={fieldErrors?.confirmPassword?.[0]}>
        <Input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="••••••••"
        />
      </Field>

      {state.status === "error" && !fieldErrors && (
        <p role="alert" className="text-body-md text-error">
          {state.message}
        </p>
      )}

      <Button type="submit" isLoading={isPending} className="self-start">
        {hasPasswordIdentity ? "Update password" : "Set password"}
      </Button>
    </Card>
  );
}
