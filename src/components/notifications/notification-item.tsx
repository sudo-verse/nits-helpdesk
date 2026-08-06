import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import {
  NOTIFICATION_META,
  TONE_CLASSES,
  type NotificationType,
} from "@/lib/constants";
import { formatRelative, toIsoOrUndefined } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * A row in the notifications feed.
 *
 * Unread rows carry a 1px accent stripe down the left edge; read rows drop to
 * 75% opacity — both taken from notifications_profile. Announcements get the
 * error-tinted treatment the design uses for the "System Maintenance" alert.
 */
export function NotificationItem({
  type,
  title,
  body,
  createdAt,
  isRead,
  complaintCode,
  className,
}: {
  type: NotificationType;
  title: string;
  body?: string | null;
  createdAt: string;
  isRead: boolean;
  complaintCode?: string | null;
  className?: string;
}) {
  const meta = NOTIFICATION_META[type];
  const tone = TONE_CLASSES[meta.tone];
  const isAlert = type === "announcement";

  const content = (
    <>
      {!isRead && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-0 left-0 w-1",
            isAlert ? "bg-error" : "bg-primary",
          )}
        />
      )}

      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          isRead ? "bg-surface-container-highest text-outline" : tone.soft,
        )}
      >
        <Icon name={meta.icon} size={24} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="mb-1 flex items-start justify-between gap-4">
          <span
            className={cn(
              "text-title-md truncate",
              isRead ? "text-on-surface" : "text-on-surface font-semibold",
            )}
          >
            {title}
          </span>
          <time
            dateTime={toIsoOrUndefined(createdAt)}
            className={cn(
              "text-label-sm shrink-0 font-mono",
              isRead ? "text-outline" : tone.text,
            )}
          >
            {formatRelative(createdAt)}
          </time>
        </span>
        {body && (
          <span
            className={cn(
              "text-body-md line-clamp-2 block",
              isRead ? "text-outline" : "text-on-surface-variant",
            )}
          >
            {body}
          </span>
        )}
      </span>
    </>
  );

  const classes = cn(
    "relative flex gap-4 overflow-hidden rounded-xl border p-4 transition-colors",
    isRead
      ? "bg-surface-container-lowest border-outline-variant/20 opacity-75 hover:opacity-100"
      : isAlert
        ? "bg-error-container/10 border-error/20 shadow-level1 hover:bg-error-container/20"
        : "bg-surface-container-lowest border-outline-variant/30 shadow-level1 hover:bg-surface-container-low",
    className,
  );

  if (complaintCode) {
    return (
      <Link href={`/complaints/${complaintCode}`} className={classes}>
        {content}
      </Link>
    );
  }

  return <div className={classes}>{content}</div>;
}
