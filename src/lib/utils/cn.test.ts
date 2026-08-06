import { strictEqual } from "node:assert";
import { test } from "node:test";
import { cn } from "./cn.ts";

/**
 * These guard the tailwind-merge theme extension in cn.ts. If a custom scale
 * is added to globals.css without registering it there, the matching case
 * here starts failing instead of the bug surfacing as a mystery style
 * override three components deep.
 */
const cases: Array<[input: string, expected: string]> = [
  // stock numeric spacing — we deliberately do NOT define named spacing
  // tokens, because `--spacing-md` shadows `--container-md` and silently
  // breaks `max-w-md`. See the spacing note in globals.css.
  ["p-4 p-6", "p-6"],
  ["px-6 px-4", "px-4"],
  ["gap-2 gap-4", "gap-4"],
  ["mt-1 mt-6", "mt-6"],

  // custom type scale vs. text colour — these must NOT collapse together
  ["text-body-md text-title-md", "text-title-md"],
  ["text-[10px] text-label-sm", "text-label-sm"],
  ["text-title-md text-primary", "text-title-md text-primary"],
  ["text-on-surface-variant text-title-md", "text-on-surface-variant text-title-md"],
  ["text-primary text-error", "text-error"],

  // elevation + radius tokens
  ["shadow-level1 shadow-level2", "shadow-level2"],
  ["rounded-lg rounded-card", "rounded-card"],
  ["rounded-card rounded-modal", "rounded-modal"],

  // stock scales still behave
  ["bg-surface bg-primary", "bg-primary"],
  ["h-16 h-12", "h-12"],
];

for (const [input, expected] of cases) {
  test(`cn: "${input}" → "${expected}"`, () => {
    strictEqual(cn(input), expected);
  });
}

test("cn: falsy values are dropped", () => {
  strictEqual(cn("p-md", false, undefined, null, "gap-sm"), "p-md gap-sm");
});

test("cn: conditional object syntax works", () => {
  strictEqual(cn("p-md", { "bg-primary": true, "bg-error": false }), "p-md bg-primary");
});
