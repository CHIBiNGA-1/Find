"use client";
import { useEffect } from "react";

/**
 * Registers the service worker on the client.
 * Rendered once inside the root layout — has no visible output.
 * SW scope is "/" so it controls all routes.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          // Non-fatal — PWA features degrade gracefully.
          console.warn("[SW] Registration failed:", err);
        });
    }
  }, []);

  return null;
}
