import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/providers";
import { fontVariables } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NITS HelpDesk",
    template: "%s · NITS HelpDesk",
  },
  description:
    "Report, track and resolve campus issues at NIT Silchar — hostel, electrical, water, network, academic and more.",
  applicationName: "NITS HelpDesk",
  authors: [{ name: "NIT Silchar" }],
  formatDetection: { telephone: false },
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
