"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { requestOtp, type ActionState } from "@/lib/actions/auth";
import { INSTITUTE_EMAIL_PATTERN } from "@/lib/constants";

const initialState: ActionState = { status: "idle" };

/**
 * "Continue with Institute Email" from splash_login.
 *
 * Collapsed to a single button until clicked, matching the design; expanding
 * reveals the address field rather than navigating to a separate screen.
 */
export function EmailForm() {
  const [expanded, setExpanded] = useState(false);
  const [state, formAction, isPending] = useActionState(requestOtp, initialState);
  const [email, setEmail] = useState("");

  const looksInstitutional = INSTITUTE_EMAIL_PATTERN.test(email.trim().toLowerCase());
  const showHint = email.includes("@") && !looksInstitutional;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="bg-surface-container-low text-on-surface border-outline-variant hover:bg-surface-container-high text-title-md flex h-12 w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 shadow-sm transition-colors duration-100 active:scale-95"
      >
        <Icon name="school" size={20} />
        Continue with Institute Email
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field
        label="Institute email"
        error={state.status === "error" ? state.message : undefined}
        hint={
          showHint
            ? "Only @nits.ac.in institute email addresses can sign in."
            : "We'll email you a 6-digit code."
        }
      >
        <Input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          required
          placeholder="you@students.nits.ac.in"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon="mail"
        />
      </Field>

      <Button type="submit" isLoading={isPending} trailingIcon="send" className="w-full">
        Send code
      </Button>
    </form>
  );
}
