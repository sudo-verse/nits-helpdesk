import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ElementType } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * The Level-1 surface used across every screen:
 *   rounded-[16px] + 1px outline-variant/30 border + 0px 4px 12px shadow.
 *
 * `interactive` adds the Level-2 hover lift and press feedback from the
 * complaint cards in complaint_history.
 */
const cardVariants = cva(
  "border-outline-variant/30 border transition-all duration-300",
  {
    variants: {
      surface: {
        base: "bg-surface",
        lowest: "bg-surface-container-lowest",
        low: "bg-surface-container-low",
        container: "bg-surface-container",
        bright: "bg-surface-bright",
      },
      elevation: {
        flat: "",
        level1: "shadow-level1",
        level2: "shadow-level2",
      },
      radius: {
        lg: "rounded-lg",
        xl: "rounded-xl",
        card: "rounded-card",
        modal: "rounded-modal",
      },
      interactive: {
        true: "hover:shadow-level2 cursor-pointer active:scale-[0.98]",
      },
    },
    defaultVariants: { surface: "base", elevation: "level1", radius: "card" },
  },
);

type CardProps<T extends ElementType> = {
  as?: T;
} & VariantProps<typeof cardVariants> &
  Omit<ComponentPropsWithoutRef<T>, "as" | keyof VariantProps<typeof cardVariants>>;

export function Card<T extends ElementType = "div">({
  as,
  surface,
  elevation,
  radius,
  interactive,
  className,
  ...props
}: CardProps<T>) {
  const Component = (as ?? "div") as ElementType;
  return (
    <Component
      className={cn(
        cardVariants({ surface, elevation, radius, interactive }),
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "border-surface-variant flex flex-wrap items-center justify-between gap-4 border-b pb-4",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<"h3">) {
  return (
    <h3
      className={cn(
        "text-title-md text-on-surface flex items-center gap-2 font-semibold",
        className,
      )}
      {...props}
    />
  );
}

export { cardVariants };
