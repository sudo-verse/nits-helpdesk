import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/providers";
import { env } from "@/lib/env";
import { fontVariables } from "@/lib/fonts";

import "./globals.css";

const description =
  "Report, track and resolve campus issues at NIT Silchar — hostel, electrical, water, network, academic and more.";

export const metadata: Metadata = {
  // Without this, Next resolves og:image/canonical URLs against whatever
  // host happened to serve the request — fine in dev, wrong the moment
  // there's a preview deployment or a proxy in front of production.
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "NITS HelpDesk",
    template: "%s · NITS HelpDesk",
  },
  description,
  applicationName: "NITS HelpDesk",
  authors: [{ name: "NIT Silchar" }],
  formatDetection: { telephone: false },
  // favicon.ico is already picked up automatically via Next's special-file
  // convention; this only adds what that doesn't cover. og:image/twitter:image
  // are likewise automatic from opengraph-image.tsx.
  icons: {
    apple: "/apple-touch-icon.png",
  },
  // Deliberately no openGraph.description here — leaving it unset lets each
  // page's own `description` cascade into og:description as normal. Setting
  // one at the root would pin every shared link to this generic text instead.
  openGraph: {
    siteName: "NITS HelpDesk",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The design is mobile-first with a fixed bottom nav; let it reach the edges.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9fe" },
    { media: "(prefers-color-scheme: dark)", color: "#101315" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning is required by next-themes: it stamps the
    // resolved theme class onto <html> before React hydrates.
    <html lang="en" className={`${fontVariables} h-full`} suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
