import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "NITS HelpDesk";

/**
 * Generated at request time (cached by Next.js after the first hit) rather
 * than a static file, so it stays in sync with the logo/brand colour without
 * needing a separate export step whenever either changes.
 */
export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public/logo.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#00355f",
          fontFamily: "sans-serif",
        }}
      >
        <img
          src={logoSrc}
          alt=""
          width={140}
          height={140}
          style={{ borderRadius: 28, marginBottom: 36 }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: -1,
          }}
        >
          NITS HelpDesk
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: "#a0c9ff",
            marginTop: 20,
            textAlign: "center",
            maxWidth: 880,
          }}
        >
          Report, track and resolve campus issues at NIT Silchar
        </div>
      </div>
    ),
    { ...size },
  );
}
