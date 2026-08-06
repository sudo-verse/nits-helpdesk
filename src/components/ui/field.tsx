"use client";

import {
  createContext,
  useContext,
  useId,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/icons";
import { cn } from "@/lib/utils/cn";

/**
 * The report_complaint screen uses a persistent small label above each field in
 * JetBrains Mono, uppercase, wide-tracked — the second option DESIGN.md offers
 * under "Input Fields > Labels".
 */

type FieldContextValue = { id: string; errorId: string; hasError: boolean };
const FieldContext = createContext<FieldContextValue | null>(null);

function useField() {
  const ctx = useContext(FieldContext);
  if (!ctx) throw new Error("Field subcomponents must be used inside <Field>.");
  return ctx;
}

export function Field({
  label,
  error,
  hint,
  required,
  className,
  children,
}: {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <FieldContext.Provider value={{ id, errorId, hasError: Boolean(error) }}>
      <div className={cn("flex flex-col gap-1", className)}>
        {label && (
          <label
            htmlFor={id}
            className="text-label-sm text-on-surface-variant font-mono tracking-wider uppercase"
          >
            {label}
            {required && (
              <span className="text-error ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        {children}
        {/* aria-live so a validation failure is announced, not just coloured. */}
        <p
          id={errorId}
          role={error ? "alert" : undefined}
          className={cn(
            "text-body-md",
            error ? "text-error" : "text-on-surface-variant",
            !error && !hint && "sr-only",
          )}
        >
          {error ?? hint ?? ""}
        </p>
      </div>
    </FieldContext.Provider>
  );
}

const controlBase = [
  "w-full bg-surface-container-lowest border rounded-lg px-4 py-3",
  "text-body-md text-on-surface placeholder:text-outline/70",
  "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
  "transition-all disabled:opacity-50 disabled:cursor-not-allowed",
].join(" ");

export function Input({
  className,
  icon,
  ...props
}: ComponentPropsWithoutRef<"input"> & { icon?: IconName }) {
  const { id, errorId, hasError } = useField();

  const input = (
    <input
      id={id}
      aria-invalid={hasError || undefined}
      aria-describedby={hasError ? errorId : undefined}
      className={cn(
        controlBase,
        hasError ? "border-error" : "border-outline-variant",
        icon && "pl-10",
        className,
      )}
      {...props}
    />
  );

  if (!icon) return input;

  return (
    <div className="relative flex items-center">
      <Icon
        name={icon}
        size={20}
        className="text-outline pointer-events-none absolute left-3"
      />
      {input}
    </div>
  );
}

export function Textarea({
  className,
  ...props
}: ComponentPropsWithoutRef<"textarea">) {
  const { id, errorId, hasError } = useField();
  return (
    <textarea
      id={id}
      rows={4}
      aria-invalid={hasError || undefined}
      aria-describedby={hasError ? errorId : undefined}
      className={cn(
        controlBase,
        "resize-none",
        hasError ? "border-error" : "border-outline-variant",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"select">) {
  const { id, errorId, hasError } = useField();
  return (
    <div className="relative">
      <select
        id={id}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
        className={cn(
          controlBase,
          "cursor-pointer appearance-none pr-10",
          hasError ? "border-error" : "border-outline-variant",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <Icon
        name="expand_more"
        size={20}
        className="text-outline pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
      />
    </div>
  );
}

/** The "Submit Anonymously" toggle from report_complaint. */
export function Switch({
  className,
  label,
  description,
  ...props
}: ComponentPropsWithoutRef<"input"> & {
  label: string;
  description?: string;
}) {
  const id = useId();
  return (
    <div
      className={cn(
        "border-outline-variant/40 bg-surface-container-low flex items-center justify-between gap-4 rounded-xl border p-4",
        className,
      )}
    >
      <label htmlFor={id} className="flex cursor-pointer flex-col">
        <span className="text-title-md text-on-surface">{label}</span>
        {description && (
          <span className="text-body-md text-on-surface-variant">{description}</span>
        )}
      </label>
      <label className="relative inline-flex shrink-0 cursor-pointer items-center">
        <input id={id} type="checkbox" className="peer sr-only" {...props} />
        <div
          className={cn(
            "bg-surface-container-highest peer-checked:bg-primary h-6 w-11 rounded-full transition-colors",
            "peer-focus-visible:outline-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2",
            "after:absolute after:top-[2px] after:start-[2px] after:size-5 after:rounded-full",
            "after:border-outline after:border after:bg-white after:transition-all after:content-['']",
            "peer-checked:after:translate-x-full peer-checked:after:border-white",
          )}
        />
      </label>
    </div>
  );
}
