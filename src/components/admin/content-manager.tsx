"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { ActionState } from "@/lib/actions/auth";
import {
  deleteAnnouncement,
  deleteFaq,
  upsertAnnouncement,
  upsertFaq,
} from "@/lib/actions/admin";
import { formatRelative } from "@/lib/utils/format";

const initialState: ActionState = { status: "idle" };

export type Announcement = {
  id: string;
  title: string;
  body: string;
  department_id: string | null;
  is_pinned: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
};

export type Faq = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  display_order: number;
  is_published: boolean;
};

/** Shared checkbox styling for the publish/pin toggles. */
function Check({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="text-body-md text-on-surface-variant flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="accent-primary size-4"
      />
      {label}
    </label>
  );
}

export function AnnouncementManager({
  announcements,
  departments,
}: {
  announcements: Announcement[];
  departments: Array<{ id: string; name: string }>;
}) {
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [creating, setCreating] = useState(false);
  const [state, formAction, isPending] = useActionState(upsertAnnouncement, initialState);
  const [isDeleting, startDelete] = useTransition();

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Saved.");
      setEditing(null);
      setCreating(false);
    }
    if (state.status === "error") toast.error(state.message);
  }, [state]);

  const current = editing;

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button icon="add" onClick={() => setCreating(true)}>New announcement</Button>
      </div>

      {announcements.length === 0 ? (
        <EmptyState
          icon="campaign"
          title="No announcements"
          description="Publish one to notify everyone it applies to."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {announcements.map((a) => (
            <li key={a.id}>
              <Card surface="lowest" radius="xl" className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="text-title-md text-on-surface font-semibold">{a.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {a.is_pinned && <Badge tone="error" icon="flag">Pinned</Badge>}
                    <Badge tone={a.is_published ? "success" : "neutral"}>
                      {a.is_published ? "Published" : "Draft"}
                    </Badge>
                    <span className="text-label-sm text-outline font-mono">
                      {formatRelative(a.published_at ?? a.created_at)}
                    </span>
                  </div>
                </div>

                <p className="text-body-md text-on-surface-variant line-clamp-2">{a.body}</p>

                <div className="border-outline-variant/20 flex gap-2 border-t pt-3">
                  <Button size="sm" variant="secondary" icon="edit" onClick={() => setEditing(a)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    icon="delete"
                    isLoading={isDeleting}
                    onClick={() =>
                      startDelete(async () => {
                        const result = await deleteAnnouncement(a.id);
                        if (result.status === "error") toast.error(result.message);
                        else toast.success("Deleted.");
                      })
                    }
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={creating || editing !== null}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        title={current ? "Edit announcement" : "New announcement"}
        description="Publishing notifies every user it targets — this cannot be undone."
      >
        <form action={formAction} className="flex flex-col gap-4">
          {current && <input type="hidden" name="id" value={current.id} />}

          <Field label="Title" required>
            <Input name="title" defaultValue={current?.title ?? ""} required maxLength={200} />
          </Field>

          <Field label="Body" required>
            <Textarea name="body" rows={5} required maxLength={5000} defaultValue={current?.body ?? ""} />
          </Field>

          <Field label="Audience" hint="Leave blank to notify the whole institute.">
            <Select name="departmentId" defaultValue={current?.department_id ?? ""}>
              <option value="">Everyone</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </Field>

          <div className="flex flex-wrap gap-4">
            <Check name="isPinned" label="Pin to top" defaultChecked={current?.is_pinned} />
            <Check name="isPublished" label="Publish now" defaultChecked={current?.is_published} />
          </div>

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

export function FaqManager({ faqs }: { faqs: Faq[] }) {
  const [editing, setEditing] = useState<Faq | null>(null);
  const [creating, setCreating] = useState(false);
  const [state, formAction, isPending] = useActionState(upsertFaq, initialState);
  const [isDeleting, startDelete] = useTransition();

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Saved.");
      setEditing(null);
      setCreating(false);
    }
    if (state.status === "error") toast.error(state.message);
  }, [state]);

  const current = editing;

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button icon="add" onClick={() => setCreating(true)}>New entry</Button>
      </div>

      {faqs.length === 0 ? (
        <EmptyState icon="question_answer" title="No FAQ entries" />
      ) : (
        <ul className="flex flex-col gap-3">
          {faqs.map((f) => (
            <li key={f.id}>
              <Card surface="lowest" radius="xl" className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="text-title-md text-on-surface font-semibold">{f.question}</h3>
                  <div className="flex gap-2">
                    {f.category && <Badge tone="neutral">{f.category}</Badge>}
                    <Badge tone={f.is_published ? "success" : "neutral"}>
                      {f.is_published ? "Published" : "Hidden"}
                    </Badge>
                    <Badge tone="primary">#{f.display_order}</Badge>
                  </div>
                </div>

                <p className="text-body-md text-on-surface-variant line-clamp-2">{f.answer}</p>

                <div className="border-outline-variant/20 flex gap-2 border-t pt-3">
                  <Button size="sm" variant="secondary" icon="edit" onClick={() => setEditing(f)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    icon="delete"
                    isLoading={isDeleting}
                    onClick={() =>
                      startDelete(async () => {
                        const result = await deleteFaq(f.id);
                        if (result.status === "error") toast.error(result.message);
                        else toast.success("Deleted.");
                      })
                    }
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={creating || editing !== null}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        title={current ? "Edit entry" : "New FAQ entry"}
      >
        <form action={formAction} className="flex flex-col gap-4">
          {current && <input type="hidden" name="id" value={current.id} />}

          <Field label="Question" required>
            <Input name="question" defaultValue={current?.question ?? ""} required maxLength={300} />
          </Field>

          <Field label="Answer" required>
            <Textarea name="answer" rows={5} required maxLength={5000} defaultValue={current?.answer ?? ""} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <Input name="category" defaultValue={current?.category ?? ""} maxLength={60} />
            </Field>
            <Field label="Order">
              <Input
                name="displayOrder"
                type="number"
                min={0}
                max={999}
                defaultValue={current?.display_order ?? 0}
              />
            </Field>
          </div>

          <Check name="isPublished" label="Published" defaultChecked={current?.is_published ?? true} />

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
