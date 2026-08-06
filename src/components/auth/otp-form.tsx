"use client";

import { useActionState, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { verifyOtp, type ActionState } from "@/lib/actions/auth";
import { cn } from "@/lib/utils/cn";

const initialState: ActionState = { status: "idle" };
const LENGTH = 6;

/**
 * Six single-character boxes that behave like one field: typing advances,
 * Backspace retreats, and a pasted code fills every box at once.
 *
 * The real value lives in a hidden input so the Server Action still receives a
 * plain string from FormData.
 */
export function OtpForm({ email }: { email: string }) {
  const [state, formAction, isPending] = useActionState(verifyOtp, initialState);
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const formRef = useRef<HTMLFormElement>(null);

  const code = digits.join("");
  const complete = code.length === LENGTH;

  function focusAt(index: number) {
    inputsRef.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus();
  }

  function setDigitAt(index: number, value: string) {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleChange(index: number, raw: string) {
    const value = raw.replace(/\D/g, "");
    if (!value) {
      setDigitAt(index, "");
      return;
    }

    // A paste (or fast typing) can deliver several digits into one box.
    if (value.length > 1) {
      const chars = value.slice(0, LENGTH - index).split("");
      setDigits((prev) => {
        const next = [...prev];
        chars.forEach((c, i) => {
          next[index + i] = c;
        });
        return next;
      });
      focusAt(index + chars.length);
      return;
    }

    setDigitAt(index, value);
    focusAt(index + 1);
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      setDigitAt(index - 1, "");
      focusAt(index - 1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusAt(index - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusAt(index + 1);
    }
  }

  return (
    <form ref={formRef} action={formAction} className="flex w-full flex-col gap-4">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="token" value={code} />

      <div className="flex justify-center gap-2" role="group" aria-label="6-digit code">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={(e) => e.target.select()}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={LENGTH}
            aria-label={`Digit ${index + 1}`}
            autoFocus={index === 0}
            className={cn(
              "bg-surface-container-lowest size-12 rounded-lg border text-center font-mono text-xl",
              "focus:ring-primary transition-all outline-none focus:border-transparent focus:ring-2",
              state.status === "error" ? "border-error" : "border-outline-variant",
            )}
          />
        ))}
      </div>

      {state.status === "error" && (
        <p role="alert" className="text-body-md text-error text-center">
          {state.message}
        </p>
      )}

      <Button type="submit" isLoading={isPending} disabled={!complete} className="w-full">
        Verify and continue
      </Button>
    </form>
  );
}
