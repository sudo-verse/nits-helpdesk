import Image from "next/image";

import { cn } from "@/lib/utils/cn";

/** "Rahul Sharma" → "RS". Matches the "RK" chip in complaint_details. */
export function initialsFrom(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

/**
 * The Stitch screens point every avatar at a googleusercontent placeholder.
 * Here the source is a Supabase Storage URL, falling back to tonal initials —
 * which is also what an anonymous reporter renders as.
 */
export function Avatar({
  src,
  name,
  size = 40,
  className,
  priority = false,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  const initials = initialsFrom(name);

  return (
    <span
      className={cn(
        "border-outline-variant/30 relative inline-flex shrink-0 items-center justify-center",
        "bg-primary-container text-on-primary-container overflow-hidden rounded-full border",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={name ? `${name}'s profile photo` : "Profile photo"}
          width={size}
          height={size}
          priority={priority}
          className="size-full object-cover"
        />
      ) : (
        <span
          className="font-mono leading-none font-medium select-none"
          style={{ fontSize: Math.max(10, Math.round(size * 0.36)) }}
          aria-hidden="true"
        >
          {initials}
        </span>
      )}
      {!src && <span className="sr-only">{name ?? "Unknown user"}</span>}
    </span>
  );
}
