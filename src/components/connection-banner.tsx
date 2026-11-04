"use client";
import { useEffect, useState } from "react";

/** Says so when the connection drops, and when it comes back. */
export function ConnectionBanner() {
  const [state, setState] = useState<"online" | "offline" | "back">("online");
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const off = () => setState("offline");
    const on = () => { setState("back"); t = setTimeout(() => setState("online"), 2200); };
    if (!navigator.onLine) off();
    window.addEventListener("offline", off); window.addEventListener("online", on);
    return () => { clearTimeout(t); window.removeEventListener("offline", off); window.removeEventListener("online", on); };
  }, []);
  if (state === "online") return null;
  return (
    <p role="status" className={`fixed inset-x-0 z-[var(--z-banner)] px-4 py-2 text-center text-sm font-bold md:left-[var(--rail-w)] md:!top-0 ${state === "offline" ? "bg-ink text-hl" : "bg-success text-white"}`}
      style={{ top: "calc(env(safe-area-inset-top) + 3.5rem)" }}>
      {state === "offline" ? "You\u2019re offline. Pages you open may not load, and messages won\u2019t send until you reconnect." : "Back online"}
    </p>
  );
}
