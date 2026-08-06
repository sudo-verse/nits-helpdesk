import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/icons";
import { cn } from "@/lib/utils/cn";

/**
 * Variants follow DESIGN.md "Components > Buttons":
 *   Primary   — solid NIT Blue, white text, 8px radius, darkens on hover
 *   Secondary — light blue tint background with Secondary Blue text
 *   Tertiary  — text only, underline on hover
 *
 * `active:scale-95 duration-100` is the press feedback used on every button in
 * the Stitch screens.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-title-md font-medium transition-colors",
    "active:scale-95 duration-100",
    "disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary hover:bg-primary/90 shadow-sm",
        secondary:
          "bg-secondary/10 text-secondary hover:bg-secondary/20 border border-secondary/20",
        tertiary: "text-primary hover:underline underline-offset-4",
        outline:
          "border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-high",
        ghost: "text-on-surface-variant hover:bg-surface-container-high/50",
        destructive:
          "bg-error/10 text-error hover:bg-error/20 border border-error/20",
        // The full-width form submit in report_complaint.
        cta: "bg-primary text-on-primary hover:bg-on-primary-fixed-variant shadow-primary rounded-xl w-full py-4 active:scale-[0.98]",
      },
      size: {
        sm: "h-9 px-4 rounded-lg text-body-md",
        md: "h-11 px-6 rounded-lg",
        lg: "h-12 px-6 rounded-lg",
        icon: "size-10 rounded-full p-0",
      },
      loading: {
        true: "pointer-events-none",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type BaseProps = VariantProps<typeof buttonVariants> & {
  icon?: IconName;
  iconFilled?: boolean;
  /** Places the icon after the label — used by the "Submit Complaint" CTA. */
  trailingIcon?: IconName;
  isLoading?: boolean;
  children?: ReactNode;
  className?: string;
};

export type ButtonProps = BaseProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof BaseProps>;

function Content({
  icon,
  iconFilled,
  trailingIcon,
  isLoading,
  children,
}: Pick<BaseProps, "icon" | "iconFilled" | "trailingIcon" | "isLoading" | "children">) {
  return (
    <>
      {isLoading ? (
        <span
          className="size-5 shrink-0 animate-spin rounded-full border-2 border-current/25 border-t-current"
          role="status"
          aria-label="Loading"
        />
      ) : (
        icon && <Icon name={icon} filled={iconFilled} size={20} />
      )}
      {children}
      {trailingIcon && !isLoading && <Icon name={trailingIcon} size={20} />}
    </>
  );
}

export function Button({
  variant,
  size,
  icon,
  iconFilled,
  trailingIcon,
  isLoading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, loading: isLoading }), className)}
      disabled={disabled ?? isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      <Content {...{ icon, iconFilled, trailingIcon, isLoading, children }} />
    </button>
  );
}

export type ButtonLinkProps = BaseProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, keyof BaseProps>;

/** Same visual treatment for navigation, without nesting <a> inside <button>. */
export function ButtonLink({
  variant,
  size,
  icon,
  iconFilled,
  trailingIcon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(buttonVariants({ variant, size }), className)} {...props}>
      <Content {...{ icon, iconFilled, trailingIcon, children }} />
    </Link>
  );
}

export { buttonVariants };
