"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import type { ActionState } from "@/lib/actions/auth";
import { setDepartmentActive, upsertDepartment } from "@/lib/actions/admin";
import { TONE_CLASSES, type StatusTone } from "@/lib/constants";
import { ICON_NAMES, type IconName } from "@/lib/icons";
import { cn } from "@/lib/utils/cn";

const initialState: ActionState = { status: "idle" };

type Department = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color_token: string;
  is_active: boolean;
};

const TONES: StatusTone[] = ["primary", "secondary", "tertiary", "error", "success"];

export function DepartmentManager({ departments }: { departments: Department[] }) {
  const [editing, setEditing] = useState<Department | null>(null);
  const [creating, setCreating] = useState(false);
  const [state, formAction, isPending] = useActionState(upsertDepartment, initialState);
  const [isToggling, startToggle] = useTransition();

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Saved.");
      setEditing(null);
      setCreating(false);
    }
    if (state.status === "error") toast.error(state.message);
  }, [state]);

  const open = creating || editing !== null;
  const current = editing;

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button icon="add" onClick={() => setCreating(true)}>
          New department
        </Button>
      </div>

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departments.map((d) => {
          const tone = (TONES.includes(d.color_token as StatusTone)
            ? d.color_token
            : "primary") as StatusTone;

          return (
            <li key={d.id}>
              <Card
                surface="lowest"
                radius="xl"
                className={cn("flex h-full flex-col gap-3 p-4", !d.is_active && "opacity-60")}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full",
                      TONE_CLASSES[tone].soft,
                    )}
                  >
                    <Icon name={d.icon as IconName} />
                  </span>
                  {!d.is_active && <Badge tone="neutral">Disabled</Badge>}
                </div>

                <div className="flex-1">
                  <h3 className="text-title-md text-on-surface font-semibold">{d.name}</h3>
                  <p className="text-label-sm text-outline font-mono">{d.slug}</p>
                  {d.description && (
                    <p className="text-body-md text-on-surface-variant mt-2 line-clamp-2">
                      {d.description}
                    </p>
                  )}
                </div>

                <div className="border-outline-variant/20 flex gap-2 border-t pt-3">
                  <Button size="sm" variant="secondary" icon="edit" onClick={() => setEditing(d)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant={d.is_active ? "ghost" : "secondary"}
                    isLoading={isToggling}
                    onClick={() =>
                      startToggle(async () => {
                        const result = await setDepartmentActive(d.id, !d.is_active);
                        if (result.status === "error") toast.error(result.message);
                        else toast.success(d.is_active ? "Disabled." : "Enabled.");
                      })
                    }
                  >
                    {d.is_active ? "Disable" : "Enable"}
                  </Button>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={open}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        title={current ? `Edit ${current.name}` : "New department"}
        description="Students choose from these when filing a complaint."
      >
        <form action={formAction} className="flex flex-col gap-4">
          {current && <input type="hidden" name="id" value={current.id} />}

          <Field label="Name" required>
            <Input name="name" defaultValue={current?.name ?? ""} required maxLength={60} />
          </Field>

          <Field label="Description">
            <Textarea
              name="description"
              rows={2}
              maxLength={300}
              defaultValue={current?.description ?? ""}
            />
          </Field>

          <Field label="Icon" hint="A Material Symbol name from the bundled subset.">
            <Select name="icon" defaultValue={current?.icon ?? "category"} required>
              {ICON_NAMES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
          </Field>

          <Field label="Colour">
            <Select name="colorToken" defaultValue={current?.color_token ?? "primary"}>
              {TONES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </Field>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(null);
                setCreating(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>Save</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
