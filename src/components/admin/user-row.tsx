"use client";

import { useActionState, useEffect, useTransition } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import type { ActionState } from "@/lib/actions/auth";
import { setUserActive, updateUserRole } from "@/lib/actions/admin";
import { ROLE_META, type UserRole } from "@/lib/constants";

const initialState: ActionState = { status: "idle" };

export function UserRow({
  user,
  departments,
  canChangeRole,
  isSelf,
}: {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: UserRole;
    is_active: boolean;
    department_id: string | null;
    roll_number: string | null;
  };
  departments: Array<{ id: string; name: string }>;
  canChangeRole: boolean;
  isSelf: boolean;
}) {
  const [state, formAction, isPending] = useActionState(updateUserRole, initialState);
  const [isToggling, startToggle] = useTransition();

  const departmentName =
    departments.find((d) => d.id === user.department_id)?.name ?? null;

  useEffect(() => {
    if (state.status === "success") toast.success(state.message ?? "Updated.");
    if (state.status === "error") toast.error(state.message);
  }, [state]);

  return (
    <Card
      surface="lowest"
      radius="xl"
      className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={user.name} size={40} />
        <div className="min-w-0">
          <p className="text-title-md text-on-surface truncate">
            {user.name ?? "Unnamed"}
            {isSelf && <span className="text-outline"> (you)</span>}
          </p>
          <p className="text-body-md text-on-surface-variant truncate font-mono text-[13px]">
            {user.email}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {user.roll_number && <Badge tone="neutral">{user.roll_number}</Badge>}
        {!user.is_active && <Badge tone="error" icon="block">Disabled</Badge>}

        {canChangeRole && !isSelf ? (
          <form action={formAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="userId" value={user.id} />

            <label htmlFor={`role-${user.id}`} className="sr-only">
              Role for {user.name ?? user.email}
            </label>
            <Field className="contents">
              <Select
                id={`role-${user.id}`}
                name="role"
                defaultValue={user.role}
                className="w-36 py-2"
              >
                {(Object.keys(ROLE_META) as UserRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_META[r].label}</option>
                ))}
              </Select>
            </Field>

            {/* A staff member's department decides which queue they can
                service, so it is set alongside the role rather than left to
                the user's own profile. */}
            <label htmlFor={`dept-${user.id}`} className="sr-only">
              Department for {user.name ?? user.email}
            </label>
            <Field className="contents">
              <Select
                id={`dept-${user.id}`}
                name="departmentId"
                defaultValue={user.department_id ?? ""}
                className="w-44 py-2"
              >
                <option value="">No department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </Field>

            <Button type="submit" size="sm" variant="secondary" isLoading={isPending}>
              Save
            </Button>
          </form>
        ) : (
          <>
            <Badge tone="primary" icon={ROLE_META[user.role].icon}>
              {ROLE_META[user.role].label}
            </Badge>
            {departmentName && <Badge tone="neutral" icon="domain">{departmentName}</Badge>}
          </>
        )}

        {!isSelf && (
          <Button
            size="sm"
            variant={user.is_active ? "destructive" : "secondary"}
            isLoading={isToggling}
            icon={user.is_active ? "block" : "check_circle"}
            onClick={() =>
              startToggle(async () => {
                const result = await setUserActive(user.id, !user.is_active);
                if (result.status === "error") toast.error(result.message);
                else if (result.status === "success") {
                  toast.success(result.message ?? "Updated.");
                }
              })
            }
          >
            {user.is_active ? "Disable" : "Enable"}
          </Button>
        )}
      </div>
    </Card>
  );
}
