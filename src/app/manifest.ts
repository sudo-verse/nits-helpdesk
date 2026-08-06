import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NITS HelpDesk",
    short_name: "HelpDesk",
    description:
      "Report, track and resolve campus issues at NIT Silchar — hostel, electrical, water, network, academic and more.",
    // Signed-in users land here regardless of role — middleware/session logic
    // then routes them to their actual home page.
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f9f9fe",
    theme_color: "#f9f9fe",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
