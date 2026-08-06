"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import type { ActionState } from "@/lib/actions/auth";
import { assignComplaint } from "@/lib/actions/workflow";

const initialState: ActionState = { status: "idle" };

export function AssignControl({
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
  const [state, formAction, isPending] = useActionState(assignComplaint, initialState);

  useEffect(() => {
    if (state.status === "success") toast.success(state.message ?? "Assigned.");
    if (state.status === "error") toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="complaintId" value={complaintId} />
      <input type="hidden" name="complaintCode" value={complaintCode} />

      <CardTitle>
        <Icon name="person_add" className="text-outline" />
        {currentAssigneeId ? "Reassign" : "Assign"}
      </CardTitle>

      <Field
        label="Staff member"
        hint="Assigning notifies both the staff member and the student."
      >
        <Select name="staffId" defaultValue={currentAssigneeId ?? ""} required>
          <option value="" disabled>
            Choose a staff member
          </option>
          {staffOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name ?? "Unnamed"}
            </option>
          ))}
        </Select>
      </Field>

      <Button type="submit" isLoading={isPending} icon="assignment_ind">
        {currentAssigneeId ? "Reassign complaint" : "Assign complaint"}
      </Button>
    </form>
  );
}
