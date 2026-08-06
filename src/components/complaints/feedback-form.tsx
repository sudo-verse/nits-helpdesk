"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { ActionState } from "@/lib/actions/auth";
import { submitFeedback } from "@/lib/actions/complaints";
import { cn } from "@/lib/utils/cn";

const initialState: ActionState = { status: "idle" };

/**
 * 1–5 star rating, shown only once a complaint is closed.
 *
 * Implemented as a radio group so it is keyboard-operable and announces as a
 * single control; the stars are the visual layer over real inputs.
 */
export function FeedbackForm({
  complaintId,
  complaintCode,
  existing,
}: {
  complaintId: string;
  complaintCode: string;
  existing: { rating: number; comment: string | null } | null;
}) {
  const [state, formAction, isPending] = useActionState(submitFeedback, initialState);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);

  useEffect(() => {
    if (state.status === "success") toast.success(state.message ?? "Thanks!");
    if (state.status === "error") toast.error(state.message);
  }, [state]);

  if (existing) {
    return (
      <>
        <CardTitle className="mb-4">
          <Icon name="rate_review" className="text-outline" />
          Your rating
        </CardTitle>
        <div className="mb-2 flex gap-1" aria-label={`${existing.rating} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Icon
              key={n}
              name="star"
              filled={n <= existing.rating}
              size={24}
              className={n <= existing.rating ? "text-tertiary" : "text-outline-variant"}
            />
          ))}
        </div>
        {existing.comment && (
          <p className="text-body-md text-on-surface-variant whitespace-pre-wrap">
            {existing.comment}
          </p>
        )}
      </>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="complaintId" value={complaintId} />
      <input type="hidden" name="complaintCode" value={complaintCode} />

      <CardTitle>
        <Icon name="rate_review" className="text-outline" />
        Rate the resolution
      </CardTitle>
      <p className="text-body-md text-on-surface-variant -mt-2">
        This is what departments are measured on, so it genuinely matters.
      </p>

      <fieldset className="flex gap-1" onMouseLeave={() => setHover(0)}>
        <legend className="sr-only">Rating out of 5</legend>
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= (hover || rating);
          return (
            <label
              key={n}
              onMouseEnter={() => setHover(n)}
              className="cursor-pointer p-1"
              title={`${n} star${n === 1 ? "" : "s"}`}
            >
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className="peer sr-only"
              />
              <Icon
                name="star"
                filled={active}
                size={32}
                className={cn(
                  "peer-focus-visible:outline-primary transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2",
                  active ? "text-tertiary" : "text-outline-variant",
                )}
              />
              <span className="sr-only">{n} stars</span>
            </label>
          );
        })}
      </fieldset>

      <label htmlFor="feedback-comment" className="sr-only">Feedback</label>
      <textarea
        id="feedback-comment"
        name="comment"
        rows={3}
        maxLength={1000}
        placeholder="Anything the department should know? (optional)"
        className="bg-surface-container-lowest border-outline-variant text-body-md text-on-surface placeholder:text-outline/70 focus:ring-primary w-full resize-none rounded-lg border px-4 py-3 outline-none focus:border-transparent focus:ring-2"
      />

      <Button type="submit" isLoading={isPending} disabled={rating === 0}>
        Submit feedback
      </Button>
    </form>
  );
}
