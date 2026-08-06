"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { requestPasswordReset, type ActionState } from "@/lib/actions/auth";

const initialState: ActionState = { status: "idle" };

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordReset,
    initialState,
  );
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  if (state.status === "success") {
    return (
      <p role="status" className="text-body-md text-on-surface text-center">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <Field label="Institute email" error={fieldErrors?.email?.[0]}>
        <Input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@students.nits.ac.in"
          icon="mail"
        />
      </Field>

      {state.status === "error" && !fieldErrors && (
        <p role="alert" className="text-body-md text-error">
          {state.message}
        </p>
      )}

      <Button type="submit" isLoading={isPending} trailingIcon="arrow_forward" className="w-full">
        Send reset link
      </Button>
    </form>
  );
}
