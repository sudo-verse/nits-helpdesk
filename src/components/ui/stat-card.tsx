import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { TONE_CLASSES, type StatusTone } from "@/lib/constants";
import type { IconName } from "@/lib/icons";
import { cn } from "@/lib/utils/cn";

/**
 * The bento stat tile from home_dashboard: fixed 120px height, label and icon
 * on top, oversized figure at the bottom in the tone colour.
 */
export function StatCard({
  label,
  value,
  icon,
  tone = "primary",
  href,
  className,
}: {
  label: string;
  value: number | string;
  icon: IconName;
  tone?: StatusTone;
  /** Renders the tile as a filter link — the design makes these clickable. */
  href?: string;
  className?: string;
}) {
  const t = TONE_CLASSES[tone];

  const body = (
    <>
      <div className="text-on-surface-variant flex items-center justify-between gap-2">
        <span className="text-title-md truncate">{label}</span>
        <Icon name={icon} size={20} className={t.text} />
      </div>
      <div className={cn("text-headline-lg font-bold", t.text)}>{value}</div>
    </>
  );

  const classes = cn(
    "bg-surface border-outline-variant/30 shadow-level1 rounded-card border",
    "flex h-[120px] flex-col justify-between p-4",
    href && "hover:shadow-level2 transition-shadow active:scale-[0.98]",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {body}
      </Link>
    );
  }

  return <div className={classes}>{body}</div>;
}
