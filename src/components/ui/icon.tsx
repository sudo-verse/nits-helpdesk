import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils/cn";
import type { IconName } from "@/lib/icons";

export type IconProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  /** Material Symbol ligature name, e.g. `chevron_right`. */
  name: IconName;
  /** Renders the filled variant — the design uses this for active nav items. */
  filled?: boolean;
  /** Glyph size in px. Matches the `opsz` axis so strokes stay optically even. */
  size?: number;
  /** `wght` axis. 400 is the design default; 300 reads lighter at large sizes. */
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
};

/**
 * Material Symbols Outlined, self-hosted and subsetted (see src/lib/fonts.ts).
 *
 * The Stitch markup writes `<span class="material-symbols-outlined">name</span>`
 * with an inline `font-variation-settings` for the filled state. This wraps
 * that so the axes stay type-checked and the icon name is constrained to the
 * set actually present in the subsetted font — a typo becomes a build error
 * rather than a blank box in production.
 */
export function Icon({
  name,
  filled = false,
  size = 24,
  weight = 400,
  className,
  style,
  ...props
}: IconProps) {
  return (
    <span
      aria-hidden="true"
      translate="no"
      className={cn("material-symbols-outlined shrink-0", className)}
      style={{
        fontSize: size,
        // opsz must track the rendered size or small glyphs look too heavy.
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
        ...style,
      }}
      {...props}
    >
      {name}
    </span>
  );
}
