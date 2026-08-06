import type { Metadata } from "next";

import { ThemeToggle } from "@/components/theme-toggle";
import { Icon } from "@/components/ui/icon";
import { ICON_NAMES } from "@/lib/icons";

export const metadata: Metadata = {
  title: "Style guide",
  robots: { index: false, follow: false },
};

/** Every M3 colour role, grouped the way DESIGN.md presents them. */
const COLOR_GROUPS: Array<{ label: string; pairs: Array<[bg: string, fg: string]> }> = [
  {
    label: "Primary",
    pairs: [
      ["bg-primary", "text-on-primary"],
      ["bg-primary-container", "text-on-primary-container"],
      ["bg-primary-fixed", "text-on-primary-fixed"],
      ["bg-primary-fixed-dim", "text-on-primary-fixed-variant"],
    ],
  },
  {
    label: "Secondary",
    pairs: [
      ["bg-secondary", "text-on-secondary"],
      ["bg-secondary-container", "text-on-secondary-container"],
      ["bg-secondary-fixed", "text-on-secondary-fixed"],
      ["bg-secondary-fixed-dim", "text-on-secondary-fixed-variant"],
    ],
  },
  {
    label: "Tertiary",
    pairs: [
      ["bg-tertiary", "text-on-tertiary"],
      ["bg-tertiary-container", "text-on-tertiary-container"],
      ["bg-tertiary-fixed", "text-on-tertiary-fixed"],
      ["bg-tertiary-fixed-dim", "text-on-tertiary-fixed-variant"],
    ],
  },
  {
    label: "Error / Success",
    pairs: [
      ["bg-error", "text-on-error"],
      ["bg-error-container", "text-on-error-container"],
      ["bg-success", "text-on-success"],
      ["bg-success-container", "text-on-success-container"],
    ],
  },
  {
    label: "Surfaces",
    pairs: [
      ["bg-surface-container-lowest", "text-on-surface"],
      ["bg-surface-container-low", "text-on-surface"],
      ["bg-surface-container", "text-on-surface"],
      ["bg-surface-container-high", "text-on-surface"],
      ["bg-surface-container-highest", "text-on-surface"],
      ["bg-surface-variant", "text-on-surface-variant"],
      ["bg-inverse-surface", "text-inverse-on-surface"],
      ["bg-surface-dim", "text-on-surface"],
    ],
  },
];

const TYPE_SCALE = [
  ["display-lg", "text-display-lg", "Welcome Back"],
  ["headline-lg", "text-headline-lg", "Complaints History"],
  ["headline-lg-mobile", "text-headline-lg-mobile", "Hello, Devashish"],
  ["title-md", "text-title-md", "Hostel 9 WiFi Router Down"],
  ["body-md", "text-body-md", "Here is an overview of your active tickets."],
  ["label-sm", "text-label-sm font-mono", "CMP-2023-8942"],
] as const;

/**
 * The Stitch 4px grid, written out as the Tailwind classes it maps onto.
 * Interpolated class names (`w-${token}`) would never be emitted — Tailwind
 * scans source statically.
 */
const SPACING: Array<[stitch: string, px: string, tw: string, widthClass: string]> = [
  ["base / xs", "4px", "1", "w-1"],
  ["sm", "8px", "2", "w-2"],
  ["md", "16px", "4", "w-4"],
  ["gutter", "20px", "5", "w-5"],
  ["lg / margin", "24px", "6", "w-6"],
  ["xl", "48px", "12", "w-12"],
];

const RADII = ["rounded-sm", "rounded-lg", "rounded-xl", "rounded-card", "rounded-modal"] as const;
const SHADOWS = ["shadow-level1", "shadow-level1-hover", "shadow-level2", "shadow-primary"] as const;

/**
 * Regression guard. Naming a spacing token `md` shadows Tailwind's
 * `--container-md` and silently collapses `max-w-md` to 16px — which would
 * destroy the login card. If any bar below renders hairline-thin, that
 * collision is back.
 */
