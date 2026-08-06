import { Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";

/**
 * Inter — the interface + long-form typeface for the whole system.
 * DESIGN.md asks for the variable `opsz` axis to stay active; the variable
 * font is served by default and `font-optical-sizing: auto` is set in
 * globals.css.
 */
export const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/**
 * JetBrains Mono — small labels, ticket IDs and metadata only (`label-sm`).
 * Only weight 500 is used by the design.
 */
export const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});

/**
 * Material Symbols Outlined, self-hosted and subsetted.
 *
 * The Stitch HTML loaded this from fonts.googleapis.com. A CDN dependency in
 * the critical render path is not acceptable in production, so the face is
 * vendored into src/assets/fonts. It is subsetted to the icon names listed in
 * scripts/icon-names.txt — run `npm run fonts:icons` after adding one, or the
 * new glyph will render as a blank box.
 *
 * `display: "block"` (not "swap") is deliberate: ligature-based icon fonts
 * flash their raw text ("chevron_right") during a swap period.
 */
export const materialSymbols = localFont({
  src: "../assets/fonts/material-symbols-outlined.woff2",
  variable: "--font-material-symbols",
  display: "block",
  weight: "100 700",
  style: "normal",
});

export const fontVariables = [
  inter.variable,
  jetbrainsMono.variable,
  materialSymbols.variable,
].join(" ");
