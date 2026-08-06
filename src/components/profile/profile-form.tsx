"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import type { ActionState } from "@/lib/actions/auth";
import { updateProfile } from "@/lib/actions/profile";

const initialState: ActionState = { status: "idle" };

type Option = { id: string; name: string };

export function ProfileForm({
  profile,
  email,
  departments,
  hostels,
}: {
  profile: {
    name: string | null;
    roll_number: string | null;
    department_id: string | null;
    hostel_id: string | null;
    phone: string | null;
  };
  email: string;
  departments: Option[];
  hostels: Option[];
}) {
  const [state, formAction, isPending] = useActionState(updateProfile, initialState);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  useEffect(() => {
    if (state.status === "success") toast.success(state.message ?? "Saved.");
  }, [state]);

  return (
    <Card as="form" action={formAction} surface="lowest" radius="xl" className="flex flex-col gap-4 p-6">
      <CardTitle>
        <Icon name="badge" className="text-outline" />
        Edit profile
      </CardTitle>

      <Field label="Institute email" hint="Your email is your identity and cannot be changed.">
        <Input value={email} readOnly disabled className="font-mono" />
      </Field>

      <Field label="Full name" required error={errors.name?.[0]}>
        <Input name="name" defaultValue={profile.name ?? ""} required autoComplete="name" />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Roll number" error={errors.rollNumber?.[0]}>
          <Input
            name="rollNumber"
            defaultValue={profile.roll_number ?? ""}
            className="font-mono"
            placeholder="21-12-045"
          />
        </Field>

        <Field label="Phone" error={errors.phone?.[0]}>
          <Input
            name="phone"
            type="tel"
            inputMode="numeric"
            defaultValue={profile.phone ?? ""}
            placeholder="9876543210"
          />
        </Field>

        <Field label="Department" error={errors.departmentId?.[0]}>
          <Select name="departmentId" defaultValue={profile.department_id ?? ""}>
            <option value="">Not set</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </Field>

        <Field label="Hostel" error={errors.hostelId?.[0]}>
          <Select name="hostelId" defaultValue={profile.hostel_id ?? ""}>
            <option value="">Not set</option>
            {hostels.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Button type="submit" isLoading={isPending} icon="save" className="self-start">
        Save changes
      </Button>
    </Card>
  );
}