const CONTAINERS: Array<[cls: string, expected: string]> = [
  ["max-w-xs", "20rem"],
  ["max-w-sm", "24rem"],
  ["max-w-md", "28rem"],
  ["max-w-lg", "32rem"],
  ["max-w-xl", "36rem"],
  ["max-w-2xl", "42rem"],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-title-md border-outline-variant/30 border-b pb-1 font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <main className="mx-auto flex max-w-content flex-col gap-12 px-6 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-headline-lg text-primary font-bold">Style guide</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Tokens extracted from the Stitch package. Toggle the theme to check
            the derived dark palette.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Section title="Colour roles">
        <div className="flex flex-col gap-6">
          {COLOR_GROUPS.map(({ label, pairs }) => (
            <div key={label} className="flex flex-col gap-2">
              <h3 className="text-label-sm text-on-surface-variant font-mono uppercase">
                {label}
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {pairs.map(([bg, fg]) => (
                  <div
                    key={bg}
                    className={`${bg} ${fg} border-outline-variant/30 flex h-20 flex-col justify-end rounded-lg border p-2`}
                  >
                    <span className="text-label-sm font-mono break-all">
                      {bg.replace("bg-", "")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type scale">
        <div className="flex flex-col gap-4">
          {TYPE_SCALE.map(([name, cls, sample]) => (
            <div key={name} className="flex flex-col gap-1">
              <span className="text-label-sm text-outline font-mono">{name}</span>
              <span className={cls}>{sample}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Spacing — Stitch 4px grid → Tailwind numeric scale">
        <div className="flex flex-col gap-2">
          {SPACING.map(([stitch, px, tw, widthClass]) => (
            <div key={stitch} className="flex items-center gap-4">
              <span className="text-label-sm text-outline w-28 shrink-0 font-mono">
                {stitch}
              </span>
              <span className="text-label-sm text-on-surface-variant w-12 shrink-0 font-mono">
                {px}
              </span>
              <div className={`bg-primary h-4 rounded-sm ${widthClass}`} />
              <span className="text-label-sm text-outline font-mono">
                p-{tw} / gap-{tw}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Container scale (regression guard)">
        <p className="text-body-md text-on-surface-variant">
          These must show a clean progression. A hairline bar means a custom
          <code className="font-mono"> --spacing-*</code> token has shadowed
          <code className="font-mono"> --container-*</code> again.
        </p>
        <div className="flex flex-col gap-2">
          {CONTAINERS.map(([cls, expected]) => (
            <div key={cls} className="flex items-center gap-4">
              <span className="text-label-sm text-outline w-24 shrink-0 font-mono">
                {cls}
              </span>
              <div className={`bg-secondary h-4 w-full rounded-sm ${cls}`} />
              <span className="text-label-sm text-outline shrink-0 font-mono">
                {expected}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radii">
        <div className="flex flex-wrap gap-4">
          {RADII.map((r) => (
            <div key={r} className="flex flex-col items-center gap-1">
              <div
                className={`bg-surface-container-high border-outline-variant/30 size-20 border ${r}`}
              />
              <span className="text-label-sm text-outline font-mono">{r}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Elevation">
        <div className="flex flex-wrap gap-6">
          {SHADOWS.map((s) => (
            <div key={s} className="flex flex-col items-center gap-1">
              <div
                className={`bg-surface border-outline-variant/30 size-24 rounded-card border ${s}`}
              />
              <span className="text-label-sm text-outline font-mono">{s}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Icons — ${ICON_NAMES.length} subsetted glyphs`}>
        <p className="text-body-md text-on-surface-variant">
          Self-hosted Material Symbols. Each tile shows the outlined and filled
          axis. A blank box means the name is missing from the subset — rerun
          <code className="font-mono"> npm run fonts:icons</code>.
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {ICON_NAMES.map((name) => (
            <div
              key={name}
              className="bg-surface-container-low border-outline-variant/30 flex flex-col items-center gap-1 rounded-lg border p-2"
              title={name}
            >
              <div className="text-on-surface-variant flex items-center gap-1">
                <Icon name={name} size={20} />
                <Icon name={name} size={20} filled className="text-primary" />
              </div>
              <span className="text-outline w-full truncate text-center font-mono text-[10px]">
                {name}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
