"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import {
  signInWithPassword,
  signUpWithPassword,
  type ActionState,
} from "@/lib/actions/auth";
import { cn } from "@/lib/utils/cn";

const initialState: ActionState = { status: "idle" };

type Mode = "signin" | "signup";

/** Institute email + password, with a toggle between signing in and creating an account. */
export function PasswordAuthForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [signInState, signInAction, signInPending] = useActionState(
    signInWithPassword,
    initialState,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUpWithPassword,
    initialState,
  );

  const state = mode === "signin" ? signInState : signUpState;
  const action = mode === "signin" ? signInAction : signUpAction;
  const isPending = mode === "signin" ? signInPending : signUpPending;
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <div className="flex w-full flex-col gap-4">
      <div
        role="tablist"
        aria-label="Sign in or create an account"
        className="bg-surface-container-low grid grid-cols-2 gap-1 rounded-lg p-1"
      >
        {(["signin", "signup"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={mode === tab}
            onClick={() => setMode(tab)}
            className={cn(
              "text-title-md rounded-md py-2 transition-colors",
              mode === tab
                ? "bg-surface-container-lowest text-on-surface shadow-sm"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {tab === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      {/* Remounts the form on mode switch so leftover input/state doesn't bleed across. */}
      <form key={mode} action={action} className="flex flex-col gap-3">
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

        <Field label="Password" error={fieldErrors?.password?.[0]}>
          <Input
            name="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={mode === "signup" ? 8 : undefined}
            placeholder="••••••••"
          />
        </Field>

        {mode === "signup" && (
          <Field label="Confirm password" error={fieldErrors?.confirmPassword?.[0]}>
            <Input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="••••••••"
            />
          </Field>
        )}

        {state.status === "error" && !fieldErrors && (
          <p role="alert" className="text-body-md text-error">
            {state.message}
          </p>
        )}
        {state.status === "success" && (
          <p role="status" className="text-body-md text-success">
            {state.message}
          </p>
        )}

        <Button type="submit" isLoading={isPending} trailingIcon="arrow_forward" className="w-full">
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
