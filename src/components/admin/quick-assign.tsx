"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select } from "@/components/ui/field";
import type { ActionState } from "@/lib/actions/auth";
import { assignComplaint } from "@/lib/actions/workflow";

const initialState: ActionState = { status: "idle" };

/**
 * The "Assign" button on each ticket card in task_management, opening a modal
 * so a coordinator can clear the queue without leaving the list.
 */
export function QuickAssign({
  complaintId,
  complaintCode,
  currentAssigneeId,
  staffOptions,
}: {
  complaintId: string;
  complaintCode: string;
  currentAssigneeId: string | null;
  staffOptions: Array<{ id: string; name: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(assignComplaint, initialState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Assigned.");
      setOpen(false);
    }
    if (state.status === "error") toast.error(state.message);
  }, [state]);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} icon="person_add">
        {currentAssigneeId ? "Reassign" : "Assign"}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Assign ${complaintCode}`}
        description="Both the staff member and the student are notified."
      >
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="complaintId" value={complaintId} />
          <input type="hidden" name="complaintCode" value={complaintCode} />

          <Field label="Staff member">
            <Select name="staffId" defaultValue={currentAssigneeId ?? ""} required>
              <option value="" disabled>Choose a staff member</option>
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>{s.name ?? "Unnamed"}</option>
              ))}
            </Select>
          </Field>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>
              Assign
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
