import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ACT",
    short_name: "ACT",
    description: "ACT",
    start_url: "/",
    display: "standalone",
    // Matches the icon artwork background.
    background_color: "#1c1c1c",
    theme_color: "#1c1c1c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
