"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = "find:install-dismissed";

/** Add to Home Screen. Chrome and Android get the real install prompt; iPhone gets the two-step instruction. */
export function InstallPrompt({ variant = "banner", className = "" }: { variant?: "banner" | "row"; className?: string }) {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [dismissed, setDismissed] = useState(true);
  const [how, setHow] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    try { setDismissed(Date.now() < Number(localStorage.getItem(KEY) || 0)); } catch { setDismissed(false); }
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as InstallEvent); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt); window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (installed || (!evt && !ios) || (variant === "banner" && dismissed)) return null;
  const dismiss = () => { try { localStorage.setItem(KEY, String(Date.now() + 7 * 864e5)); } catch { /* private mode */ } setDismissed(true); };
  const install = async () => { if (!evt) { setHow(true); return; } await evt.prompt(); const r = await evt.userChoice; if (r.outcome === "accepted") setInstalled(true); setEvt(null); };

  return (
    <section aria-label="Install f!nd" className={`flex items-center gap-4 rounded-[var(--radius-lg)] bg-sunken p-4 ${className}`}>
      { }
      <img src="/icons/icon-192.png" alt="" width={48} height={48} className="size-12 shrink-0 rounded-[12px]" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">Add f!nd to your home screen</p>
        <p className="t-meta text-[0.8125rem] leading-snug">{how || (!evt && ios) ? "Tap the Share button, then Add to Home Screen." : "Opens full screen and loads faster."}</p>
      </div>
      {evt && <button type="button" onClick={install} className="btn btn-primary btn-sm shrink-0">Install</button>}
      {variant === "banner" && <button type="button" onClick={dismiss} aria-label="Dismiss" className="grid size-9 shrink-0 place-items-center rounded-full text-muted"><Icon name="plus" size={20} className="rotate-45" /></button>}
    </section>
  );
}
