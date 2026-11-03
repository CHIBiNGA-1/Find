import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "f!nd",
    short_name: "f!nd",
    description: "Buy, sell and find things on campus.",
    lang: "en",
    dir: "ltr",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#2a3cff",   // the launch splash: cobalt, then the app
    theme_color: "#2a3cff",
    categories: ["shopping", "education", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Sell something", short_name: "Sell", url: "/sell?source=shortcut", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Messages", short_name: "Messages", url: "/messages?source=shortcut", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Explore listings", short_name: "Explore", url: "/explore?source=shortcut", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
