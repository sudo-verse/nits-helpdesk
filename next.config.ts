import type { NextConfig } from "next";

/**
 * Supabase Storage serves attachments and avatars from the project host, which
 * next/image refuses to optimise unless it is explicitly allowlisted.
 *
 * Derived from NEXT_PUBLIC_SUPABASE_URL rather than hardcoded, so local
 * (127.0.0.1:54321) and hosted (<ref>.supabase.co) both work without an edit.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePattern = supabaseUrl ? new URL(supabaseUrl) : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(supabasePattern
        ? [
            {
              protocol: supabasePattern.protocol.replace(":", "") as "http" | "https",
              hostname: supabasePattern.hostname,
              port: supabasePattern.port || undefined,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  eslint: {
    // `next build` runs ESLint over the whole project by default, which
    // duplicates the dedicated `npm run lint` step in CI.
    ignoreDuringBuilds: false,
  },

  experimental: {
    // Server Actions receive multipart form data with attachments; the default
    // 1 MB cap would reject a single photo.
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },

  // `x-powered-by` advertises the framework and version for no benefit.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Clickjacking: nothing here is meant to be framed.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          // Stops a browser second-guessing a declared Content-Type — relevant
          // because users upload files that are served back from Storage.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Complaint codes must not leak to third parties via Referer.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
