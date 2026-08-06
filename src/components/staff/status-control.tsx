"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import type { ActionState } from "@/lib/actions/auth";
import { updateComplaintStatus } from "@/lib/actions/workflow";
import { STATUS_META, type ComplaintStatus } from "@/lib/constants";

const initialState: ActionState = { status: "idle" };

/**
 * Legal next stages, mirroring validate_status_transition().
 *
 * This is a UI affordance only — it stops staff being offered a move that will
 * be rejected. The database remains the authority; an out-of-date copy here
 * produces a clear error rather than an invalid write.
 */
const NEXT_STATUSES: Record<ComplaintStatus, ComplaintStatus[]> = {
  submitted: ["assigned", "under_review"],
  assigned: ["under_review", "in_progress", "submitted"],
  under_review: ["in_progress", "assigned", "resolved", "closed"],
  in_progress: ["resolved", "under_review", "closed"],
  resolved: ["closed", "in_progress"],
  closed: [],
};

export function StatusControl({
  complaintId,
  complaintCode,
  currentStatus,
  currentResolutionNote,
}: {
  complaintId: string;
  complaintCode: string;
  currentStatus: ComplaintStatus;
  currentResolutionNote: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    updateComplaintStatus,
    initialState,
  );
  const options = NEXT_STATUSES[currentStatus];
  const [target, setTarget] = useState<ComplaintStatus | "">(options[0] ?? "");

  useEffect(() => {
    if (state.status === "success") toast.success(state.message ?? "Updated.");
    if (state.status === "error") toast.error(state.message);
  }, [state]);

  if (!options.length) {
    return (
      <div className="flex items-center gap-2">
        <Icon name="task_alt" className="text-success" />
        <p className="text-body-md text-on-surface-variant">
          This complaint is closed. Reopening means filing a new one.
        </p>
      </div>
    );
  }

  const needsNote = target === "resolved" || target === "closed";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="complaintId" value={complaintId} />
      <input type="hidden" name="complaintCode" value={complaintCode} />

      <CardTitle>
        <Icon name="build" className="text-outline" />
        Update status
      </CardTitle>

      <Field label="Move to">
        <Select
          name="status"
          value={target}
          onChange={(e) => setTarget(e.target.value as ComplaintStatus)}
          required
        >
          {options.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </Select>
      </Field>

      {needsNote && (
        <>
          <Field
            label="Resolution note"
            required
            hint="What was done? The student sees this."
          >
            <Textarea
              name="resolutionNote"
              required
              rows={3}
              maxLength={5000}
              defaultValue={currentResolutionNote ?? ""}
              placeholder="Replaced the faulty switch and verified connectivity in all rooms."
            />
          </Field>

          <div className="flex flex-col gap-1">
            <span className="text-label-sm text-on-surface-variant font-mono tracking-wider uppercase">
              Proof of work (optional)
            </span>
            <input
              type="file"
              name="resolutionFiles"
              multiple
              accept="image/jpeg,image/png,application/pdf"
              className="text-body-md text-on-surface-variant file:bg-surface-container-high file:text-on-surface file:mr-3 file:rounded-lg file:border-0 file:px-4 file:py-2"
            />
          </div>
        </>
      )}

      <Button type="submit" isLoading={isPending} icon="check_circle">
        Update status
      </Button>
    </form>
  );
}
