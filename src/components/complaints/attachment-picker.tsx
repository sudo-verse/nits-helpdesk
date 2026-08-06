"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Icon } from "@/components/ui/icon";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { formatBytes } from "@/lib/utils/format";
import { validateFile } from "@/lib/validations/complaint";
import { cn } from "@/lib/utils/cn";

const MAX_FILES = 5;

type Picked = { file: File; previewUrl: string | null; id: string };

/**
 * The "Attachments" grid from report_complaint: a dashed add-tile followed by
 * square previews.
 *
 * Files are held in a DataTransfer-backed <input type="file"> so they submit
 * naturally with the enclosing form — no client-side upload round trip, and it
 * still works if JavaScript fails after hydration.
 */
export function AttachmentPicker({ name = "attachments" }: { name?: string }) {
  const [picked, setPicked] = useState<Picked[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Object URLs are a memory leak if not revoked.
  useEffect(() => {
    return () => {
      for (const p of picked) {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncInput(next: Picked[]) {
    if (!inputRef.current) return;
    const transfer = new DataTransfer();
    for (const p of next) transfer.items.add(p.file);
    inputRef.current.files = transfer.files;
  }

  function handleAdd(fileList: FileList | null) {
    if (!fileList?.length) return;

    const incoming = Array.from(fileList);
    const accepted: Picked[] = [];

    for (const file of incoming) {
      if (picked.length + accepted.length >= MAX_FILES) {
        toast.error(`You can attach up to ${MAX_FILES} files.`);
        break;
      }
      const problem = validateFile(file);
      if (problem) {
        toast.error(`${file.name}: ${problem}`);
        continue;
      }
      accepted.push({
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        id: crypto.randomUUID(),
      });
    }

    if (!accepted.length) return;
    const next = [...picked, ...accepted];
    setPicked(next);
    syncInput(next);
  }

  function handleRemove(id: string) {
    const target = picked.find((p) => p.id === id);
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    const next = picked.filter((p) => p.id !== id);
    setPicked(next);
    syncInput(next);
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-label-sm text-on-surface-variant font-mono tracking-wider uppercase">
        Attachments
      </span>

      <input
        ref={inputRef}
        type="file"
        name={name}
        multiple
        accept="image/jpeg,image/png,application/pdf"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          // Merge rather than replace, so picking twice keeps both batches.
          const incoming = e.target.files;
          if (incoming && incoming.length !== picked.length) handleAdd(incoming);
        }}
      />

      <div className="mt-1 grid grid-cols-2 gap-4 md:grid-cols-4">
        {picked.length < MAX_FILES && (
          <button
            type="button"
            onClick={() => {
              // A temporary picker keeps the form-bound input's FileList intact.
              const picker = document.createElement("input");
              picker.type = "file";
              picker.multiple = true;
              picker.accept = "image/jpeg,image/png,application/pdf";
              picker.onchange = () => handleAdd(picker.files);
              picker.click();
            }}
            className={cn(
              "border-outline-variant/60 bg-surface-container-lowest group aspect-square rounded-xl border-2 border-dashed",
              "hover:bg-surface-container-low hover:border-primary/50 hover:text-primary text-on-surface-variant",
              "flex flex-col items-center justify-center transition-all",
            )}
          >
            <Icon
              name="add_photo_alternate"
              size={32}
              className="mb-2 transition-transform group-hover:scale-110"
            />
            <span className="text-label-sm font-mono">Add file</span>
          </button>
        )}

        {picked.map((p) => (
          <div
            key={p.id}
            className="bg-surface-container border-outline-variant/30 group relative aspect-square overflow-hidden rounded-xl border"
          >
            {p.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.previewUrl}
                alt={p.file.name}
                className="size-full object-cover"
              />
            ) : (
              <div className="text-on-surface-variant flex size-full flex-col items-center justify-center gap-1 p-2">
                <Icon name="picture_as_pdf" size={32} />
                <span className="line-clamp-2 text-center font-mono text-[10px]">
                  {p.file.name}
                </span>
              </div>
            )}

            <span className="bg-inverse-surface/70 text-inverse-on-surface absolute bottom-0 w-full px-2 py-1 text-center font-mono text-[10px]">
              {formatBytes(p.file.size)}
            </span>

            <button
              type="button"
              onClick={() => handleRemove(p.id)}
              aria-label={`Remove ${p.file.name}`}
              className="bg-inverse-surface/70 text-inverse-on-surface absolute top-2 right-2 flex size-6 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>

      <p className="text-body-md text-on-surface-variant">
        JPG, PNG or PDF · up to {formatBytes(MAX_UPLOAD_BYTES)} each · max {MAX_FILES} files
      </p>
    </div>
  );
}
