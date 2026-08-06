"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";

/**
 * Modal built on the native <dialog> element, so focus trapping, Escape and
 * inertness of the background come from the platform rather than a hand-rolled
 * (and usually subtly broken) implementation.
 *
 * DESIGN.md Level 2: 24px radius, 0.5px border, 0px 12px 32px shadow.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  // The Escape key and the backdrop both close natively; mirror that into React.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const handleClose = () => onClose();
    node.addEventListener("close", handleClose);
    return () => node.removeEventListener("close", handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onClick={(event) => {
        // Clicks land on the dialog itself only when they hit the backdrop.
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "bg-surface-container-lowest text-on-surface m-auto w-[calc(100%-2rem)] max-w-lg",
        "rounded-modal border-outline-variant/40 shadow-level2 border p-0",
        "backdrop:bg-inverse-surface/40 backdrop:backdrop-blur-sm",
        "open:animate-in",
        className,
      )}
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="dialog-title" className="text-title-md font-semibold">
              {title}
            </h2>
            {description && (
              <p className="text-body-md text-on-surface-variant">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-on-surface-variant hover:bg-surface-container-high -mt-1 -mr-1 rounded-full p-2 transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {children}

        {footer && <div className="flex justify-end gap-2 pt-2">{footer}</div>}
      </div>
    </dialog>
  );
}
