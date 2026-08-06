import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge has no knowledge of our custom theme scales. Without this,
 * `cn("p-md", "p-lg")` would keep *both* classes and last-one-wins would
 * silently stop working for every component that accepts a className override.
 *
 * Covered by src/lib/utils/cn.test.ts — run `npm test`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // Custom type scale — must be declared or `text-title-md` is mistaken
      // for a text *colour* and never conflicts with `text-body-md`.
      "font-size": [
        {
          text: [
            "display-lg",
            "headline-lg",
            "headline-lg-mobile",
            "title-md",
            "body-md",
            "label-sm",
          ],
        },
      ],
      shadow: [
        { shadow: ["level1", "level1-hover", "level2", "nav", "primary"] },
      ],
      rounded: [{ rounded: ["card", "modal"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
