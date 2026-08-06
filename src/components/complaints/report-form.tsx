"use client";

import { useActionState } from "react";

import { AttachmentPicker } from "@/components/complaints/attachment-picker";
import { Button } from "@/components/ui/button";
import { RadioChip } from "@/components/ui/chip";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import type { ActionState } from "@/lib/actions/auth";
import { createComplaint } from "@/lib/actions/complaints";

const initialState: ActionState = { status: "idle" };

type Option = { id: string; name: string };

/**
 * The report_complaint form.
 *
 * The design shows a 3-step indicator (Details / Media / Review) but renders
 * every field on one page. Kept as a progress affordance rather than real
 * pagination — splitting a short form across three routes would add friction
 * and a chance to lose input, for no gain.
 */
export function ReportForm({
  departments,
  hostels,
  defaultHostelId,
}: {
  departments: Option[];
  hostels: Option[];
  defaultHostelId?: string | null;
}) {
  const [state, formAction, isPending] = useActionState(createComplaint, initialState);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <ol className="mb-4 flex items-center justify-between" aria-label="Form sections">
        {["Details", "Media", "Review"].map((label, i) => (
          <li key={label} className="flex flex-col items-center">
            <span
              className={
                i === 0
                  ? "bg-primary text-on-primary text-title-md flex size-8 items-center justify-center rounded-full shadow-sm"
                  : "bg-surface-container-highest text-on-surface-variant text-title-md flex size-8 items-center justify-center rounded-full"
              }
            >
              {i + 1}
            </span>
            <span
              className={
                i === 0
                  ? "text-label-sm text-primary mt-2 font-mono"
                  : "text-label-sm text-on-surface-variant mt-2 font-mono"
              }
            >
              {label}
            </span>
          </li>
        ))}
      </ol>

      <Field label="Title" required error={errors.title?.[0]}>
        <Input name="title" required placeholder="Brief summary of the issue" maxLength={150} />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Department" required error={errors.departmentId?.[0]}>
          <Select name="departmentId" required defaultValue="">
            <option value="" disabled>Select Department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </Field>

        <Field label="Category" error={errors.category?.[0]}>
          <Input name="category" placeholder="e.g. WiFi, Plumbing, Cleaning" maxLength={80} />
        </Field>

        <Field label="Hostel" error={errors.hostelId?.[0]}>
          <Select name="hostelId" defaultValue={defaultHostelId ?? ""}>
            <option value="">Not hostel-related</option>
            {hostels.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </Select>
        </Field>

        <Field label="Location" error={errors.location?.[0]}>
          <Input
            name="location"
            icon="location_on"
            placeholder="e.g. Hostel 8, Room 204 or CCC Lab 2"
            maxLength={200}
          />
        </Field>
      </div>

      <Field label="Description" required error={errors.description?.[0]}>
        <Textarea
          name="description"
          required
          rows={4}
          maxLength={5000}
          placeholder="Provide detailed information about the issue…"
        />
      </Field>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-label-sm text-on-surface-variant font-mono tracking-wider uppercase">
          Priority
        </legend>
        <div className="mt-1 flex flex-wrap gap-2">
          <RadioChip name="priority" value="low" tone="secondary">Low</RadioChip>
          <RadioChip name="priority" value="medium" tone="primary" defaultChecked>Medium</RadioChip>
          <RadioChip name="priority" value="high" tone="error">High</RadioChip>
        </div>
      </fieldset>

      <AttachmentPicker />

      <Switch
        name="isAnonymous"
        label="Submit Anonymously"
        description="Hide identity from resolving staff"
      />

      {state.status === "error" && (
        <p role="alert" className="text-body-md text-error">
          {state.message}
        </p>
      )}

      <div className="border-outline-variant/20 mt-4 border-t pt-4">
        <Button type="submit" variant="cta" trailingIcon="send" isLoading={isPending}>
          Submit Complaint
        </Button>
      </div>
    </form>
  );
}
