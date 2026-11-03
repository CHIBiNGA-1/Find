"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { tap } from "@/lib/haptics";

const THRESHOLD = 70;

/** Pull down at the top of any screen to refresh its data. Touch screens only. */
export function PullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const y0 = useRef<number | null>(null);
  const val = useRef(0);

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const start = (e: TouchEvent) => { y0.current = window.scrollY <= 0 && !document.querySelector("dialog[open]") ? (e.touches[0]?.clientY ?? null) : null; };
    const move = (e: TouchEvent) => {
      if (y0.current === null) return;
      const d = (e.touches[0]?.clientY ?? y0.current) - y0.current;
      if (d > 0 && window.scrollY <= 0) { val.current = Math.min(d * 0.5, 96); setPull(val.current); }
      else { y0.current = null; val.current = 0; setPull(0); }
    };
    const end = () => {
      if (y0.current === null) return;
      const go = val.current >= THRESHOLD;
      y0.current = null; val.current = 0; setPull(0);
      if (go) { tap(12); setBusy(true); router.refresh(); setTimeout(() => setBusy(false), 900); }
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", end); window.addEventListener("touchcancel", end);
    return () => { window.removeEventListener("touchstart", start); window.removeEventListener("touchmove", move); window.removeEventListener("touchend", end); window.removeEventListener("touchcancel", end); };
  }, [router]);

  const show = pull > 8 || busy;
  return (
    <div aria-hidden={!show} className="pointer-events-none fixed inset-x-0 z-30 flex justify-center transition-opacity md:hidden" style={{ top: "calc(env(safe-area-inset-top) + 3.5rem)", opacity: show ? 1 : 0 }}>
      <span role={busy ? "status" : undefined} aria-label={busy ? "Refreshing" : undefined} className="grid size-10 place-items-center rounded-full bg-ink text-white shadow-[0_4px_16px_rgb(14_18_64/0.3)]"
        style={{ transform: `translateY(${busy ? 12 : pull * 0.5}px)` }}>
        <Icon name="arrow" size={18} className={busy ? "spin" : ""} />
      </span>
    </div>
  );
}
