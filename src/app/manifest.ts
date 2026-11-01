import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "f!nd",
    short_name: "f!nd",
    description: "The marketplace for your university community.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#f6f7f4",
    theme_color: "#0f6b4f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
