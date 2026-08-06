"use client";

import Image from "next/image";
import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { formatBytes } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export type Attachment = {
  id: string;
  public_url: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
};

/**
 * The "Attached Evidence" rail from complaint_details, with a lightbox.
 *
 * PDFs get a card that opens in a new tab rather than a broken <img>.
 */
export function AttachmentGallery({
  attachments,
  title = "Attached Evidence",
  emptyLabel,
}: {
  attachments: Attachment[];
  title?: string;
  emptyLabel?: string;
}) {
  const [lightbox, setLightbox] = useState<Attachment | null>(null);

  if (!attachments.length) {
    return emptyLabel ? (
      <p className="text-body-md text-on-surface-variant">{emptyLabel}</p>
    ) : null;
  }

  return (
    <>
      <h3 className="text-title-md text-on-surface mb-4 flex items-center gap-2 font-semibold">
        <Icon name="photo_library" className="text-outline" />
        {title}
      </h3>

      <ul className="hide-scrollbar flex snap-x gap-4 overflow-x-auto pb-2">
        {attachments.map((a) => {
          const isImage = a.mime_type.startsWith("image/");

          return (
            <li key={a.id} className="shrink-0 snap-center">
              {isImage ? (
                <button
                  type="button"
                  onClick={() => setLightbox(a)}
                  className="border-outline-variant/20 group relative block h-40 w-64 overflow-hidden rounded-lg border"
                >
                  <Image
                    src={a.public_url}
                    alt={a.file_name}
                    fill
                    sizes="256px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                    <Icon name="zoom_in" className="text-white" />
                  </span>
                </button>
              ) : (
                <a
                  href={a.public_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "border-outline-variant/20 bg-surface-container-low hover:bg-surface-container",
                    "flex h-40 w-64 flex-col items-center justify-center gap-2 rounded-lg border p-4 transition-colors",
                  )}
                >
                  <Icon name="picture_as_pdf" size={32} className="text-error" />
                  <span className="text-body-md text-on-surface line-clamp-2 text-center">
                    {a.file_name}
                  </span>
                  <span className="text-label-sm text-outline font-mono">
                    {formatBytes(a.size_bytes)}
                  </span>
                </a>
              )}
            </li>
          );
        })}
      </ul>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.file_name}
          onClick={() => setLightbox(null)}
          className="bg-inverse-surface/80 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="bg-surface-container text-on-surface absolute top-4 right-4 flex size-10 items-center justify-center rounded-full"
          >
            <Icon name="close" />
          </button>
          <div className="relative max-h-[85vh] w-full max-w-4xl">
            <Image
              src={lightbox.public_url}
              alt={lightbox.file_name}
              width={1600}
              height={1200}
              className="max-h-[85vh] w-full rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
