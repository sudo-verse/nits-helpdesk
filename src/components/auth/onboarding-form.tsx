"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { completeOnboarding, type ActionState } from "@/lib/actions/auth";

const initialState: ActionState = { status: "idle" };

type Option = { id: string; name: string };

export function OnboardingForm({
  defaultName,
  email,
  departments,
  hostels,
}: {
  defaultName: string;
  email: string;
  departments: Option[];
  hostels: Option[];
}) {
  const [state, formAction, isPending] = useActionState(
    completeOnboarding,
    initialState,
  );
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <Card as="form" action={formAction} className="flex flex-col gap-6 p-6">
      <Field label="Institute email">
        {/* Read-only: the profiles guard trigger rejects any email change. */}
        <Input value={email} readOnly disabled className="font-mono" />
      </Field>

      <Field label="Full name" required error={errors.name?.[0]}>
        <Input
          name="name"
          defaultValue={defaultName}
          required
          autoComplete="name"
          placeholder="Rahul Sharma"
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Roll number" error={errors.rollNumber?.[0]}>
          <Input name="rollNumber" placeholder="21-12-045" className="font-mono" />
        </Field>

        <Field label="Phone" error={errors.phone?.[0]}>
          <Input
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="9876543210"
          />
        </Field>

        <Field label="Department" error={errors.departmentId?.[0]}>
          <Select name="departmentId" defaultValue="">
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Hostel" error={errors.hostelId?.[0]}>
          <Select name="hostelId" defaultValue="">
            <option value="">Select hostel</option>
            {hostels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {state.status === "error" && !Object.keys(errors).length && (
        <p role="alert" className="text-body-md text-error">
          {state.message}
        </p>
      )}

      <Button type="submit" isLoading={isPending} trailingIcon="arrow_forward">
        Continue to dashboard
      </Button>
    </Card>
  );
}
