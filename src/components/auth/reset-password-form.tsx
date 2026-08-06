"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { resetPassword, type ActionState } from "@/lib/actions/auth";

const initialState: ActionState = { status: "idle" };

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(resetPassword, initialState);
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <Field label="New password" error={fieldErrors?.password?.[0]}>
        <Input
          name="password"
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

      <Button type="submit" isLoading={isPending} trailingIcon="arrow_forward" className="w-full">
        Set new password
      </Button>
    </form>
  );
}
