"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { ActionState } from "@/lib/actions/auth";
import { addComment } from "@/lib/actions/complaints";
import { ROLE_META, type UserRole } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { formatRelative, toIsoOrUndefined } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export type CommentItem = {
  id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
  author_id: string;
  author: { id: string; name: string | null; avatar_url: string | null; role: UserRole } | null;
};

const initialState: ActionState = { status: "idle" };

/**
 * Comment thread with live updates.
 *
 * The Realtime payload carries only the comment row — not the joined author —
 * so an insert from someone else triggers `router.refresh()` and lets the
 * Server Component re-fetch with the join. That keeps one source of truth for
 * the shape and, critically, means RLS decides what arrives rather than the
 * client trusting a broadcast.
 */
export function CommentThread({
  complaintId,
  complaintCode,
  comments,
  currentUserId,
  canPostInternal,
}: {
  complaintId: string;
  complaintCode: string;
  comments: CommentItem[];
  currentUserId: string;
  canPostInternal: boolean;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(addComment, initialState);
  const [body, setBody] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`comments:${complaintId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "complaint_comments",
          filter: `complaint_id=eq.${complaintId}`,
        },
        (payload) => {
          // Our own insert already updated the page via revalidatePath.
          const authorId = (payload.new as { author_id?: string }).author_id;
          if (authorId === currentUserId) return;
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [complaintId, currentUserId, router]);

  useEffect(() => {
    if (state.status === "success") {
      setBody("");
      formRef.current?.reset();
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    if (state.status === "error") toast.error(state.message);
  }, [state]);

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-title-md text-on-surface flex items-center gap-2 font-semibold">
        <Icon name="forum" className="text-outline" />
        Comments
        {comments.length > 0 && (
          <span className="text-label-sm text-outline font-mono">({comments.length})</span>
        )}
      </h3>

      {comments.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">
          No comments yet. Ask a question or add anything that might help.
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {comments.map((c) => {
            const isMine = c.author_id === currentUserId;
            return (
              <li
                key={c.id}
                className={cn(
                  "flex gap-3",
                  c.is_internal &&
                    "bg-tertiary/5 border-tertiary/20 -mx-2 rounded-lg border px-2 py-2",
                )}
              >
                <Avatar src={c.author?.avatar_url} name={c.author?.name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-title-md text-on-surface font-medium">
                      {isMine ? "You" : (c.author?.name ?? "Unknown")}
                    </span>
                    {c.author && c.author.role !== "student" && (
                      <Badge tone="primary" icon={ROLE_META[c.author.role].icon}>
                        {ROLE_META[c.author.role].label}
                      </Badge>
                    )}
                    {c.is_internal && (
                      <Badge tone="tertiary" icon="visibility_off">Internal</Badge>
                    )}
                    <time
                      dateTime={toIsoOrUndefined(c.created_at)}
                      className="text-label-sm text-outline font-mono"
                    >
                      {formatRelative(c.created_at)}
                    </time>
                  </div>
                  <p className="text-body-md text-on-surface-variant break-words whitespace-pre-wrap">
                    {c.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <div ref={endRef} />

      <form ref={formRef} action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="complaintId" value={complaintId} />
        <input type="hidden" name="complaintCode" value={complaintCode} />

        <label htmlFor="comment-body" className="sr-only">Add a comment</label>
        <textarea
          id="comment-body"
          name="body"
          rows={3}
          maxLength={2000}
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          className="bg-surface-container-lowest border-outline-variant text-body-md text-on-surface placeholder:text-outline/70 focus:ring-primary w-full resize-none rounded-lg border px-4 py-3 transition-all outline-none focus:border-transparent focus:ring-2"
        />

        <div className="flex items-center justify-between gap-3">
          {canPostInternal ? (
            <label className="text-body-md text-on-surface-variant flex cursor-pointer items-center gap-2">
              <input type="checkbox" name="isInternal" className="accent-primary size-4" />
              Internal note (hidden from the student)
            </label>
          ) : (
            <span />
          )}
          <Button
            type="submit"
            size="sm"
            trailingIcon="send"
            isLoading={isPending}
            disabled={!body.trim()}
          >
            Post
          </Button>
        </div>
      </form>
    </div>
  );
}
